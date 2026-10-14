import { createClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

function assertNoError(result) {
  if (result.error) throw result.error;
  return result.data;
}

async function fetchAll(query) {
  const results = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = assertNoError(await query.range(offset, offset + PAGE_SIZE - 1));
    results.push(...page);
    if (page.length < PAGE_SIZE) return results;
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    category: row.category,
    price: row.price_cents,
    cost: row.cost_cents,
    stock: row.stock,
    lowStock: row.low_stock,
    active: row.active
  };
}

function mapCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    createdAt: row.created_at
  };
}

export function createCloudStore(url, anonKey) {
  const client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  });

  async function listMemberships(userId) {
    const data = assertNoError(await client
      .from("store_members")
      .select("store_id, role")
      .eq("user_id", userId));
    if (data.length > 1) {
      throw new Error("Esta conta pertence a mais de uma loja. A seleção de múltiplas lojas ainda não está disponível.");
    }
    return data[0] ?? null;
  }

  async function loadStore(storeId, membership, user) {
    const store = assertNoError(await client
      .from("stores")
      .select("id, name")
      .eq("id", storeId)
      .single());

    const productsQuery = client.from("products").select("*").eq("store_id", storeId).order("created_at");
    const customersQuery = client.from("customers").select("*").eq("store_id", storeId).order("created_at");
    const salesQuery = client.from("sales").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    const itemsQuery = client.from("sale_items").select("*").eq("store_id", storeId);
    const movementsQuery = client.from("stock_movements").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    const [products, customers, sales, items, movements] = await Promise.all([
      fetchAll(productsQuery),
      fetchAll(customersQuery),
      fetchAll(salesQuery),
      fetchAll(itemsQuery),
      fetchAll(movementsQuery)
    ]);
    const itemsBySale = new Map();
    for (const item of items) {
      const saleItems = itemsBySale.get(item.sale_id) ?? [];
      saleItems.push({
        productId: item.product_id,
        name: item.product_name,
        price: item.unit_price_cents,
        cost: item.unit_cost_cents,
        quantity: item.quantity
      });
      itemsBySale.set(item.sale_id, saleItems);
    }
    const mappedSales = sales.map(sale => ({
      id: `VD-${sale.sale_number}`,
      databaseId: sale.id,
      date: sale.created_at,
      customerId: sale.customer_id ?? "",
      payment: sale.payment_method,
      status: sale.status,
      items: itemsBySale.get(sale.id) ?? [],
      total: Number(sale.total_cents),
      cancelReason: sale.cancel_reason ?? ""
    }));

    return {
      version: 1,
      cloud: true,
      storeId: store.id,
      storeName: store.name,
      role: membership.role,
      user: { id: user.id, email: user.email ?? "" },
      products: products.map(mapProduct),
      customers: customers.map(mapCustomer),
      sales: mappedSales,
      movements: movements.map(movement => ({
        id: movement.id,
        productId: movement.product_id,
        date: movement.created_at,
        delta: movement.quantity_delta,
        kind: movement.kind,
        reason: movement.reason,
        saleId: movement.sale_id
      })),
      nextSale: sales.reduce((highest, sale) => Math.max(highest, Number(sale.sale_number)), 0) + 1
    };
  }

  async function loadForUser(user) {
    const membership = await listMemberships(user.id);
    if (!membership) return { needsStore: true };
    return {
      needsStore: false,
      state: await loadStore(membership.store_id, membership, user)
    };
  }

  async function createStore(name, user) {
    const storeId = assertNoError(await client.rpc("bootstrap_store", { store_name: name }));
    const membership = await listMemberships(user.id);
    if (!membership || membership.store_id !== storeId) throw new Error("A loja foi criada, mas não foi possível confirmar o acesso da conta.");
    return loadStore(storeId, membership, user);
  }

  async function saveChanges(previous, next) {
    const storeId = previous.storeId;
    if (next.storeId !== storeId) throw new Error("A sessão da loja expirou. Entre novamente.");

    if (previous.storeName !== next.storeName) {
      assertNoError(await client.from("stores").update({ name: next.storeName }).eq("id", storeId));
    }

    const previousCustomers = new Map(previous.customers.map(customer => [customer.id, customer]));
    for (const customer of next.customers) {
      const old = previousCustomers.get(customer.id);
      if (!old) {
        assertNoError(await client.from("customers").insert({
          id: customer.id,
          store_id: storeId,
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          created_at: customer.createdAt
        }));
      } else if (old.name !== customer.name || old.phone !== customer.phone || old.email !== customer.email) {
        assertNoError(await client.from("customers").update({
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null
        }).eq("id", customer.id).eq("store_id", storeId));
      }
    }

    const previousProducts = new Map(previous.products.map(product => [product.id, product]));
    const createdProductIds = new Set();
    for (const product of next.products) {
      const old = previousProducts.get(product.id);
      if (!old) {
        assertNoError(await client.rpc("create_product", {
          target_store_id: storeId,
          product_name: product.name,
          product_sku: product.sku || null,
          product_category: product.category || "Outros",
          product_price_cents: product.price,
          product_cost_cents: product.cost,
          initial_stock: product.stock,
          product_low_stock: product.lowStock
        }));
        createdProductIds.add(product.id);
      } else {
        const changed =
          old.name !== product.name ||
          old.sku !== product.sku ||
          old.category !== product.category ||
          old.price !== product.price ||
          old.cost !== product.cost ||
          old.lowStock !== product.lowStock ||
          old.active !== product.active;
        if (changed) {
          assertNoError(await client.from("products").update({
            name: product.name,
            sku: product.sku || null,
            category: product.category || "Outros",
            price_cents: product.price,
            cost_cents: product.cost,
            low_stock: product.lowStock,
            active: product.active
          }).eq("id", product.id).eq("store_id", storeId));
        }
      }
    }

    const previousSales = new Map(previous.sales.map(sale => [sale.id, sale]));
    for (const sale of next.sales) {
      const old = previousSales.get(sale.id);
      if (!old) {
        const createdSale = assertNoError(await client.rpc("complete_sale", {
          target_store_id: storeId,
          target_customer_id: sale.customerId || null,
          payment: sale.payment,
          requested_items: sale.items.map(item => ({
            product_id: item.productId,
            quantity: item.quantity
          }))
        }));
        sale.databaseId = createdSale.id;
        sale.id = `VD-${createdSale.sale_number}`;
      } else if (old.status === "completed" && sale.status === "cancelled") {
        assertNoError(await client.rpc("cancel_sale", {
          target_store_id: storeId,
          target_sale_id: old.databaseId,
          reason: sale.cancelReason
        }));
      }
    }

    const previousMovements = new Set(previous.movements.map(movement => movement.id));
    for (const movement of next.movements) {
      if (previousMovements.has(movement.id) || createdProductIds.has(movement.productId) || !["entry", "correction"].includes(movement.kind)) continue;
      const product = next.products.find(item => item.id === movement.productId);
      if (!product) throw new Error("O produto associado ao ajuste de estoque não foi encontrado.");
      assertNoError(await client.rpc("adjust_stock", {
        target_store_id: storeId,
        target_product_id: product.id,
        new_stock: product.stock,
        movement_reason: movement.reason
      }));
    }
  }

  return { client, loadForUser, createStore, loadStore, saveChanges };
}
