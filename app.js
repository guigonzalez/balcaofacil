import { createCloudStore } from "./cloud-store.js";

const STORAGE_KEY = "balcao-mvp-v1";
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const FULL_DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const icons = {
  home: '<svg viewBox="0 0 24 24"><path d="m3.5 10 8.5-7 8.5 7"/><path d="M5.5 9v11h13V9M9.5 20v-6h5v6"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  box: '<svg viewBox="0 0 24 24"><path d="m12 3 9 4.7v8.6L12 21l-9-4.7V7.7L12 3Z"/><path d="m3.3 7.8 8.7 4.6 8.7-4.6M12 12.4V21M7.5 5.4l9 4.8"/></svg>',
  receipt: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1.5a6 6 0 0 1 12 0V20M16 5a3.5 3.5 0 0 1 0 6.8M18 14a5 5 0 0 1 3 4.5V20"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5M4 19h17"/><path d="m7 14 4-4 3 2 6-7"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1.1 1.8 3 2.3 3 1.1 3 2.5-1.3 2.3-3 2.3c-1.3 0-2.4-.4-3.2-1.1M12 5.5v13"/></svg>',
  trend: '<svg viewBox="0 0 24 24"><path d="M4 17 10 11l4 4 7-8"/><path d="M15 7h6v6"/></svg>',
  bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>'
};
const productArt = {
  "Caneca artesanal": ["☕", "thumb-yellow"],
  "Caderno pontilhado": ["📓", "thumb-blue"],
  "Vela de capim-limão": ["🕯️", "thumb-green"],
  "Ecobag algodão cru": ["👜", "thumb-pink"],
  "Sabonete de lavanda": ["🧼", "thumb-lilac"],
  "Garrafa térmica": ["🧴", "thumb-blue"],
  "Pote cerâmica": ["🏺", "thumb-yellow"],
  "Kit presente": ["🎁", "thumb-pink"]
};
const defaultCategories = ["Casa", "Papelaria", "Cuidados", "Acessórios", "Outros"];

function localDayOffset(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

function demoState() {
  const products = [
    { id: "p1", name: "Caneca artesanal", sku: "CAS-001", category: "Casa", price: 6800, cost: 3200, stock: 12, lowStock: 5, active: true },
    { id: "p2", name: "Caderno pontilhado", sku: "PAP-014", category: "Papelaria", price: 4590, cost: 1900, stock: 3, lowStock: 5, active: true },
    { id: "p3", name: "Vela de capim-limão", sku: "CAS-008", category: "Casa", price: 5200, cost: 2400, stock: 8, lowStock: 4, active: true },
    { id: "p4", name: "Ecobag algodão cru", sku: "ACE-022", category: "Acessórios", price: 3900, cost: 1500, stock: 2, lowStock: 5, active: true },
    { id: "p5", name: "Sabonete de lavanda", sku: "CUI-006", category: "Cuidados", price: 1890, cost: 700, stock: 18, lowStock: 6, active: true },
    { id: "p6", name: "Garrafa térmica", sku: "ACE-030", category: "Acessórios", price: 8900, cost: 4600, stock: 7, lowStock: 3, active: true },
    { id: "p7", name: "Pote cerâmica", sku: "CAS-019", category: "Casa", price: 7400, cost: 3700, stock: 0, lowStock: 3, active: true },
    { id: "p8", name: "Kit presente", sku: "ACE-041", category: "Acessórios", price: 12500, cost: 6100, stock: 5, lowStock: 2, active: true }
  ];
  const customers = [
    { id: "c1", name: "Marina Costa", phone: "(11) 98842-3100", email: "", createdAt: localDayOffset(-42) },
    { id: "c2", name: "Rafael Nunes", phone: "(11) 97731-6204", email: "", createdAt: localDayOffset(-25) },
    { id: "c3", name: "Camila Ferreira", phone: "(11) 99628-7318", email: "", createdAt: localDayOffset(-11) },
    { id: "c4", name: "João Pedro Lima", phone: "(11) 98217-0412", email: "", createdAt: localDayOffset(-4) }
  ];
  const sales = [
    { id: "VD-1038", date: localDayOffset(-2), customerId: "c2", payment: "Pix", status: "completed", items: [{ productId: "p2", name: "Caderno pontilhado", price: 4590, cost: 1900, quantity: 2 }, { productId: "p5", name: "Sabonete de lavanda", price: 1890, cost: 700, quantity: 1 }], total: 11070, cancelReason: "" },
    { id: "VD-1039", date: localDayOffset(-1), customerId: "c1", payment: "Cartão", status: "completed", items: [{ productId: "p1", name: "Caneca artesanal", price: 6800, cost: 3200, quantity: 1 }, { productId: "p3", name: "Vela de capim-limão", price: 5200, cost: 2400, quantity: 1 }], total: 12000, cancelReason: "" },
    { id: "VD-1040", date: localDayOffset(-1), customerId: "", payment: "Dinheiro", status: "completed", items: [{ productId: "p4", name: "Ecobag algodão cru", price: 3900, cost: 1500, quantity: 1 }, { productId: "p5", name: "Sabonete de lavanda", price: 1890, cost: 700, quantity: 2 }], total: 7680, cancelReason: "" },
    { id: "VD-1041", date: localDayOffset(0), customerId: "c3", payment: "Pix", status: "completed", items: [{ productId: "p1", name: "Caneca artesanal", price: 6800, cost: 3200, quantity: 1 }, { productId: "p5", name: "Sabonete de lavanda", price: 1890, cost: 700, quantity: 2 }], total: 10580, cancelReason: "" },
    { id: "VD-1042", date: localDayOffset(0), customerId: "c4", payment: "Cartão", status: "completed", items: [{ productId: "p3", name: "Vela de capim-limão", price: 5200, cost: 2400, quantity: 1 }, { productId: "p6", name: "Garrafa térmica", price: 8900, cost: 4600, quantity: 1 }], total: 14100, cancelReason: "" }
  ];
  return { version: 1, storeName: "Balcão da Vila", categories: [...defaultCategories], products, customers, sales, movements: [], nextSale: 1043 };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) {
    const initial = demoState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const state = JSON.parse(saved);
  if (
    state.version !== 1 ||
    !Array.isArray(state.products) ||
    !Array.isArray(state.customers) ||
    !Array.isArray(state.sales) ||
    !Array.isArray(state.movements) ||
    typeof state.storeName !== "string"
  ) {
    throw new Error("Os dados salvos não estão em um formato reconhecido. Exporte-os antes de limpar o armazenamento.");
  }
  const storedCategories = Array.isArray(state.categories)
    ? state.categories
    : [...defaultCategories, ...state.products.map(product => product.category)];
  state.categories = [...new Set([...storedCategories, ...state.products.map(product => product.category)]
    .filter(category => typeof category === "string" && category.trim() && category !== "Todos"))];
  return state;
}

let state;
let currentPage = "inicio";
let cart = [];
let selectedCustomer = "";
let posCategory = "Todos";
let productQuery = "";
let customerQuery = "";
let salesQuery = "";
let salesFilter = "all";
let salesPeriod = "all";
let productFilter = "active";
let toastTimer;
let cloudStore = null;
let cloudUser = null;
let storeRole = null;
let cloudWritePending = false;
let authActivation = 0;
let authNeedsPassword = false;
let authNotice = "";
let authMode = "signin";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const pageContent = $("#page-content");
const dialog = $("#app-dialog");
const dialogContent = $("#dialog-content");
const authScreen = $("#auth-screen");
const authContent = $("#auth-content");
const appShell = $(".app-shell");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function money(cents) {
  return BRL.format(cents / 100);
}

function parseMoney(value) {
  const normalized = String(value).trim().replace(/[R$\s]/g, "");
  if (!normalized) return NaN;
  let decimal = normalized;
  if (normalized.includes(",")) decimal = normalized.replace(/\./g, "").replace(",", ".");
  const amount = Number(decimal);
  return Number.isFinite(amount) ? Math.round(amount * 100) : NaN;
}

function dayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value, withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return withTime
    ? `${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date)} · ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)}`
    : DATE.format(date);
}

function formatLongDate(date = new Date()) {
  return FULL_DATE.format(date);
}

function initials(name) {
  return String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toLocaleUpperCase("pt-BR") ?? "").join("");
}

function artFor(name) {
  return productArt[name] ?? ["📦", "thumb-green"];
}

function showToast(message, type = "success") {
  const region = $("#toast-region");
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.innerHTML = `<span class="toast-symbol">${type === "error" ? "!" : "✓"}</span><span>${escapeHTML(message)}</span>`;
  region.replaceChildren(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 3500);
}

function commit(nextState, successMessage) {
  if (cloudStore) return commitCloudState(nextState, successMessage);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  } catch (error) {
    console.error("Não foi possível salvar os dados da loja.", error);
    showToast("Não foi possível salvar. Verifique o espaço de armazenamento do navegador.", "error");
    return false;
  }
  state = nextState;
  updateShell();
  renderPage();
  if (successMessage) showToast(successMessage);
  return true;
}

