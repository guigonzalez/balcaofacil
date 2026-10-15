import test from "node:test";
import assert from "node:assert/strict";
import { calculateDiscountCents } from "../sale-discount.js";

test("calculates fixed discounts in cents without exceeding the subtotal", () => {
  assert.equal(calculateDiscountCents(1250, "amount", 250), 250);
  assert.equal(calculateDiscountCents(1250, "amount", 1250), 1250);
  assert.equal(calculateDiscountCents(1250, "amount", 0), 0);
});

test("calculates percentage discounts rounded to the nearest cent", () => {
  assert.equal(calculateDiscountCents(1250, "percent", 10), 125);
  assert.equal(calculateDiscountCents(1250, "percent", 12.5), 156);
  assert.equal(calculateDiscountCents(1250, "percent", 100), 1250);
  assert.equal(calculateDiscountCents(50, "percent", 29), 15);
});

test("rejects invalid subtotal, discount amounts, percentages, and types", () => {
  assert.throws(() => calculateDiscountCents(-1, "amount", 0), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "amount", 1001), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "amount", 1.5), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "percent", 100.01), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "percent", 1.001), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "percent", Number.NaN), RangeError);
  assert.throws(() => calculateDiscountCents(1000, "unknown", 10), RangeError);
});
