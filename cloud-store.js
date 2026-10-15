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

function mapProduct(row, client) {
  return {
    id: row.id,
    importSourceKey: row.import_source_key ?? "",
    imagePath: row.image_path ?? "",
    imageUrl: row.image_path
      ? client.storage.from("product-images").getPublicUrl(row.image_path).data.publicUrl
      : "",
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
      .select("id, name, card_debit_fee_percent, card_credit_fee_percent")
      .eq("id", storeId)
      .single());

    const productsQuery = client.from("products").select("*").eq("store_id", storeId).order("created_at");
    const categoriesQuery = client.from("product_categories").select("name").eq("store_id", storeId).order("created_at");
    const customersQuery = client.from("customers").select("*").eq("store_id", storeId).order("created_at");
    const salesQuery = client.from("sales").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    const itemsQuery = client.from("sale_items").select("*").eq("store_id", storeId);
    const movementsQuery = client.from("stock_movements").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    const [products, categories, customers, sales, items, movements] = await Promise.all([
      fetchAll(productsQuery),
      fetchAll(categoriesQuery),
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
      customerName: sale.import_customer_name ?? "",
      payment: sale.payment_method,
      status: sale.status,
      items: itemsBySale.get(sale.id) ?? [],
      total: Number(sale.total_cents),
      cancelReason: sale.cancel_reason ?? "",
      importSourceKey: sale.import_source_key ?? "",
      importSource: sale.import_source ?? "",
      importReference: sale.import_reference ?? "",
      importDetails: sale.import_details ?? "",
      importItemCount: sale.import_item_count ?? null,
      importProfitCents: sale.import_profit_cents === null || sale.import_profit_cents === undefined
        ? null
        : Number(sale.import_profit_cents)
    }));

    return {
      version: 1,
      cloud: true,
      storeId: store.id,
      storeName: store.name,
      cardDebitFeePercent: Number(store.card_debit_fee_percent),
      cardCreditFeePercent: Number(store.card_credit_fee_percent),
      role: membership.role,
      user: {
        id: user.id,
        email: user.email ?? "",
        name: [user.user_metadata?.full_name, user.user_metadata?.name, user.user_metadata?.display_name]
          .find(value => typeof value === "string" && value.trim())?.trim() ?? ""
      },
      categories: categories.map(category => category.name),
      products: products.map(product => mapProduct(product, client)),
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

  async function importKyteProducts(storeId, records) {
    return assertNoError(await client.rpc("import_kyte_products", {
      target_store_id: storeId,
      import_records: records.map(product => ({
        source_key: product.sourceKey,
        name: product.name,
        sku: product.sku || null,
        category: product.category,
        price_cents: product.priceCents,
        cost_cents: product.costCents,
        stock: product.stock,
        low_stock: product.lowStock
      }))
    }));
  }

  async function importKyteSales(storeId, records) {
    return assertNoError(await client.rpc("import_kyte_sales", {
      target_store_id: storeId,
      import_records: records.map(sale => ({
        source_key: sale.sourceKey,
        reference: sale.reference,
        status: sale.status,
        created_at: sale.date,
        total_cents: sale.totalCents,
        payment: sale.payment,
        customer_name: sale.customerName,
        details: sale.details,
        item_count: sale.itemCount,
        profit_cents: sale.profitCents
      }))
    }));
  }

  async function saveChanges(previous, next, productImageChanges = new Map()) {
    const storeId = previous.storeId;
    if (next.storeId !== storeId) throw new Error("A sessão da loja expirou. Entre novamente.");

    const storeChanges = {};
    if (previous.storeName !== next.storeName) storeChanges.name = next.storeName;
    if (previous.cardDebitFeePercent !== next.cardDebitFeePercent) {
      storeChanges.card_debit_fee_percent = next.cardDebitFeePercent;
    }
    if (previous.cardCreditFeePercent !== next.cardCreditFeePercent) {
      storeChanges.card_credit_fee_percent = next.cardCreditFeePercent;
    }
    if (Object.keys(storeChanges).length) {
      assertNoError(await client.from("stores").update(storeChanges).eq("id", storeId));
    }

    const previousCategories = new Set(previous.categories);
    for (const category of next.categories) {
      if (previousCategories.has(category)) continue;
      assertNoError(await client.from("product_categories").insert({ store_id: storeId, name: category }));
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
    const productIdChanges = new Map();
    const oldProductsByPersistedId = new Map();
    const imageChangesByPersistedId = new Map();
    for (const product of next.products) {
      const originalId = product.id;
      const old = previousProducts.get(originalId);
      const imageChange = productImageChanges.get(originalId);
      if (!old) {
        product.id = assertNoError(await client.rpc("create_product", {
          target_store_id: storeId,
          product_name: product.name,
          product_sku: product.sku || null,
          product_category: product.category || "Outros",
          product_price_cents: product.price,
          product_cost_cents: product.cost,
          initial_stock: product.stock,
          product_low_stock: product.lowStock
        }));
        productIdChanges.set(originalId, product.id);
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
      oldProductsByPersistedId.set(product.id, old ?? null);
      if (imageChange) imageChangesByPersistedId.set(product.id, imageChange);
    }

    for (const movement of next.movements) {
      if (productIdChanges.has(movement.productId)) movement.productId = productIdChanges.get(movement.productId);
    }
    for (const sale of next.sales) {
      for (const item of sale.items) {
        if (productIdChanges.has(item.productId)) item.productId = productIdChanges.get(item.productId);
      }
    }

    for (const product of next.products) {
      const imageChange = imageChangesByPersistedId.get(product.id);
      if (!imageChange) continue;
      const previousImagePath = oldProductsByPersistedId.get(product.id)?.imagePath ?? "";
      if (imageChange.file) {
        const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[imageChange.file.type];
        if (!extension || imageChange.file.size > 5 * 1024 * 1024) {
          throw new Error("Produto salvo, mas a foto não é válida ou excede 5 MB.");
        }
        const imagePath = `${storeId}/${product.id}.${extension}`;
        const upload = await client.storage.from("product-images").upload(imagePath, imageChange.file, {
          cacheControl: "3600",
          contentType: imageChange.file.type,
          upsert: true
        });
        if (upload.error) throw new Error(`Produto salvo, mas não foi possível enviar a foto: ${upload.error.message}`);
        assertNoError(await client.from("products").update({ image_path: imagePath }).eq("id", product.id).eq("store_id", storeId));
        product.imagePath = imagePath;
        product.imageUrl = client.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl;
        if (previousImagePath && previousImagePath !== imagePath) {
          const removal = await client.storage.from("product-images").remove([previousImagePath]);
          if (removal.error) throw new Error(`A foto nova foi salva, mas a anterior não pôde ser removida: ${removal.error.message}`);
        }
      } else if (imageChange.remove) {
        if (previousImagePath) {
          assertNoError(await client.from("products").update({ image_path: null }).eq("id", product.id).eq("store_id", storeId));
          const removal = await client.storage.from("product-images").remove([previousImagePath]);
          if (removal.error) throw new Error(`A foto foi desvinculada do produto, mas não pôde ser apagada do armazenamento: ${removal.error.message}`);
        }
        product.imagePath = "";
        product.imageUrl = "";
      }
    }

    const nextCategories = new Set(next.categories);
    for (const category of previous.categories) {
      if (nextCategories.has(category)) continue;
      assertNoError(await client.from("product_categories").delete().eq("store_id", storeId).eq("name", category));
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

  return { client, loadForUser, createStore, loadStore, saveChanges, importKyteProducts, importKyteSales };
}