async function commitCloudState(nextState, successMessage) {
  if (cloudWritePending) {
    showToast("Aguarde a operação atual terminar antes de salvar outra alteração.", "error");
    return false;
  }
  cloudWritePending = true;
  const previous = structuredClone(state);
  state = nextState;
  updateShell();
  renderPage();
  try {
    await cloudStore.saveChanges(previous, nextState);
    const refreshed = await cloudStore.loadForUser(cloudUser);
    if (refreshed.needsStore) throw new Error("Sua loja não está mais associada a esta conta. Entre novamente.");
    state = refreshed.state;
    updateShell();
    renderPage();
    if (successMessage) showToast(successMessage);
    return true;
  } catch (error) {
    console.error("Não foi possível salvar a alteração na loja.", error);
    try {
      const refreshed = await cloudStore.loadForUser(cloudUser);
      if (!refreshed.needsStore) {
        state = refreshed.state;
        updateShell();
        renderPage();
      }
    } catch (refreshError) {
      console.error("Não foi possível recarregar os dados do servidor.", refreshError);
    }
    showToast(error.message || "Não foi possível salvar no servidor. Tente novamente.", "error");
    return false;
  } finally {
    cloudWritePending = false;
  }
}

function updateShell() {
  $(".store-avatar").textContent = initials(state.storeName) || "L";
  if (state?.cloud) {
    $("#store-name").textContent = state.storeName;
    $(".store-copy small").textContent = "Loja conectada";
    const profileName = state.user.name || state.user.email || "Usuário";
    const profileInitials = initials(state.user.name || profileName.split("@")[0].replace(/[._-]/g, " "));
    $(".profile-copy strong").textContent = profileName;
    $(".profile-copy small").textContent = state.role === "owner" ? "Proprietário" : state.role === "admin" ? "Administrador" : "Atendente";
    $(".profile-avatar").textContent = profileInitials;
    $(".topbar-avatar").textContent = profileInitials;
    $(".topbar-avatar").setAttribute("aria-label", `Conta ${profileName}`);
  } else {
    $("#store-name").textContent = state.storeName;
    $(".store-copy small").textContent = "Plano demonstração";
    $(".profile-copy strong").textContent = "Conta de demonstração";
    $(".profile-copy small").textContent = "Exemplo local";
    $(".profile-avatar").textContent = "DE";
    $(".topbar-avatar").textContent = "DE";
    $(".topbar-avatar").setAttribute("aria-label", "Configurações da demonstração");
  }
  $("#today-label").textContent = formatLongDate();
  const lowStock = state.products.filter(product => product.active && product.stock <= product.lowStock).length;
  const badge = $("#low-stock-count");
  badge.textContent = lowStock ? String(lowStock) : "";
  badge.hidden = lowStock === 0;
  $$(".nav-link").forEach(link => link.classList.toggle("is-active", link.dataset.page === currentPage));
  const activeLink = $(`.nav-link[data-page="${currentPage}"]`);
  $("#current-section").textContent = activeLink?.querySelector("span:not(.nav-icon):not(.nav-shortcut):not(.nav-count)")?.textContent ?? "Visão geral";
  $$("[data-icon]").forEach(element => {
    const key = element.dataset.icon;
    if (icons[key]) element.innerHTML = icons[key];
  });
}

function pageHeading(eyebrow, title, subtitle, action = "") {
  return `<div class="page-heading"><div><p class="eyebrow">${escapeHTML(eyebrow)}</p><h1>${escapeHTML(title)}</h1><p class="page-subtitle">${escapeHTML(subtitle)}</p></div>${action}</div>`;
}

function iconMarkup(name) {
  return icons[name] ?? "";
}

function customerName(id) {
  return state.customers.find(customer => customer.id === id)?.name ?? "Venda sem cliente";
}

function todaySales() {
  const today = dayKey(new Date());
  return state.sales.filter(sale => dayKey(sale.date) === today);
}

function saleRevenue(sales) {
  return sales.reduce((total, sale) => total + (sale.status === "completed" ? sale.total : 0), 0);
}

function recentSalesTable(sales, limit = 5) {
  const rows = [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
  if (!rows.length) return `<div class="empty-state"><div><span class="empty-symbol">↗</span><strong>Nenhuma venda por aqui</strong><p>Assim que você registrar uma venda, ela aparece aqui.</p></div></div>`;
  return `<div class="table-wrap"><table><thead><tr><th>VENDA</th><th>CLIENTE</th><th>DATA E HORA</th><th>PAGAMENTO</th><th>VALOR</th><th>STATUS</th></tr></thead><tbody>${rows.map(sale => `<tr>
    <td><strong>${escapeHTML(sale.id)}</strong></td>
    <td>${escapeHTML(customerName(sale.customerId))}</td>
    <td>${escapeHTML(formatDate(sale.date, true))}</td>
    <td>${escapeHTML(sale.payment)}</td>
    <td><strong>${money(sale.total)}</strong></td>
    <td><span class="status-pill${sale.status === "cancelled" ? " cancelled" : ""}">${sale.status === "completed" ? "Concluída" : "Cancelada"}</span></td>
  </tr>`).join("")}</tbody></table></div>`;
}

function chartMarkup(sales) {
  const points = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const key = dayKey(date);
    const value = saleRevenue(sales.filter(sale => dayKey(sale.date) === key));
    points.push({ date, value, today: offset === 0 });
  }
  const max = Math.max(5000, ...points.map(point => point.value));
  const graphTop = 19;
  const graphHeight = 92;
  const barWidth = 30;
  const gap = 25;
  const totalWidth = points.length * barWidth + (points.length - 1) * gap;
  const startX = (400 - totalWidth) / 2;
  return `<svg class="sales-chart" viewBox="0 0 400 150" role="img" aria-label="Faturamento nos últimos sete dias">${[0, 1, 2].map(i => `<line class="chart-gridline" x1="15" y1="${27 + i * 38}" x2="385" y2="${27 + i * 38}"/>`).join("")}${points.map((point, index) => {
    const height = point.value ? Math.max(4, point.value / max * graphHeight) : 3;
    const x = startX + index * (barWidth + gap);
    const y = graphTop + graphHeight - height;
    const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(point.date).replace(".", "");
    return `<rect class="chart-bar${point.today ? " is-today" : ""}" x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="5"><title>${escapeHTML(formatLongDate(point.date))}: ${escapeHTML(money(point.value))}</title></rect><text class="chart-label" x="${x + barWidth / 2}" y="135" text-anchor="middle">${escapeHTML(label)}</text>`;
  }).join("")}</svg>`;
}

function renderDashboard() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date()).toLocaleUpperCase("pt-BR");
  const today = todaySales();
  const completedToday = today.filter(sale => sale.status === "completed");
  const revenue = saleRevenue(today);
  const activeProducts = state.products.filter(product => product.active);
  const lowProducts = activeProducts.filter(product => product.stock <= product.lowStock).sort((a, b) => a.stock - b.stock);
  const missingCost = today.some(sale => sale.status === "completed" && sale.items.some(item => item.cost === null));
  const grossProfit = completedToday.reduce((sum, sale) => sum + sale.items.reduce((sub, item) => sub + (item.cost === null ? 0 : (item.price - item.cost) * item.quantity), 0), 0);
  const salesWeek = state.sales.filter(sale => new Date(sale.date) >= new Date(Date.now() - 6 * 86400000));
  const weekTotal = saleRevenue(salesWeek);
  const topItems = new Map();
  state.sales.filter(sale => sale.status === "completed").forEach(sale => sale.items.forEach(item => topItems.set(item.name, (topItems.get(item.name) ?? 0) + item.quantity)));
  const topItem = [...topItems.entries()].sort((a, b) => b[1] - a[1])[0];
  const action = `<button class="button button-primary" type="button" data-page="pdv"><span class="button-icon">＋</span> Nova venda</button>`;
  const firstName = state.user?.name?.trim().split(/\s+/)[0];
  pageContent.innerHTML = `${pageHeading(`${weekday} · SUA LOJA EM FOCO`, `${greeting}${firstName ? `, ${firstName}` : ""} 👋`, "Aqui está o resumo do que está acontecendo na sua loja hoje.", action)}
    <div class="metric-grid">
      <article class="metric-card"><div class="metric-top"><span>Vendas de hoje</span><span class="metric-icon">${iconMarkup("receipt")}</span></div><div class="metric-value">${completedToday.length}</div><div class="metric-note"><strong>${today.length ? "Tudo atualizado" : "Vamos começar?"}</strong> · vendas concluídas</div></article>
      <article class="metric-card"><div class="metric-top"><span>Faturamento do dia</span><span class="metric-icon">${iconMarkup("coin")}</span></div><div class="metric-value">${money(revenue)}</div><div class="metric-note">valor líquido de vendas concluídas</div></article>
      <article class="metric-card"><div class="metric-top"><span>Lucro bruto estimado</span><span class="metric-icon">${iconMarkup("trend")}</span></div><div class="metric-value">${money(grossProfit)}</div><div class="metric-note">${missingCost ? "Estimativa parcial · há produtos sem custo" : "Com base no custo informado"}</div></article>
      <article class="metric-card"><div class="metric-top"><span>Produtos ativos</span><span class="metric-icon">${iconMarkup("box")}</span></div><div class="metric-value">${activeProducts.length}</div><div class="metric-note">${lowProducts.length ? `<strong>${lowProducts.length} precisam de atenção</strong>` : "estoque em dia"} · no seu catálogo</div></article>
    </div>
    <div class="dashboard-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Visão das vendas</h2><p class="panel-subtitle">Como sua loja foi nos últimos 7 dias</p></div><span class="status-pill">Últimos 7 dias</span></div><div class="chart-summary"><strong>${money(weekTotal)}</strong><span>faturamento no período</span></div><div class="chart-wrap">${chartMarkup(salesWeek)}</div></section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Estoque pedindo atenção</h2><p class="panel-subtitle">Produtos no limite ou abaixo dele</p></div><button class="text-link" data-page="produtos" type="button">Ver estoque <span>↗</span></button></div>
        <div class="stock-list">${lowProducts.length ? lowProducts.slice(0, 4).map(product => { const [emoji, color] = artFor(product.name); return `<div class="stock-row"><span class="product-thumb ${color}">${emoji}</span><div><div class="stock-product">${escapeHTML(product.name)}</div><div class="stock-sku">${escapeHTML(product.sku || product.category)}</div></div><div class="stock-level">${product.stock === 0 ? "Sem estoque" : `${product.stock} un.`}<span>mín. ${product.lowStock} un.</span></div></div>`; }).join("") : `<div class="empty-state"><div><span class="empty-symbol">✓</span><strong>Estoque em dia</strong><p>Nenhum produto está abaixo do mínimo.</p></div></div>`}</div>
      </section>
    </div>
    <section class="panel table-panel"><div class="panel-header"><div><h2 class="panel-title">Últimas vendas</h2><p class="panel-subtitle">Acompanhe as movimentações mais recentes</p></div><button class="text-link" data-page="vendas" type="button">Ver todas <span>↗</span></button></div>${recentSalesTable(state.sales)}</section>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Mais vendidos</h2><p class="panel-subtitle">Seus produtos mais procurados</p></div><span class="status-pill">${topItem ? `${topItem[1]} vendidos` : "Sem vendas"}</span></div>${topItem ? `<div class="stock-list"><div class="stock-row"><span class="product-thumb ${artFor(topItem[0])[1]}">${artFor(topItem[0])[0]}</span><div><div class="stock-product">${escapeHTML(topItem[0])}</div><div class="stock-sku">Produto em destaque</div></div><div class="stock-level">${topItem[1]} un.<span>vendidas</span></div></div></div>` : `<div class="empty-state"><div><span class="empty-symbol">✦</span><strong>Seu primeiro destaque vem aí</strong><p>Registre vendas para ver os produtos mais vendidos.</p></div></div>`}</section>`;
}

