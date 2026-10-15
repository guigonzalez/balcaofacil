import test from "node:test";
import assert from "node:assert/strict";
import { cashEntryStatus, summarizeCashFlow } from "../cash-flow.js";

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
