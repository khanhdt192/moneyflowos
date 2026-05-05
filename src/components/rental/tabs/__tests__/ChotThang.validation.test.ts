import test from "node:test";
import assert from "node:assert/strict";

type BillStatus = "confirmed" | "partial_paid" | "paid" | "cancelled" | "draft" | null;

function canEditBillingInputs(occupied: boolean, billStatus: BillStatus): boolean {
  if (!occupied) return false;
  return !billStatus || billStatus === "draft";
}

function sanitizeDigitsInput(value: string): string {
  return value.replace(/\D/g, "");
}

function formatMoneyInput(value: string): string {
  const digits = sanitizeDigitsInput(value);
  if (!digits) return "";
  return Number.parseInt(digits, 10).toLocaleString("vi-VN");
}

function parseMoneyInput(value: string): number | null {
  const digits = sanitizeDigitsInput(value);
  if (!digits) return null;
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function isDigitsOnly(value: string): boolean {
  return /^\d*$/.test(value);
}

function parseNonNegativeInteger(value: string): number | null {
  if (!isDigitsOnly(value)) return null;
  if (value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function isValidReadingRange(start: number, end: number): boolean {
  return end >= start;
}

function isValidPaymentAmount(amount: number, remaining: number): boolean {
  if (!Number.isFinite(amount)) return false;
  if (amount <= 0) return false;
  if (amount > remaining + 0.5) return false;
  return true;
}

test("bill edit lock rule", () => {
  assert.equal(canEditBillingInputs(true, null), true);
  assert.equal(canEditBillingInputs(true, "draft"), true);
  assert.equal(canEditBillingInputs(true, "confirmed"), false);
  assert.equal(canEditBillingInputs(true, "partial_paid"), false);
  assert.equal(canEditBillingInputs(true, "paid"), false);
  assert.equal(canEditBillingInputs(true, "cancelled"), false);
  assert.equal(canEditBillingInputs(false, null), false);
});

test("reject negative values for readings", () => {
  assert.equal(parseNonNegativeInteger("-1"), null);
  assert.equal(parseNonNegativeInteger("-10"), null);
  assert.equal(parseNonNegativeInteger("0"), 0);
});

test("electricity range validation", () => {
  assert.equal(isValidReadingRange(100, 99), false);
  assert.equal(isValidReadingRange(100, 100), true);
  assert.equal(isValidReadingRange(100, 101), true);
});

test("invalid characters rejected and valid numeric strings accepted", () => {
  for (const invalid of ["abc", "10a", "1e5", "-10", "+10"]) {
    assert.equal(isDigitsOnly(invalid), false);
  }
  for (const valid of ["0", "10", "100"]) {
    assert.equal(isDigitsOnly(valid), true);
  }
});

test("sanitize numeric input behavior", () => {
  assert.equal(sanitizeDigitsInput("6gg"), "6");
  assert.equal(sanitizeDigitsInput("abc"), "");
  assert.equal(sanitizeDigitsInput("10a"), "10");
  assert.equal(sanitizeDigitsInput("1e5"), "15");
  assert.equal(sanitizeDigitsInput("-10"), "10");
  assert.equal(sanitizeDigitsInput("+10"), "10");
});

test("formatMoneyInput behavior", () => {
  assert.equal(formatMoneyInput(""), "");
  assert.equal(formatMoneyInput("0"), "0");
  assert.equal(formatMoneyInput("1000"), "1.000");
  assert.equal(formatMoneyInput("1700000"), "1.700.000");
});

test("parseMoneyInput behavior", () => {
  assert.equal(parseMoneyInput("1.700.000"), 1700000);
  assert.equal(parseMoneyInput("1700000"), 1700000);
  assert.equal(parseMoneyInput(""), null);
});

test("empty / NaN rejected", () => {
  assert.equal(parseNonNegativeInteger(""), null);
  assert.equal(Number.isNaN(Number.parseInt("abc", 10)), true);
});

test("payment validation", () => {
  assert.equal(isValidPaymentAmount(0, 100), false);
  assert.equal(isValidPaymentAmount(-1, 100), false);
  assert.equal(isValidPaymentAmount(101, 100), false);
  assert.equal(isValidPaymentAmount(100, 100), true);
  assert.equal(isValidPaymentAmount(50, 100), true);
});