function stockPill(product) {
  if (product.stock <= 0) return '<span class="stock-pill out">Sem estoque</span>';
  if (product.stock <= product.lowStock) return `<span class="stock-pill low">Estoque baixo · ${product.stock}</span>`;
  return `<span class="stock-pill">Em estoque · ${product.stock}</span>`;
}

function renderProducts() {
  const allProducts = state.products.filter(product => productFilter === "all" || product.active === (productFilter === "active"));
  const filtered = allProducts.filter(product => `${product.name} ${product.sku} ${product.category}`.toLocaleLowerCase("pt-BR").includes(productQuery.toLocaleLowerCase("pt-BR")));
  const action = `<button class="button button-primary" type="button" data-action="add-product"><span class="button-icon">＋</span> Novo produto</button>`;
  const rows = filtered.map(product => {
    const [emoji, color] = artFor(product.name);
    return `<tr><td><div class="product-cell-name"><span class="product-thumb ${color}">${emoji}</span><div><strong>${escapeHTML(product.name)}</strong><div class="stock-sku">${escapeHTML(product.sku || "Sem código")}</div></div></div></td><td>${escapeHTML(product.category)}</td><td><strong>${money(product.price)}</strong></td><td>${product.cost === null ? "—" : money(product.cost)}</td><td>${stockPill(product)}</td><td><div class="row-actions"><button class="table-action" type="button" data-action="adjust-stock" data-id="${escapeHTML(product.id)}">Ajustar</button><button class="table-action" type="button" data-action="edit-product" data-id="${escapeHTML(product.id)}">Editar</button><button class="table-action ${product.active ? "danger" : ""}" type="button" data-action="toggle-product" data-id="${escapeHTML(product.id)}">${product.active ? "Arquivar" : "Ativar"}</button></div></td></tr>`;
  }).join("");
  pageContent.innerHTML = `${pageHeading("CATÁLOGO DA LOJA", "Produtos", "Cuide do seu catálogo e mantenha o estoque sempre atualizado.", action)}
    <div class="detail-strip"><div class="detail-stat"><span>Produtos ativos</span><strong>${state.products.filter(product => product.active).length}</strong></div><div class="detail-stat"><span>Estoque baixo</span><strong>${state.products.filter(product => product.active && product.stock <= product.lowStock).length}</strong></div><div class="detail-stat"><span>Valor em estoque</span><strong>${money(state.products.filter(product => product.active).reduce((sum, product) => sum + product.price * product.stock, 0))}</strong></div></div>
    <section class="panel"><div class="list-toolbar"><label class="search-box">${iconMarkup("search")}<input id="product-search" type="search" placeholder="Buscar produto ou código..." value="${escapeHTML(productQuery)}" aria-label="Buscar produto ou código"></label><span class="toolbar-spacer"></span><select class="select-control" id="product-filter" aria-label="Filtrar produtos"><option value="active"${productFilter === "active" ? " selected" : ""}>Produtos ativos</option><option value="all"${productFilter === "all" ? " selected" : ""}>Todos os produtos</option><option value="inactive"${productFilter === "inactive" ? " selected" : ""}>Arquivados</option></select><button class="button button-secondary button-small" type="button" data-action="manage-categories">Categorias</button><button class="button button-secondary button-small" type="button" data-action="adjust-stock-list">↕ Ajustar estoque</button></div>
      <div class="table-wrap"><table><thead><tr><th>PRODUTO</th><th>CATEGORIA</th><th>PREÇO DE VENDA</th><th>CUSTO</th><th>ESTOQUE</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="empty-state"><div><span class="empty-symbol">⌕</span><strong>Nenhum produto encontrado</strong><p>Tente outra busca ou cadastre um novo produto.</p></div></div></td></tr>`}</tbody></table></div><div class="list-count">${filtered.length} ${filtered.length === 1 ? "produto" : "produtos"} exibidos</div></section>`;
}

function renderSales() {
  const filtered = [...state.sales].filter(sale => {
    const statusMatches = salesFilter === "all" || sale.status === salesFilter;
    const queryMatches = `${sale.id} ${customerName(sale.customerId)} ${sale.payment}`.toLocaleLowerCase("pt-BR").includes(salesQuery.toLocaleLowerCase("pt-BR"));
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    if (salesPeriod === "7d") periodStart.setDate(periodStart.getDate() - 6);
    else if (salesPeriod === "30d") periodStart.setDate(periodStart.getDate() - 29);
    const dateMatches = salesPeriod === "all" ||
      (salesPeriod === "today" ? dayKey(sale.date) === dayKey(new Date()) :
        new Date(sale.date) >= periodStart && new Date(sale.date) <= new Date());
    return statusMatches && queryMatches && dateMatches;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  const action = `<button class="button button-primary" type="button" data-page="pdv"><span class="button-icon">＋</span> Nova venda</button>`;
  pageContent.innerHTML = `${pageHeading("HISTÓRICO DA LOJA", "Vendas", "Tudo o que saiu do caixa, organizado em um só lugar.", action)}
    <div class="detail-strip"><div class="detail-stat"><span>Vendas concluídas</span><strong>${state.sales.filter(sale => sale.status === "completed").length}</strong></div><div class="detail-stat"><span>Faturamento total</span><strong>${money(saleRevenue(state.sales))}</strong></div><div class="detail-stat"><span>Cancelamentos</span><strong>${state.sales.filter(sale => sale.status === "cancelled").length}</strong></div></div>
    <section class="panel"><div class="list-toolbar"><label class="search-box">${iconMarkup("search")}<input id="sales-search" type="search" placeholder="Buscar venda ou cliente..." value="${escapeHTML(salesQuery)}" aria-label="Buscar venda ou cliente"></label><span class="toolbar-spacer"></span><select class="select-control" id="sales-period" aria-label="Filtrar por período"><option value="all"${salesPeriod === "all" ? " selected" : ""}>Qualquer data</option><option value="today"${salesPeriod === "today" ? " selected" : ""}>Hoje</option><option value="7d"${salesPeriod === "7d" ? " selected" : ""}>Últimos 7 dias</option><option value="30d"${salesPeriod === "30d" ? " selected" : ""}>Últimos 30 dias</option></select></div>
      <div class="filter-tabs" role="group" aria-label="Filtrar vendas"><button class="filter-tab${salesFilter === "all" ? " is-selected" : ""}" type="button" data-sales-filter="all">Todas</button><button class="filter-tab${salesFilter === "completed" ? " is-selected" : ""}" type="button" data-sales-filter="completed">Concluídas</button><button class="filter-tab${salesFilter === "cancelled" ? " is-selected" : ""}" type="button" data-sales-filter="cancelled">Canceladas</button></div>
      <div class="table-wrap"><table><thead><tr><th>VENDA</th><th>CLIENTE</th><th>DATA E HORA</th><th>PAGAMENTO</th><th>VALOR</th><th>STATUS</th><th></th></tr></thead><tbody>${filtered.length ? filtered.map(sale => `<tr><td><strong>${escapeHTML(sale.id)}</strong></td><td>${escapeHTML(customerName(sale.customerId))}</td><td>${escapeHTML(formatDate(sale.date, true))}</td><td>${escapeHTML(sale.payment)}</td><td><strong>${money(sale.total)}</strong></td><td><span class="status-pill${sale.status === "cancelled" ? " cancelled" : ""}">${sale.status === "completed" ? "Concluída" : "Cancelada"}</span></td><td>${sale.status === "completed" ? `<button class="table-action danger" type="button" data-action="cancel-sale" data-id="${escapeHTML(sale.id)}">Cancelar</button>` : `<span class="customer-contact" title="${escapeHTML(sale.cancelReason)}">Devolvida</span>`}</td></tr>`).join("") : `<tr><td colspan="7"><div class="empty-state"><div><span class="empty-symbol">↗</span><strong>Nenhuma venda encontrada</strong><p>Experimente buscar por outro termo.</p></div></div></td></tr>`}</tbody></table></div><div class="list-count">${filtered.length} ${filtered.length === 1 ? "venda" : "vendas"} exibidas · faturamento considera somente vendas concluídas</div></section>`;
}

function customerStats(customer) {
  const sales = state.sales.filter(sale => sale.customerId === customer.id && sale.status === "completed");
  return { count: sales.length, total: saleRevenue(sales), latest: sales.sort((a, b) => new Date(b.date) - new Date(a.date))[0] };
}

function renderCustomers() {
  const filtered = state.customers.filter(customer => `${customer.name} ${customer.phone} ${customer.email}`.toLocaleLowerCase("pt-BR").includes(customerQuery.toLocaleLowerCase("pt-BR")));
  const action = `<button class="button button-primary" type="button" data-action="add-customer"><span class="button-icon">＋</span> Novo cliente</button>`;
  const rows = filtered.map(customer => {
    const stats = customerStats(customer);
    return `<tr><td><div class="customer-summary"><span class="cell-avatar">${escapeHTML(initials(customer.name))}</span><div><strong>${escapeHTML(customer.name)}</strong><div class="customer-contact">${escapeHTML(customer.email || "Cliente da loja")}</div></div></div></td><td>${escapeHTML(customer.phone || "—")}</td><td>${stats.count}</td><td><strong>${money(stats.total)}</strong></td><td>${stats.latest ? formatDate(stats.latest.date) : "—"}</td><td><div class="row-actions"><button class="table-action" type="button" data-action="edit-customer" data-id="${escapeHTML(customer.id)}">Editar</button><button class="table-action" type="button" data-action="customer-history" data-id="${escapeHTML(customer.id)}">Histórico</button></div></td></tr>`;
  }).join("");
  pageContent.innerHTML = `${pageHeading("RELACIONAMENTO", "Clientes", "Conheça quem escolhe a sua loja, venda após venda.", action)}
    <div class="detail-strip"><div class="detail-stat"><span>Clientes cadastrados</span><strong>${state.customers.length}</strong></div><div class="detail-stat"><span>Compras com cliente</span><strong>${state.sales.filter(sale => sale.status === "completed" && sale.customerId).length}</strong></div><div class="detail-stat"><span>Clientes recorrentes</span><strong>${state.customers.filter(customer => customerStats(customer).count > 1).length}</strong></div></div>
    <section class="panel"><div class="list-toolbar"><label class="search-box">${iconMarkup("search")}<input id="customer-search" type="search" placeholder="Buscar por nome ou telefone..." value="${escapeHTML(customerQuery)}" aria-label="Buscar cliente"></label><span class="toolbar-spacer"></span><span class="customer-contact">${filtered.length} clientes</span></div><div class="table-wrap"><table><thead><tr><th>CLIENTE</th><th>TELEFONE</th><th>COMPRAS</th><th>TOTAL EM COMPRAS</th><th>ÚLTIMA COMPRA</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="empty-state"><div><span class="empty-symbol">♙</span><strong>Nenhum cliente encontrado</strong><p>Cadastre um cliente para acompanhar seu histórico.</p></div></div></td></tr>`}</tbody></table></div></section>`;
}

