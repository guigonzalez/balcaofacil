function detectDelimiter(text) {
  const firstLine = text.slice(0, text.search(/\r?\n/) < 0 ? text.length : text.search(/\r?\n/));
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  for (let index = 0; index < firstLine.length; index += 1) {
    const character = firstLine[index];
    if (character === '"' && firstLine[index + 1] === '"' && quoted) {
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === ",") {
      commas += 1;
    } else if (!quoted && character === ";") {
      semicolons += 1;
    }
  }
  return semicolons > commas ? ";" : ",";
}

export function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(source);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(field);
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(value => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("O CSV termina com um campo entre aspas sem fechamento.");
  if (field || row.length) {
    row.push(field);
    if (row.some(value => value.trim() !== "")) rows.push(row);
  }
  if (rows.length < 2) throw new Error("O arquivo precisa ter cabeçalho e ao menos uma linha de dados.");

  const headers = rows[0].map(header => header.trim());
  if (headers.some(header => !header) || new Set(headers).size !== headers.length) {
    throw new Error("O cabeçalho do CSV tem nomes vazios ou repetidos.");
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`A linha ${index + 2} tem ${values.length} colunas; eram esperadas ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column].trim()]));
  });
}

function requireColumns(rows, required, fileLabel) {
  const headers = new Set(Object.keys(rows[0] ?? {}));
  const missing = required.filter(column => !headers.has(column));
  if (missing.length) throw new Error(`${fileLabel}: faltam as colunas ${missing.map(column => `“${column}”`).join(", ")}.`);
}

function parseMoney(value, label, rowNumber, { allowNegative = false } = {}) {
  const raw = String(value ?? "").trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || (!allowNegative && amount < 0)) {
    throw new Error(`Linha ${rowNumber}: valor inválido em “${label}”.`);
  }
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) throw new Error(`Linha ${rowNumber}: valor fora do limite em “${label}”.`);
  return cents;
}

function parseWholeNumber(value, label, rowNumber, { allowBlank = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    if (allowBlank) return 0;
    throw new Error(`Linha ${rowNumber}: quantidade vazia em “${label}”.`);
  }
  const number = Number(raw.replace(",", "."));
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new Error(`Linha ${rowNumber}: quantidade inválida em “${label}”.`);
  }
  return number;
}

function normalizeIdentity(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("pt-BR");
}

export function parseKyteProductsCsv(text) {
  const rows = parseCsv(text);
  requireColumns(rows, ["Código", "Nome", "Categoria", "Estoque Atual", "Estoque Minimo", "Preço de Custo", "Preço de Venda"], "Produtos");
  const occurrences = new Map();
  const seenCodes = new Set();
  const negativeStockProducts = [];
  const records = rows.map((row, index) => {
    const rowNumber = index + 2;
    const name = row.Nome.trim();
    const category = row.Categoria.trim() || "Sem categoria";
    if (!name || name.length > 100) throw new Error(`Linha ${rowNumber}: nome do produto vazio ou maior que 100 caracteres.`);
    if (category.length > 100 || category.toLocaleLowerCase("pt-BR") === "todos") {
      throw new Error(`Linha ${rowNumber}: categoria inválida.`);
    }
    const priceCents = parseMoney(row["Preço de Venda"], "Preço de Venda", rowNumber);
    const costCents = parseMoney(row["Preço de Custo"], "Preço de Custo", rowNumber);
    if (!priceCents || priceCents <= 0) throw new Error(`Linha ${rowNumber}: o preço de venda precisa ser maior que zero.`);
    const stockValue = Number(row["Estoque Atual"].trim().replace(",", "."));
    if (!Number.isSafeInteger(stockValue)) throw new Error(`Linha ${rowNumber}: quantidade inválida em “Estoque Atual”.`);
    if (stockValue < 0) negativeStockProducts.push(name);
    const stock = Math.max(0, stockValue);
    const lowStock = parseWholeNumber(row["Estoque Minimo"], "Estoque Minimo", rowNumber);
    const sku = row.Código.trim();
    const normalizedSku = normalizeIdentity(sku);
    if (normalizedSku && seenCodes.has(normalizedSku)) throw new Error(`Linha ${rowNumber}: código de produto duplicado (“${sku}”).`);
    if (normalizedSku) seenCodes.add(normalizedSku);
    const signature = sku
      ? JSON.stringify(["code", normalizedSku])
      : JSON.stringify(["name", normalizeIdentity(name), normalizeIdentity(category), priceCents, costCents]);
    const occurrence = occurrences.get(signature) ?? 0;
    occurrences.set(signature, occurrence + 1);

    return {
      sourceKey: `kyte-product:${signature}|copy:${occurrence + 1}`,
      name,
      sku,
      category,
      priceCents,
      costCents,
      stock,
      lowStock
    };
  });
  return { records, rowCount: rows.length, negativeStockProducts };
}

function parseKyteDate(value, rowNumber) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`Linha ${rowNumber}: data inválida em “Data/Hora”.`);
  const [, dayText, monthText, yearText, hourText, minuteText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || hour > 23 || minute > 59) {
    throw new Error(`Linha ${rowNumber}: data inválida em “Data/Hora”.`);
  }
  return date.toISOString();
}

function parsePayment(value, rowNumber) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "pix") return "Pix";
  if (normalized === "dinheiro") return "Dinheiro";
  if (normalized.includes("cartão") || normalized.includes("cartao")) return "Cartão";
  if (normalized === "outros" || normalized === "outro") return "Outro";
  throw new Error(`Linha ${rowNumber}: forma de pagamento não reconhecida (“${value}”).`);
}

function parseSaleStatus(value, rowNumber) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");
  if (["venda", "concluída", "concluida", "concluído", "concluido"].includes(normalized)) return "completed";
  if (["cancelada", "cancelado", "cancelamento", "devolvida", "devolvido", "estornada", "estornado"].includes(normalized)) return "cancelled";
  throw new Error(`Linha ${rowNumber}: status de venda não reconhecido (“${value}”).`);
}

export function parseKyteSalesCsv(text) {
  const rows = parseCsv(text);
  requireColumns(rows, ["Número", "Status", "Data/Hora", "Total de itens", "Descri. itens", "Total", "Lucro", "Meios de Pagamento", "Cliente"], "Vendas");
  const seenReferences = new Set();
  const records = rows.map((row, index) => {
    const rowNumber = index + 2;
    const reference = row.Número.trim();
    if (!reference) throw new Error(`Linha ${rowNumber}: número de venda vazio.`);
    const sourceKey = `kyte-sale:${JSON.stringify(normalizeIdentity(reference))}`;
    if (seenReferences.has(sourceKey)) throw new Error(`Linha ${rowNumber}: número de venda duplicado (“${reference}”).`);
    seenReferences.add(sourceKey);
    const totalCents = parseMoney(row.Total, "Total", rowNumber);
    if (totalCents === null || totalCents < 0) throw new Error(`Linha ${rowNumber}: total da venda inválido.`);
    const itemCount = parseWholeNumber(row["Total de itens"], "Total de itens", rowNumber);
    if (!itemCount) throw new Error(`Linha ${rowNumber}: a venda precisa ter ao menos um item.`);

    return {
      sourceKey,
      reference,
      status: parseSaleStatus(row.Status, rowNumber),
      date: parseKyteDate(row["Data/Hora"], rowNumber),
      totalCents,
      profitCents: parseMoney(row.Lucro, "Lucro", rowNumber, { allowNegative: true }),
      payment: parsePayment(row["Meios de Pagamento"], rowNumber),
      customerName: row.Cliente.trim(),
      details: row["Descri. itens"].trim(),
      itemCount
    };
  });
  return { records, rowCount: rows.length };
}
