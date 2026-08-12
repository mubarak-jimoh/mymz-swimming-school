import test from "node:test";
import assert from "node:assert/strict";
import { formatLessonPrice, isPriceUnit, PRICE_UNITS } from "../lib/pricing.ts";

test("monthly catalogue pricing formats naturally", () => {
  assert.equal(formatLessonPrice({ price_pence: 8500, price_unit: "per_month", price_from: false, currency: "GBP" }), "£85 / month");
  assert.equal(formatLessonPrice({ price_pence: 8500, price_unit: "per_month", price_from: true, currency: "GBP" }), "From £85 / month");
});

test("monthly pricing preserves existing units and unset-price behaviour", () => {
  assert.deepEqual(PRICE_UNITS.map(unit => unit.value), ["lesson", "swimmer", "block", "term", "per_month"]);
  for (const unit of PRICE_UNITS) assert.equal(isPriceUnit(unit.value), true);
  assert.equal(isPriceUnit("subscription"), false);
  assert.equal(formatLessonPrice({ price_pence: null, price_unit: "per_month", price_from: true, currency: "GBP" }), "Contact us");
});