function renderPOS() {
  const posCategories = ["Todos", ...state.categories];
  if (!posCategories.includes(posCategory)) posCategory = "Todos";
  const available = state.products.filter(product => product.active && (posCategory === "Todos" || product.category === posCategory) && `${product.name} ${product.sku}`.toLocaleLowerCase("pt-BR").includes(productQuery.toLocaleLowerCase("pt-BR")));
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const productCards = available.map(product => {
    const [emoji, color] = artFor(product.name);
    return `<button class="pos-product-card" type="button" data-action="add-to-cart" data-id="${escapeHTML(product.id)}" ${product.stock <= 0 ? "disabled" : ""}><span class="pos-product-emoji ${color}">${emoji}</span><span class="pos-product-name">${escapeHTML(product.name)}</span><span class="pos-product-bottom"><span class="pos-product-price">${money(product.price)}</span><span class="pos-product-stock">${product.stock > 0 ? `${product.stock} un.` : "Esgotado"}</span></span></button>`;
  }).join("");
  const customerOptions = state.customers.map(customer => `<option value="${escapeHTML(customer.id)}"${selectedCustomer === customer.id ? " selected" : ""}>${escapeHTML(customer.name)}</option>`).join("");
  pageContent.innerHTML = `${pageHeading("VENDA PRESENCIAL", "Frente de caixa", "Toque em um produto para adicioná-lo à venda.", "")}
    <div class="pos-layout"><div class="pos-main"><div class="pos-toolbar"><label class="search-box">${iconMarkup("search")}<input id="pos-search" type="search" placeholder="Buscar um produto..." value="${escapeHTML(productQuery)}" aria-label="Buscar produto para venda"></label><div class="category-list" role="group" aria-label="Filtrar categoria">${posCategories.map(category => `<button class="category-chip${posCategory === category ? " is-selected" : ""}" type="button" data-category="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("")}</div></div>
      <div class="pos-product-grid">${productCards || `<div class="empty-state"><div><span class="empty-symbol">⌕</span><strong>Nenhum produto disponível</strong><p>Cadastre um produto ou ajuste os filtros.</p></div></div>`}</div></div>
    <section class="panel cart-panel"><div class="panel-header"><div class="cart-heading"><h2 class="panel-title">Venda atual</h2><span class="cart-badge">${cartCount}</span></div><button class="table-action danger" type="button" data-action="clear-cart" ${cart.length ? "" : "disabled"}>Limpar</button></div>
      <div class="cart-body">${cart.length ? cart.map(line => `<div class="cart-item"><div class="cart-item-title">${escapeHTML(line.name)}</div><div class="cart-item-total">${money(line.price * line.quantity)}</div><div class="cart-item-subtitle">${money(line.price)} cada</div><div class="quantity-control"><button type="button" data-action="cart-quantity" data-id="${escapeHTML(line.productId)}" data-delta="-1" aria-label="Diminuir quantidade">−</button><span>${line.quantity}</span><button type="button" data-action="cart-quantity" data-id="${escapeHTML(line.productId)}" data-delta="1" aria-label="Aumentar quantidade">+</button></div></div>`).join("") : `<div class="cart-empty"><div><span>🛍️</span><p>Sua venda começa<br>com um produto.</p></div></div>`}</div>
      <div class="cart-footer"><label class="cart-customer"><span data-icon="users">${iconMarkup("users")}</span><select id="pos-customer" aria-label="Associar cliente"><option value="">Adicionar cliente (opcional)</option>${customerOptions}</select></label><div class="cart-totals"><div class="cart-total-row"><span>Subtotal</span><span>${money(total)}</span></div><div class="cart-total-row grand"><span>Total</span><span>${money(total)}</span></div></div><button class="button button-primary checkout-button" type="button" data-action="checkout" ${cart.length ? "" : "disabled"}>Cobrar ${money(total)} <span>→</span></button><p class="helper-note">Pagamento registrado manualmente · sem cobrança integrada</p></div>
    </section></div>`;
}

function renderPage() {
  if (!state) return;
  updateShell();
  if (currentPage === "pdv") renderPOS();
  else if (currentPage === "produtos") renderProducts();
  else if (currentPage === "vendas") renderSales();
  else if (currentPage === "clientes") renderCustomers();
  else renderDashboard();
}

function navigate(page) {
  if (!["inicio", "pdv", "produtos", "vendas", "clientes"].includes(page)) return;
  currentPage = page;
  if (page !== "pdv") productQuery = "";
  renderPage();
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeMobileMenu() {
  $("#sidebar").classList.remove("is-open");
  $("#mobile-scrim").classList.remove("is-open");
}

function openDialog(title, subtitle, body, className = "") {
  dialogContent.innerHTML = `<div class="dialog-head"><div><h2 id="dialog-title">${escapeHTML(title)}</h2><p>${escapeHTML(subtitle)}</p></div><button class="dialog-close" type="button" data-action="close-dialog" aria-label="Fechar">×</button></div><div class="dialog-form ${className}">${body}</div>`;
  dialog.showModal();
}

function closeDialog() {
  if (dialog.open) dialog.close();
}

function productForm(product = null) {
  const editing = product !== null;
  openDialog(editing ? "Editar produto" : "Novo produto", editing ? "Atualize as informações do item." : "Cadastre um item para começar a vender.", `<form id="product-form"><input type="hidden" name="id" value="${escapeHTML(product?.id ?? "")}"><div class="form-grid">
    <div class="form-field full"><label for="product-name">Nome do produto *</label><input id="product-name" name="name" required maxlength="70" placeholder="Ex.: Caneca artesanal" value="${escapeHTML(product?.name ?? "")}"></div>
    <div class="form-field"><label for="product-sku">Código / SKU</label><input id="product-sku" name="sku" maxlength="30" placeholder="Opcional" value="${escapeHTML(product?.sku ?? "")}"></div>
    <div class="form-field"><label for="product-category">Categoria *</label><select id="product-category" name="category" required>${state.categories.map(category => `<option value="${escapeHTML(category)}"${product?.category === category ? " selected" : ""}>${escapeHTML(category)}</option>`).join("")}</select></div>
    <div class="form-field"><label for="product-price">Preço de venda *</label><input id="product-price" name="price" inputmode="decimal" required placeholder="0,00" value="${product ? (product.price / 100).toFixed(2).replace(".", ",") : ""}"></div>
    <div class="form-field"><label for="product-cost">Custo unitário</label><input id="product-cost" name="cost" inputmode="decimal" placeholder="Opcional" value="${product?.cost !== null && product?.cost !== undefined ? (product.cost / 100).toFixed(2).replace(".", ",") : ""}"></div>
    ${editing ? "" : `<div class="form-field"><label for="product-stock">Estoque inicial *</label><input id="product-stock" name="stock" type="number" min="0" step="1" required value="0"></div>`}
    <div class="form-field"><label for="product-low">Alerta quando chegar em</label><input id="product-low" name="lowStock" type="number" min="0" step="1" required value="${product?.lowStock ?? 3}"><span class="field-hint">Quantidade mínima para avisar sobre reposição.</span></div>
  </div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Cancelar</button><button class="button button-primary" type="submit">${editing ? "Salvar alterações" : "Cadastrar produto"}</button></div></form>`);
  $("#product-name").focus();
}

function categoryManagerDialog() {
  const rows = state.categories.map(category => {
    const productCount = state.products.filter(product => product.category === category).length;
    const cannotDelete = productCount > 0 || state.categories.length <= 1;
    const detail = productCount
      ? `${productCount} ${productCount === 1 ? "produto usa" : "produtos usam"} esta categoria`
      : state.categories.length <= 1 ? "Mantenha ao menos uma categoria" : "Sem produtos";
    return `<li class="category-manager-row"><div><strong>${escapeHTML(category)}</strong><small>${detail}</small></div><button class="table-action danger" type="button" data-action="delete-category" data-id="${escapeHTML(category)}" ${cannotDelete ? "disabled" : ""}>Apagar</button></li>`;
  }).join("");
  openDialog("Categorias de produtos", "Organize os produtos e os filtros do frente de caixa.", `<form id="category-form"><div class="form-field"><label for="category-name">Nova categoria</label><input id="category-name" name="name" required maxlength="40" placeholder="Ex.: Bebidas"></div><div class="dialog-actions"><button class="button button-primary" type="submit">Cadastrar categoria</button></div></form><ul class="category-manager-list">${rows}</ul><p class="field-hint">Uma categoria só pode ser apagada quando nenhum produto estiver usando-a.</p>`);
  $("#category-name").focus();
}

function customerForm(customer = null) {
  const editing = customer !== null;
  openDialog(editing ? "Editar cliente" : "Novo cliente", "Os dados de contato são opcionais.", `<form id="customer-form"><input type="hidden" name="id" value="${escapeHTML(customer?.id ?? "")}"><div class="form-grid">
    <div class="form-field full"><label for="customer-name">Nome *</label><input id="customer-name" name="name" required maxlength="70" placeholder="Nome e sobrenome" value="${escapeHTML(customer?.name ?? "")}"></div>
    <div class="form-field"><label for="customer-phone">Telefone</label><input id="customer-phone" name="phone" type="tel" maxlength="25" placeholder="(00) 00000-0000" value="${escapeHTML(customer?.phone ?? "")}"></div>
    <div class="form-field"><label for="customer-email">E-mail</label><input id="customer-email" name="email" type="email" maxlength="100" placeholder="voce@email.com" value="${escapeHTML(customer?.email ?? "")}"></div>
  </div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Cancelar</button><button class="button button-primary" type="submit">${editing ? "Salvar alterações" : "Cadastrar cliente"}</button></div></form>`);
  $("#customer-name").focus();
}

function adjustStockDialog(product = null) {
  const options = state.products.filter(item => item.active).map(item => `<option value="${escapeHTML(item.id)}"${product?.id === item.id ? " selected" : ""}>${escapeHTML(item.name)} · saldo atual ${item.stock}</option>`).join("");
  openDialog("Ajustar estoque", "Registre uma entrada ou correção de saldo com motivo.", `<form id="stock-form"><div class="form-grid">
    <div class="form-field full"><label for="stock-product">Produto *</label><select id="stock-product" name="productId" required>${options}</select></div>
    <div class="form-field"><label for="stock-kind">Tipo de ajuste *</label><select id="stock-kind" name="kind"><option value="entry">Entrada de mercadoria</option><option value="correction">Correção de saldo</option></select></div>
    <div class="form-field"><label for="stock-quantity">Quantidade *</label><input id="stock-quantity" name="quantity" type="number" min="1" step="1" required value="1"></div>
    <div class="form-field full"><label for="stock-reason">Motivo *</label><input id="stock-reason" name="reason" maxlength="100" required placeholder="Ex.: Reposição de fornecedor"></div>
  </div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Cancelar</button><button class="button button-primary" type="submit">Registrar ajuste</button></div></form>`);
}

function checkoutDialog() {
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const customer = selectedCustomer ? state.customers.find(item => item.id === selectedCustomer)?.name : "";
  const items = cart.map(line => `<div class="checkout-summary-row"><span>${line.quantity}× ${escapeHTML(line.name)}</span><strong>${money(line.price * line.quantity)}</strong></div>`).join("");
  openDialog("Finalizar venda", "Confira os itens e registre como o cliente pagou.", `<form id="checkout-form"><div class="checkout-summary">${items}<div class="checkout-summary-row total"><span>Total a pagar</span><strong>${money(total)}</strong></div></div>
    <div class="form-grid"><div class="form-field"><label for="checkout-payment">Forma de pagamento *</label><select id="checkout-payment" name="payment" required><option>Dinheiro</option><option>Pix</option><option>Cartão</option><option>Outro</option></select></div><div class="form-field"><label for="checkout-customer">Cliente</label><input id="checkout-customer" value="${escapeHTML(customer || "Venda sem cliente")}" disabled></div></div>
    <p class="field-hint" style="margin-top:12px">Este registro não processa pagamentos. O valor é recebido fora do sistema.</p><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Voltar</button><button class="button button-primary" type="submit">Confirmar venda · ${money(total)}</button></div></form>`);
}

function receiptDialog(sale) {
  const rows = sale.items.map(item => `<div class="receipt-row"><span>${item.quantity}× ${escapeHTML(item.name)}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join("");
  dialogContent.innerHTML = `<div class="receipt-success"><span class="receipt-success-mark">✓</span><h2>Venda concluída!</h2><p>${escapeHTML(sale.id)} · ${escapeHTML(formatDate(sale.date, true))}</p><div class="receipt-box">${rows}<div class="receipt-row"><span>Pagamento</span><strong>${escapeHTML(sale.payment)}</strong></div><div class="receipt-row"><span>Total</span><strong>${money(sale.total)}</strong></div></div><button class="button button-primary" type="button" data-action="receipt-done">Concluir</button></div>`;
  dialog.showModal();
}

