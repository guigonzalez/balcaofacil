import test from "node:test";
import assert from "node:assert/strict";
import { cashEntryStatus, salesToCashEntries, summarizeCashFlow } from "../cash-flow.js";

const now = new Date(2026, 9, 15, 12);

test("classifies open, overdue, and settled accounts using local calendar dates", () => {
  assert.equal(cashEntryStatus({ dueDate: "2026-10-15", settledAt: null }, now), "open");
  assert.equal(cashEntryStatus({ dueDate: "2026-10-14", settledAt: null }, now), "overdue");
  assert.equal(cashEntryStatus({ dueDate: "2026-10-10", settledAt: "2026-10-15T10:00:00Z" }, now), "settled");
});

test("summarizes open balances, overdue accounts, and settled movement for the month", () => {
  const summary = summarizeCashFlow([
    { direction: "payable", amountCents: 12000, dueDate: "2026-10-20", settledAt: null },
    { direction: "receivable", amountCents: 8000, dueDate: "2026-10-14", settledAt: null },
    { direction: "payable", amountCents: 3000, dueDate: "2026-10-01", settledAt: null },
    { direction: "receivable", amountCents: 20000, dueDate: "2026-10-01", settledAt: "2026-10-12T12:00:00" },
    { direction: "payable", amountCents: 5000, dueDate: "2026-09-30", settledAt: "2026-10-05T12:00:00" },
    { direction: "receivable", amountCents: 10000, dueDate: "2026-09-30", settledAt: "2026-09-30T12:00:00" }
  ], now);

  assert.equal(summary.openPayablesCents, 15000);
  assert.equal(summary.openReceivablesCents, 8000);
  assert.equal(summary.overdueCents, 11000);
  assert.equal(summary.overdueCount, 2);
  assert.equal(summary.projectedBalanceCents, -7000);
  assert.equal(summary.settledReceivablesThisMonthCents, 20000);
  assert.equal(summary.settledPayablesThisMonthCents, 5000);
  assert.equal(summary.settledBalanceThisMonthCents, 15000);
});

test("returns zeroed totals for an empty cash flow", () => {
  assert.deepEqual(summarizeCashFlow([], now), {
    openPayablesCents: 0,
    openReceivablesCents: 0,
    overdueCents: 0,
    overdueCount: 0,
    settledPayablesThisMonthCents: 0,
    settledReceivablesThisMonthCents: 0,
    projectedBalanceCents: 0,
    settledBalanceThisMonthCents: 0
  });
});

test("includes completed sales as settled cash receipts and excludes cancelled sales", () => {
  const entries = salesToCashEntries([
    {
      id: "VD-1",
      date: "2026-10-12T15:30:00",
      customerId: "customer-1",
      payment: "Pix",
      status: "completed",
      total: 12500
    },
    {
      id: "KY-2",
      date: "2026-10-13T15:30:00",
      customerId: "",
      customerName: "Cliente importado",
      payment: "Dinheiro",
      status: "completed",
      total: 5000
    },
    {
      id: "VD-3",
      date: "2026-10-14T15:30:00",
      customerId: "customer-1",
      payment: "Pix",
      status: "cancelled",
      total: 8000
    }
  ], [{ id: "customer-1", name: "Marina Costa" }]);

  assert.deepEqual(entries, [
    {
      id: "sale:VD-1",
      source: "sale",
      direction: "receivable",
      description: "Venda VD-1",
      counterparty: "Marina Costa",
      category: "Venda",
      amountCents: 12500,
      dueDate: "2026-10-12",
      paymentMethod: "Pix",
      settledAt: "2026-10-12T15:30:00"
    },
    {
      id: "sale:KY-2",
      source: "sale",
      direction: "receivable",
      description: "Venda KY-2",
      counterparty: "Cliente importado",
      category: "Venda",
      amountCents: 5000,
      dueDate: "2026-10-13",
      paymentMethod: "Dinheiro",
      settledAt: "2026-10-13T15:30:00"
    }
  ]);

  const summary = summarizeCashFlow(entries, now);
  assert.equal(summary.settledReceivablesThisMonthCents, 17500);
  assert.equal(summary.openReceivablesCents, 0);
});

test("ignores sales without a valid date or a positive integer amount", () => {
  assert.deepEqual(salesToCashEntries([
    { id: "invalid-date", date: "not a date", status: "completed", total: 1000 },
    { id: "zero-total", date: "2026-10-12T15:30:00", status: "completed", total: 0 },
    { id: "fractional-total", date: "2026-10-12T15:30:00", status: "completed", total: 100.5 }
  ], []), []);
});
