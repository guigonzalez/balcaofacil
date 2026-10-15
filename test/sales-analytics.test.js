import test from "node:test";
import assert from "node:assert/strict";
import { calculateSalesAnalytics } from "../sales-analytics.js";

const today = new Date(2026, 9, 15, 12);

test("summarizes completed sales for the selected local calendar period", () => {
  const result = calculateSalesAnalytics([
    { date: new Date(2026, 9, 15, 9), status: "completed", total: 1200, payment: "Pix", items: [] },
    { date: new Date(2026, 9, 9, 9), status: "completed", total: 800, payment: "Dinheiro", items: [] },
    { date: new Date(2026, 9, 8, 23), status: "completed", total: 5000, payment: "Pix", items: [] },
    { date: new Date(2026, 9, 15, 10), status: "cancelled", total: 3000, payment: "Cartão", items: [] }
  ], 7, today);

  assert.equal(result.completedCount, 2);
  assert.equal(result.cancelledCount, 1);
  assert.equal(result.revenueCents, 2000);
  assert.equal(result.averageTicketCents, 1000);
  assert.equal(result.trend.length, 7);
  assert.equal(result.payments.length, 2);
});

test("includes imported profit and marks estimates with missing cost data as partial", () => {
  const result = calculateSalesAnalytics([
    { date: today, status: "completed", total: 5000, payment: "Pix", importSource: "Kyte", importProfitCents: 1500, items: [] },
    { date: today, status: "completed", total: 1000, payment: "Pix", items: [{ name: "Produto", price: 1000, cost: null, quantity: 1 }] }
  ], 30, today);

  assert.equal(result.grossProfitCents, 1500);
  assert.equal(result.profitIsPartial, true);
});

test("ranks itemized products by units sold and computes their item revenue", () => {
  const result = calculateSalesAnalytics([
    { date: today, status: "completed", total: 4500, payment: "Pix", items: [
      { productId: "a", name: "Caneca", price: 1500, cost: 500, quantity: 2 },
      { productId: "b", name: "Caderno", price: 1500, cost: 700, quantity: 1 }
    ] }
  ], 7, today);

  assert.equal(result.topProducts[0].name, "Caneca");
  assert.equal(result.topProducts[0].quantity, 2);
  assert.equal(result.topProducts[0].revenueCents, 3000);
});

test("rejects unsupported analysis periods", () => {
  assert.throws(() => calculateSalesAnalytics([], 14, today), RangeError);
});