function cancelSaleDialog(sale) {
  openDialog(`Cancelar ${sale.id}`, "A venda será preservada no histórico e os produtos voltarão ao estoque.", `<form id="cancel-sale-form"><input type="hidden" name="id" value="${escapeHTML(sale.id)}"><div class="form-field"><label for="cancel-reason">Motivo do cancelamento *</label><textarea id="cancel-reason" name="reason" maxlength="160" required placeholder="Descreva brevemente o motivo"></textarea></div><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Voltar</button><button class="button button-danger" type="submit">Cancelar venda</button></div></form>`);
  $("#cancel-reason").focus();
}

function settingsDialog() {
  const cloudMode = Boolean(state.cloud);
  const inviteForm = cloudMode && ["owner", "admin"].includes(state.role)
    ? `<form id="invite-form" class="invite-form"><p class="settings-section-title">Convidar alguém para a equipe</p><div class="form-grid"><div class="form-field"><label for="invite-email">E-mail *</label><input id="invite-email" name="email" required type="email" maxlength="254" placeholder="pessoa@email.com"></div><div class="form-field"><label for="invite-role">Acesso *</label><select id="invite-role" name="role"><option value="attendant">Atendente</option><option value="admin">Administrador</option></select></div></div><div class="dialog-actions"><button class="button button-primary" type="submit">Enviar convite</button></div></form>`
    : "";
  const resetButton = cloudMode ? "" : `<button class="button button-danger button-small" type="button" data-action="reset-demo">Restaurar demonstração</button>`;
  const storeNameControl = state.role === "attendant"
    ? `<div class="form-field"><label>Nome da loja</label><input value="${escapeHTML(state.storeName)}" disabled></div>`
    : `<div class="form-field"><label for="store-name-input">Nome da loja</label><input id="store-name-input" name="storeName" required maxlength="80" value="${escapeHTML(state.storeName)}"></div>`;
  const description = cloudMode
    ? `${cloudUser?.email ?? ""} · ${state.role === "owner" ? "proprietário" : state.role === "admin" ? "administrador" : "atendente"}`
    : "Personalize a identificação da demonstração.";
  const descriptionNode = `<p>${escapeHTML(description)}</p>`;
  openDialog("Sua loja", "", `<form id="settings-form">${storeNameControl}${cloudMode ? "" : `<p class="field-hint" style="margin-top:12px">Seus dados ficam somente neste navegador. Para reiniciar a demonstração, use o botão abaixo.</p>`}<div class="dialog-actions" style="justify-content:space-between">${resetButton}<span style="display:flex;gap:8px"><button class="button button-secondary" type="button" data-action="close-dialog">Fechar</button>${state.role === "attendant" ? "" : `<button class="button button-primary" type="submit">Salvar</button>`}</span></div></form>${inviteForm}<div class="dialog-actions"><button class="button button-secondary" type="button" data-action="sign-out">Sair da conta</button></div>`);
  $(".dialog-head p", dialogContent).textContent = descriptionNode.replace(/<[^>]+>/g, "");
}

