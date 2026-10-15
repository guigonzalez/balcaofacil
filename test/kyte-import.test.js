import assert from "node:assert/strict";
import test from "node:test";
import { parseCsv, parseKyteProductsCsv, parseKyteSalesCsv } from "../kyte-import.js";

test("parses quoted CSV fields, commas and line breaks", () => {
  const rows = parseCsv('Nome,Detalhes\r\n"Produto, especial","linha 1\nlinha 2"\r\n');
  assert.deepEqual(rows, [{ Nome: "Produto, especial", Detalhes: "linha 1\nlinha 2" }]);
});

test("maps Kyte product prices, blank categories and negative stock safely", () => {
  const csv = [
    '"Código","Nome","Categoria","Estoque Atual","Estoque Minimo","Preço de Custo","Preço de Venda"',
    '"","Produto A","","-2","1","5,11","15,50"',
    '"","Produto A","","3","2","5,11","15,50"'
  ].join("\n");
  const result = parseKyteProductsCsv(csv);
  assert.equal(result.rowCount, 2);
  assert.equal(result.records[0].category, "Sem categoria");
  assert.equal(result.records[0].costCents, 511);
  assert.equal(result.records[0].priceCents, 1550);
  assert.equal(result.records[0].stock, 0);
  assert.deepEqual(result.negativeStockProducts, ["Produto A"]);
  assert.notEqual(result.records[0].sourceKey, result.records[1].sourceKey);
});

test("maps sale methods and preserves zero-total historical sales", () => {
  const csv = [
    '"Número","Status","Data/Hora","Total de itens","Descri. itens","Total","Lucro","Meios de Pagamento","Cliente"',
    '"3-1","Venda","07/08/2026 14:59","2","1xProduto A, 1xProduto B","0","-2,50","Cartão de Débito","Cliente Teste"'
  ].join("\n");
  const result = parseKyteSalesCsv(csv);
  assert.equal(result.records[0].sourceKey, 'kyte-sale:"3-1"');
  assert.equal(result.records[0].payment, "Cartão");
  assert.equal(result.records[0].totalCents, 0);
  assert.equal(result.records[0].profitCents, -250);
  assert.equal(result.records[0].itemCount, 2);
  assert.match(result.records[0].date, /^2026-08-07T/);
});

test("rejects malformed CSV rows, duplicate product codes and duplicate sale references", () => {
  assert.throws(() => parseCsv("A,B\n1\n"), /eram esperadas 2/);
  const duplicateProducts = '"Código","Nome","Categoria","Estoque Atual","Estoque Minimo","Preço de Custo","Preço de Venda"\n"SKU-1","A","Casa","0","1","1","2"\n"sku-1","B","Casa","0","1","1","2"';
  assert.throws(() => parseKyteProductsCsv(duplicateProducts), /código de produto duplicado/);
  const duplicateSales = '"Número","Status","Data/Hora","Total de itens","Descri. itens","Total","Lucro","Meios de Pagamento","Cliente"\n"3-1","Venda","07/08/2026 14:59","1","1xA","2","1","Pix",""\n"3-1","Venda","07/08/2026 15:00","1","1xA","2","1","Pix",""';
  assert.throws(() => parseKyteSalesCsv(duplicateSales), /número de venda duplicado/);
});

test("rejects invalid calendar dates and unknown payment types", () => {
  const header = '"Número","Status","Data/Hora","Total de itens","Descri. itens","Total","Lucro","Meios de Pagamento","Cliente"\n';
  assert.throws(() => parseKyteSalesCsv(`${header}"1","Venda","31/02/2026 14:00","1","1xA","10","1","Pix",""`), /data inválida/);
  assert.throws(() => parseKyteSalesCsv(`${header}"1","Venda","07/08/2026 14:00","1","1xA","10","1","Vale-presente",""`), /forma de pagamento não reconhecida/);
});
