import test from "node:test";
import assert from "node:assert/strict";
import { calculateSalesAnalytics, estimatePaymentFeeCents } from "../sales-analytics.js";

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

test("estimates card fees by debit and credit rate, rounded to cents", () => {
  assert.equal(estimatePaymentFeeCents(1250, "Cartão de débito", { debitPercent: 1.5 }), 19);
  assert.equal(estimatePaymentFeeCents(1250, "Cartão de crédito", { creditPercent: 2.4 }), 30);
  assert.equal(estimatePaymentFeeCents(1250, "Pix", { debitPercent: 1.5, creditPercent: 2.4 }), 0);
  assert.equal(estimatePaymentFeeCents(1250, "Cartão", { debitPercent: 1.5, creditPercent: 2.4 }), 0);
  assert.equal(estimatePaymentFeeCents(1250, "Cartão de crédito"), 0);
});

test("separates gross revenue, estimated card fees, and net revenue", () => {
  const result = calculateSalesAnalytics([
    { date: today, status: "completed", total: 10001, payment: "Cartão de débito", items: [] },
    { date: today, status: "completed", total: 10001, payment: "Cartão de crédito", items: [] },
    { date: today, status: "completed", total: 3000, payment: "Cartão", items: [] },
    { date: today, status: "completed", total: 1000, payment: "Dinheiro", items: [] },
    { date: today, status: "cancelled", total: 5000, payment: "Cartão de crédito", items: [] }
  ], 30, today, { debitPercent: 1.5, creditPercent: 2 });

  assert.equal(result.revenueCents, 24002);
  assert.equal(result.paymentFeeCents, 350);
  assert.equal(result.netRevenueCents, 23652);
  assert.equal(result.unestimatedLegacyCardCents, 3000);
  assert.equal(result.paymentFeeIsPartial, true);
});

test("reports gross revenue before discounts and subtracts discounts from profit", () => {
  const result = calculateSalesAnalytics([
    {
      date: today,
      status: "completed",
      total: 900,
      discountCents: 100,
      payment: "Cartão de crédito",
      items: [{ name: "Produto", price: 1000, cost: 400, quantity: 1 }]
    }
  ], 30, today, { creditPercent: 2 });

  assert.equal(result.revenueCents, 1000);
  assert.equal(result.collectedRevenueCents, 900);
  assert.equal(result.discountCents, 100);
  assert.equal(result.paymentFeeCents, 18);
  assert.equal(result.netRevenueCents, 882);
  assert.equal(result.grossProfitCents, 500);
  assert.equal(result.averageTicketCents, 900);
  assert.equal(result.trend.reduce((total, bucket) => total + bucket.value, 0), 1000);
});

test("rejects invalid fee rates and sale amounts", () => {
  assert.throws(() => estimatePaymentFeeCents(100, "Cartão de crédito", { creditPercent: 101 }), RangeError);
  assert.throws(() => estimatePaymentFeeCents(-1, "Dinheiro"), RangeError);
  assert.throws(() => calculateSalesAnalytics([], 30, today, { debitPercent: Number.NaN }), RangeError);
});