function confirmResetDemo() {
  openDialog("Restaurar a demonstração?", "Os dados atuais desta loja neste navegador serão substituídos.", `<p class="field-hint">Vendas, produtos, clientes e ajustes feitos desde a última restauração serão perdidos. Esta ação não pode ser desfeita.</p><div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Manter meus dados</button><button class="button button-danger" type="button" data-action="confirm-reset-demo">Sim, restaurar</button></div>`);
}

function addToCart(productId) {
  const product = state.products.find(item => item.id === productId && item.active);
  if (!product) return showToast("Este produto não está disponível.", "error");
  const line = cart.find(item => item.productId === productId);
  if ((line?.quantity ?? 0) >= product.stock) return showToast("A quantidade no carrinho já chegou ao estoque disponível.", "error");
  if (line) line.quantity += 1;
  else cart.push({ productId, name: product.name, price: product.price, cost: product.cost, quantity: 1 });
  renderPOS();
}

function changeCartQuantity(productId, delta) {
  const line = cart.find(item => item.productId === productId);
  const product = state.products.find(item => item.id === productId);
  if (!line || !product) return;
  if (delta > 0 && line.quantity >= product.stock) return showToast("Não há mais unidades disponíveis deste produto.", "error");
  line.quantity += delta;
  if (line.quantity <= 0) cart = cart.filter(item => item.productId !== productId);
  renderPOS();
}

async function completeSale(form) {
  const data = new FormData(form);
  const payment = String(data.get("payment") || "");
  const current = structuredClone(state);
  for (const line of cart) {
    const product = current.products.find(item => item.id === line.productId && item.active);
    if (!product || product.stock < line.quantity) {
      closeDialog();
      showToast(`Estoque insuficiente para ${line.name}. A venda não foi registrada.`, "error");
      cart = cart.filter(item => current.products.some(p => p.id === item.productId && p.active && p.stock >= item.quantity));
      renderPOS();
      return;
    }
    product.stock -= line.quantity;
  }
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const sale = {
    id: `VD-${current.nextSale}`,
    date: new Date().toISOString(),
    customerId: selectedCustomer,
    payment,
    status: "completed",
    items: cart.map(line => ({ ...line })),
    total,
    cancelReason: ""
  };
  current.nextSale += 1;
  current.sales.push(sale);
  if (!await commit(current)) return;
  cart = [];
  selectedCustomer = "";
  receiptDialog(state.sales.find(item => item.databaseId === sale.databaseId) ?? sale);
}

async function handleProductSubmit(form) {
  const data = new FormData(form);
  const id = String(data.get("id") || "");
  const name = String(data.get("name") || "").trim();
  const sku = String(data.get("sku") || "").trim();
  const category = String(data.get("category") || "Outros");
  const price = parseMoney(data.get("price"));
  const costInput = String(data.get("cost") || "").trim();
  const cost = costInput ? parseMoney(costInput) : null;
  const lowStock = Number(data.get("lowStock"));
  const stock = id ? null : Number(data.get("stock"));
  if (!name || !Number.isSafeInteger(price) || price <= 0 || (cost !== null && (!Number.isSafeInteger(cost) || cost < 0)) || !Number.isSafeInteger(lowStock) || lowStock < 0 || (!id && (!Number.isSafeInteger(stock) || stock < 0))) {
    return showToast("Confira o preço, custo e quantidades informados.", "error");
  }
  if (sku && state.products.some(product => product.sku.toLocaleLowerCase("pt-BR") === sku.toLocaleLowerCase("pt-BR") && product.id !== id)) {
    return showToast("Já existe um produto com esse código/SKU.", "error");
  }
  const current = structuredClone(state);
  if (id) {
    const product = current.products.find(item => item.id === id);
    if (!product) return showToast("Não foi possível localizar o produto para editar.", "error");
    Object.assign(product, { name, sku, category, price, cost, lowStock });
  } else {
    const productId = crypto.randomUUID();
    current.products.push({ id: productId, name, sku, category, price, cost, stock, lowStock, active: true });
    if (stock > 0) current.movements.push({ id: crypto.randomUUID(), productId, date: new Date().toISOString(), delta: stock, kind: "entry", reason: "Estoque inicial" });
  }
  if (await commit(current, id ? "Produto atualizado." : "Produto cadastrado.")) closeDialog();
}

async function handleCustomerSubmit(form) {
  const data = new FormData(form);
  const id = String(data.get("id") || "");
  const name = String(data.get("name") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const email = String(data.get("email") || "").trim();
  if (!name) return showToast("Informe o nome do cliente.", "error");
  const current = structuredClone(state);
  if (id) {
    const customer = current.customers.find(item => item.id === id);
    if (!customer) return showToast("Não foi possível localizar o cliente para editar.", "error");
    Object.assign(customer, { name, phone, email });
  } else {
    current.customers.push({ id: crypto.randomUUID(), name, phone, email, createdAt: new Date().toISOString() });
  }
  if (await commit(current, id ? "Cadastro do cliente atualizado." : "Cliente cadastrado.")) closeDialog();
}

async function handleStockSubmit(form) {
  const data = new FormData(form);
  const productId = String(data.get("productId") || "");
  const kind = String(data.get("kind") || "");
  const quantity = Number(data.get("quantity"));
  const reason = String(data.get("reason") || "").trim();
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !reason || !["entry", "correction"].includes(kind)) return showToast("Informe uma quantidade e um motivo válidos.", "error");
  const current = structuredClone(state);
  const product = current.products.find(item => item.id === productId && item.active);
  if (!product) return showToast("Não foi possível localizar o produto selecionado.", "error");
  const delta = kind === "entry" ? quantity : quantity - product.stock;
  if (delta === 0) return showToast("A quantidade informada é igual ao estoque atual.", "error");
  product.stock = kind === "entry" ? product.stock + quantity : quantity;
  current.movements.push({ id: crypto.randomUUID(), productId, date: new Date().toISOString(), delta, kind, reason });
  if (await commit(current, `Estoque de ${product.name} atualizado.`)) closeDialog();
}

async function handleCancelSale(form) {
  const data = new FormData(form);
  const saleId = String(data.get("id") || "");
  const reason = String(data.get("reason") || "").trim();
  if (!reason) return showToast("Informe o motivo do cancelamento.", "error");
  const current = structuredClone(state);
  const sale = current.sales.find(item => item.id === saleId && item.status === "completed");
  if (!sale) return showToast("Esta venda já foi cancelada ou não existe.", "error");
  sale.status = "cancelled";
  sale.cancelReason = reason;
  sale.cancelledAt = new Date().toISOString();
  sale.items.forEach(line => {
    const product = current.products.find(item => item.id === line.productId);
    if (product) product.stock += line.quantity;
    current.movements.push({ id: crypto.randomUUID(), productId: line.productId, date: sale.cancelledAt, delta: line.quantity, kind: "sale-return", reason: `Cancelamento ${sale.id}` });
  });
  if (await commit(current, `Venda ${saleId} cancelada e estoque devolvido.`)) closeDialog();
}

function showCustomerHistory(customerId) {
  const customer = state.customers.find(item => item.id === customerId);
  if (!customer) return showToast("Cliente não encontrado.", "error");
  const sales = state.sales.filter(sale => sale.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date));
  const table = sales.length ? `<div class="table-wrap"><table><thead><tr><th>VENDA</th><th>DATA</th><th>VALOR</th><th>STATUS</th></tr></thead><tbody>${sales.map(sale => `<tr><td><strong>${escapeHTML(sale.id)}</strong></td><td>${escapeHTML(formatDate(sale.date, true))}</td><td>${money(sale.total)}</td><td><span class="status-pill${sale.status === "cancelled" ? " cancelled" : ""}">${sale.status === "completed" ? "Concluída" : "Cancelada"}</span></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty-state"><div><span class="empty-symbol">↗</span><strong>Sem compras registradas</strong><p>As próximas vendas associadas aparecerão aqui.</p></div></div>`;
  openDialog(customer.name, `${customer.phone || "Sem telefone"} · histórico de compras`, `${table}<div class="dialog-actions"><button class="button button-secondary" type="button" data-action="close-dialog">Fechar</button><button class="button button-primary" type="button" data-action="edit-customer" data-id="${escapeHTML(customer.id)}">Editar cliente</button></div>`);
}

function showAuth(mode = "signin", message = "") {
  authMode = mode;
  authNotice = message;
  appShell.hidden = true;
  authScreen.hidden = false;
  const notice = message ? `<div class="auth-message" role="status">${escapeHTML(message)}</div>` : "";
  if (mode === "configuration") {
    authContent.innerHTML = `<p class="eyebrow">CONFIGURAÇÃO NECESSÁRIA</p><h1>Banco ainda não conectado</h1><p class="auth-description">A publicação está no servidor, mas não encontrou as chaves públicas do Supabase durante o build. Para proteger os dados, o modo demonstração fica desativado em produção.</p>${notice}<button class="button button-secondary auth-back" type="button" onclick="location.reload()">Tentar novamente</button>`;
    return;
  }
  if (mode === "setup") {
    authContent.innerHTML = `<p class="eyebrow">PRIMEIRO ACESSO</p><h1>Crie sua loja</h1><p class="auth-description">Esta conta será a proprietária. Depois, você poderá convidar sua equipe.</p>${notice}<form id="setup-store-form" class="auth-form"><label for="setup-store-name">Nome da loja</label><input id="setup-store-name" name="name" required maxlength="80" autocomplete="organization" placeholder="Ex.: Minha loja"><button class="button button-primary" type="submit">Criar minha loja</button></form><button class="auth-link" type="button" data-action="sign-out">Sair</button>`;
    return;
  }
  if (mode === "password") {
    authContent.innerHTML = `<p class="eyebrow">PROTEJA SUA CONTA</p><h1>Defina sua senha</h1><p class="auth-description">Crie uma senha para concluir o acesso à loja.</p>${notice}<form id="set-password-form" class="auth-form"><label for="new-password">Nova senha</label><input id="new-password" name="password" required type="password" minlength="10" autocomplete="new-password" placeholder="Pelo menos 10 caracteres"><label for="confirm-password">Confirme a senha</label><input id="confirm-password" name="confirmation" required type="password" minlength="10" autocomplete="new-password" placeholder="Digite a senha novamente"><button class="button button-primary" type="submit">Salvar senha e continuar</button></form><button class="auth-link" type="button" data-action="sign-out">Sair</button>`;
    return;
  }
  if (mode === "check-email") {
    authContent.innerHTML = `<p class="eyebrow">CONFIRA SEU E-MAIL</p><h1>Seu link está a caminho</h1><p class="auth-description">${notice}</p><button class="button button-secondary auth-back" type="button" data-auth-mode="signin">Voltar ao acesso</button>`;
    return;
  }
  if (mode === "reset-sent") {
    authContent.innerHTML = `<p class="eyebrow">RECUPERAÇÃO DE ACESSO</p><h1>Confira sua caixa de entrada</h1><p class="auth-description">${notice}</p><button class="button button-secondary auth-back" type="button" data-auth-mode="signin">Voltar ao acesso</button>`;
    return;
  }
  const reset = mode === "reset";
  authContent.innerHTML = `<p class="eyebrow">${reset ? "RECUPERAÇÃO DE ACESSO" : "BEM-VINDA À SUA LOJA"}</p><h1>${reset ? "Redefina sua senha" : "Entre no Balcão"}</h1><p class="auth-description">${reset ? "Enviaremos um link seguro para redefinir sua senha." : "Acesse sua loja com o convite que recebeu por e-mail."}</p>${notice}<form id="${reset ? "reset-password-form" : "signin-form"}" class="auth-form"><label for="auth-email">E-mail</label><input id="auth-email" name="email" required type="email" autocomplete="email" maxlength="254" placeholder="voce@email.com"><span class="auth-password-field"${reset ? ' hidden' : ""}><label for="auth-password">Senha</label><input id="auth-password" name="password" type="password" autocomplete="current-password" minlength="10" placeholder="Sua senha"></span><button class="button button-primary" type="submit">${reset ? "Enviar link de recuperação" : "Entrar"}</button>${reset ? "" : `<button class="button button-secondary" type="button" data-action="send-magic-link">Receber link de acesso por e-mail</button>`}</form>${reset ? `<button class="auth-link" type="button" data-auth-mode="signin">Voltar ao acesso</button>` : `<button class="auth-link" type="button" data-auth-mode="reset">Esqueci minha senha</button>`}`;
}

async function activateCloudUser(user) {
  const activation = ++authActivation;
  cloudUser = user;
  if (authNeedsPassword) {
    showAuth("password");
    return;
  }
  showAuth("signin", "Carregando os dados da sua loja…");
  try {
    const result = await cloudStore.loadForUser(user);
    if (activation !== authActivation) return;
    if (result.needsStore) {
      showAuth("setup");
      return;
    }
    state = result.state;
    storeRole = result.state.role;
    updateShell();
    authScreen.hidden = true;
    appShell.hidden = false;
    renderPage();
  } catch (error) {
    if (activation !== authActivation) return;
    console.error("Não foi possível carregar a loja do usuário.", error);
    showAuth("signin", error.message || "Não foi possível carregar a loja. Tente novamente.");
  }
}

async function handleAuthSubmit(form) {
  const data = new FormData(form);
  if (form.id === "signin-form") {
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    if (!password) return showAuth("signin", "Informe sua senha ou use o link de acesso por e-mail.");
    showAuth("signin", "Verificando seu acesso…");
    const { data: result, error } = await cloudStore.client.auth.signInWithPassword({ email, password });
    if (error) return showAuth("signin", "Não foi possível entrar. Confira o e-mail e a senha ou solicite um link de acesso.");
    await activateCloudUser(result.user);
  } else if (form.id === "setup-store-form") {
    const name = String(data.get("name") || "").trim();
    if (!name || name.length > 80) return showAuth("setup", "O nome da loja deve conter entre 1 e 80 caracteres.");
    showAuth("setup", "Criando sua loja…");
    try {
      state = await cloudStore.createStore(name, cloudUser);
      storeRole = state.role;
      authScreen.hidden = true;
      appShell.hidden = false;
      updateShell();
      renderPage();
    } catch (error) {
      console.error("Não foi possível criar a loja inicial.", error);
      showAuth("setup", error.message || "Não foi possível criar a loja. Tente novamente.");
    }
  } else if (form.id === "set-password-form") {
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (password.length < 10) return showAuth("password", "Escolha uma senha com pelo menos 10 caracteres.");
    if (password !== confirmation) return showAuth("password", "As senhas não são iguais.");
    const { error } = await cloudStore.client.auth.updateUser({ password });
    if (error) return showAuth("password", "Não foi possível salvar a senha. Solicite um novo link de acesso.");
    authNeedsPassword = false;
    window.history.replaceState({}, document.title, window.location.pathname);
    const { data: result } = await cloudStore.client.auth.getUser();
    if (result.user) await activateCloudUser(result.user);
  } else if (form.id === "reset-password-form") {
    const email = String(data.get("email") || "").trim().toLowerCase();
    const resetRedirect = new URL("/", window.location.origin);
    resetRedirect.searchParams.set("flow", "recovery");
    const { error } = await cloudStore.client.auth.resetPasswordForEmail(email, { redirectTo: resetRedirect.toString() });
    if (error) return showAuth("reset", "Não foi possível enviar o link agora. Confira o e-mail e tente novamente.");
    showAuth("reset-sent", "Se esse endereço pertence a uma conta convidada, você receberá instruções de recuperação.");
  }
}

async function sendMagicLink() {
  const email = String($("#auth-email")?.value || "").trim().toLowerCase();
  if (!email) return showAuth("signin", "Informe seu e-mail para receber o link de acesso.");
  const { error } = await cloudStore.client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: window.location.origin }
  });
  if (error) return showAuth("signin", "Não foi possível enviar o link. Confirme que o e-mail foi convidado para a loja e tente novamente.");
  showAuth("check-email", `Enviamos um link de acesso para ${email}. O cadastro público está desativado; o endereço precisa ter sido convidado para a loja.`);
}

async function inviteTeamMember(form) {
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim().toLowerCase();
  const role = String(data.get("role") || "");
  const { data: sessionResult, error: sessionError } = await cloudStore.client.auth.getSession();
  if (sessionError || !sessionResult.session) return showToast("Sua sessão expirou. Entre novamente para convidar pessoas.", "error");
  const button = $('button[type="submit"]', form);
  button.disabled = true;
  try {
    const response = await fetch("/api/invite", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionResult.session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, role, store_id: state.storeId })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Não foi possível enviar o convite.");
    closeDialog();
    showToast(`Convite enviado para ${email}.`);
  } catch (error) {
    console.error("Não foi possível enviar o convite da equipe.", error);
    showToast(error.message || "Falha ao enviar o convite.", "error");
  } finally {
    button.disabled = false;
  }
}

function startCloudApp(url, anonKey) {
  cloudStore = createCloudStore(url, anonKey);
  authScreen.hidden = false;
  appShell.hidden = true;
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const flow = new URLSearchParams(window.location.search).get("flow");
  authNeedsPassword = flow === "invite" || flow === "recovery" || ["invite", "recovery"].includes(hash.get("type"));
  cloudStore.client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") authNeedsPassword = true;
    if (event === "SIGNED_OUT") {
      authActivation += 1;
      state = null;
      cloudUser = null;
      storeRole = null;
      showAuth("signin", "Você saiu da sua conta.");
    } else if (session && ["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED", "PASSWORD_RECOVERY", "USER_UPDATED"].includes(event)) {
      if (event === "TOKEN_REFRESHED" && state?.cloud) return;
      queueMicrotask(() => activateCloudUser(session.user));
    }
  });
  cloudStore.client.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Não foi possível verificar a sessão do usuário.", error);
      return showAuth("signin", "Não foi possível verificar sua sessão. Tente novamente.");
    }
    if (data.session) activateCloudUser(data.session.user);
    else showAuth("signin");
  }).catch(error => {
    console.error("Não foi possível iniciar a sessão segura.", error);
    showAuth("signin", "Não foi possível conectar ao serviço de autenticação.");
  });
}

function resetDemo() {
  const replacement = demoState();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replacement));
    state = replacement;
    cart = [];
    selectedCustomer = "";
    currentPage = "inicio";
    productQuery = "";
    customerQuery = "";
    salesQuery = "";
    closeDialog();
    updateShell();
    renderPage();
    showToast("Demonstração restaurada.");
  } catch (error) {
    console.error("Não foi possível restaurar os dados da demonstração.", error);
    showToast("Não foi possível restaurar a demonstração.", "error");
  }
}

document.addEventListener("click", async event => {
  const pageButton = event.target.closest("[data-page]");
  if (pageButton) {
    navigate(pageButton.dataset.page);
    return;
  }
  const categoryButton = event.target.closest("[data-category]");
  if (categoryButton) {
    posCategory = categoryButton.dataset.category;
    renderPOS();
    return;
  }
  const filterButton = event.target.closest("[data-sales-filter]");
  if (filterButton) {
    salesFilter = filterButton.dataset.salesFilter;
    renderSales();
    return;
  }
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const { action, id } = actionButton.dataset;
  if (action === "close-dialog") closeDialog();
  else if (action === "receipt-done") { closeDialog(); navigate("vendas"); }
  else if (action === "settings") settingsDialog();
  else if (action === "manage-categories") categoryManagerDialog();
  else if (action === "delete-category") {
    const productCount = state.products.filter(product => product.category === id).length;
    if (productCount) return showToast("Reclassifique os produtos antes de apagar esta categoria.", "error");
    if (state.categories.length <= 1) return showToast("Mantenha ao menos uma categoria cadastrada.", "error");
    const current = structuredClone(state);
    current.categories = current.categories.filter(category => category !== id);
    if (await commit(current, `Categoria “${id}” apagada.`)) {
      if (posCategory === id) posCategory = "Todos";
      categoryManagerDialog();
    }
  }
  else if (action === "add-product") productForm();
  else if (action === "edit-product") productForm(state.products.find(product => product.id === id));
  else if (action === "toggle-product") {
    const current = structuredClone(state);
    const product = current.products.find(item => item.id === id);
    if (!product) return showToast("Produto não encontrado.", "error");
    product.active = !product.active;
    await commit(current, product.active ? "Produto ativado." : "Produto arquivado.");
  } else if (action === "adjust-stock") adjustStockDialog(state.products.find(product => product.id === id));
  else if (action === "adjust-stock-list") adjustStockDialog();
  else if (action === "add-customer") customerForm();
  else if (action === "edit-customer") { closeDialog(); customerForm(state.customers.find(customer => customer.id === id)); }
  else if (action === "customer-history") showCustomerHistory(id);
  else if (action === "add-to-cart") addToCart(id);
  else if (action === "cart-quantity") changeCartQuantity(id, Number(actionButton.dataset.delta));
  else if (action === "clear-cart") { cart = []; renderPOS(); }
  else if (action === "checkout") checkoutDialog();
  else if (action === "cancel-sale") {
    const sale = state.sales.find(item => item.id === id);
    if (sale) cancelSaleDialog(sale);
  }   else if (action === "reset-demo") confirmResetDemo();
  else if (action === "confirm-reset-demo") resetDemo();
  else if (action === "sign-out") {
    if (cloudStore) {
      try {
        const { error } = await cloudStore.client.auth.signOut();
        if (error) showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
      } catch (error) {
        console.error("Não foi possível encerrar a sessão.", error);
        showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
      }
    } else closeDialog();
  } else if (action === "send-magic-link") {
    try {
      await sendMagicLink();
    } catch (error) {
      console.error("Não foi possível enviar o link de acesso.", error);
      showAuth("signin", "Não foi possível enviar o link. Confira o SMTP e o e-mail convidado.");
    }
  }
});

document.addEventListener("submit", async event => {
  event.preventDefault();
  const formId = event.target.getAttribute("id");
  if (formId === "signin-form" || formId === "setup-store-form" || formId === "set-password-form" || formId === "reset-password-form") {
    try {
      await handleAuthSubmit(event.target);
    } catch (error) {
      console.error("A solicitação de autenticação falhou.", error);
      showAuth(authMode, "Não foi possível concluir a solicitação. Verifique a conexão e tente novamente.");
    }
  } else if (formId === "invite-form") {
    await inviteTeamMember(event.target);
  } else if (formId === "category-form") {
    const name = String(new FormData(event.target).get("name") || "").trim();
    if (!name || name.length > 40 || name.toLocaleLowerCase("pt-BR") === "todos") return showToast("Informe um nome de categoria válido (até 40 caracteres).", "error");
    if (state.categories.some(category => category.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
      return showToast("Já existe uma categoria com esse nome.", "error");
    }
    const current = structuredClone(state);
    current.categories.push(name);
    if (await commit(current, `Categoria “${name}” cadastrada.`)) categoryManagerDialog();
  } else if (formId === "product-form") await handleProductSubmit(event.target);
  else if (formId === "customer-form") await handleCustomerSubmit(event.target);
  else if (formId === "stock-form") await handleStockSubmit(event.target);
  else if (formId === "checkout-form") await completeSale(event.target);
  else if (formId === "cancel-sale-form") await handleCancelSale(event.target);
  else if (formId === "settings-form") {
    const name = String(new FormData(event.target).get("storeName") || "").trim();
    if (!name) return showToast("Informe o nome da loja.", "error");
    const current = structuredClone(state);
    current.storeName = name;
    if (await commit(current, "Nome da loja atualizado.")) closeDialog();
  }
});

document.addEventListener("click", event => {
  const modeButton = event.target.closest("[data-auth-mode]");
  if (modeButton) showAuth(modeButton.dataset.authMode);
});

document.addEventListener("input", event => {
  if (event.target.id === "product-search") {
    productQuery = event.target.value;
    renderProducts();
    $("#product-search")?.focus();
    const input = $("#product-search");
    input?.setSelectionRange(productQuery.length, productQuery.length);
  } else if (event.target.id === "sales-search") {
    salesQuery = event.target.value;
    renderSales();
    const input = $("#sales-search");
    input?.focus();
    input?.setSelectionRange(salesQuery.length, salesQuery.length);
  } else if (event.target.id === "customer-search") {
    customerQuery = event.target.value;
    renderCustomers();
    const input = $("#customer-search");
    input?.focus();
    input?.setSelectionRange(customerQuery.length, customerQuery.length);
  } else if (event.target.id === "pos-search") {
    productQuery = event.target.value;
    renderPOS();
    const input = $("#pos-search");
    input?.focus();
    input?.setSelectionRange(productQuery.length, productQuery.length);
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "product-filter") {
    productFilter = event.target.value;
    renderProducts();
  } else if (event.target.id === "pos-customer") {
    selectedCustomer = event.target.value;
  } else if (event.target.id === "sales-period") {
    salesPeriod = event.target.value;
    renderSales();
  }
});

$("#mobile-menu").addEventListener("click", () => {
  $("#sidebar").classList.add("is-open");
  $("#mobile-scrim").classList.add("is-open");
});
$("#mobile-scrim").addEventListener("click", closeMobileMenu);
dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});
document.addEventListener("keydown", event => {
  if (event.key === "F2") {
    event.preventDefault();
    navigate("pdv");
  } else if (event.key === "Escape") closeMobileMenu();
});

const hasSupabaseConfig = typeof __SUPABASE_URL__ !== "undefined" && Boolean(__SUPABASE_URL__) && typeof __SUPABASE_ANON_KEY__ !== "undefined" && Boolean(__SUPABASE_ANON_KEY__);
if (hasSupabaseConfig) {
  startCloudApp(__SUPABASE_URL__, __SUPABASE_ANON_KEY__);
} else if (typeof __APP_PRODUCTION__ !== "undefined" && __APP_PRODUCTION__) {
  showAuth("configuration");
} else {
  try {
    state = loadState();
    updateShell();
    renderPage();
    authScreen.hidden = true;
    appShell.hidden = false;
  } catch (error) {
    console.error("Falha ao carregar os dados do Balcão.", error);
    pageContent.innerHTML = `<section class="panel"><div class="empty-state"><div><span class="empty-symbol">!</span><strong>Não foi possível abrir os dados desta loja</strong><p>${escapeHTML(error.message)} Não removemos nem substituímos os dados salvos.</p><button class="button button-secondary" style="margin-top:15px" type="button" onclick="location.reload()">Tentar novamente</button></div></div></section>`;
  }
}
