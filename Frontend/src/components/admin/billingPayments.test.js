import test from "node:test";
import assert from "node:assert/strict";
import { balance, cents, paid, status, validatePayment } from "./billingPayments.js";

const bill = { rent: 650000, e: 0, w: 0, period: "2026-05", due: "2026-05-15", payments: [] };
test("status follows due date, partial payments, and full payment", () => {
  assert.equal(status(bill, "2026-05-15"), "Pending");
  const partial = { ...bill, payments: [{ amount: 300000 }] };
  assert.equal(balance(partial), 350000);
  assert.equal(status(partial, "2026-05-15"), "Partially paid");
  assert.equal(status(partial, "2026-05-16"), "Overdue");
  assert.equal(status({ ...bill, payments: [{ amount: 650000 }] }, "2026-05-16"), "Paid");
  assert.equal(status({ ...bill, rent: 0 }, "2026-05-16"), "No charges");
});
test("voided payments restore balance without counting toward collected totals", () => {
  const corrected = { ...bill, payments: [{ amount: 650000, voided: true }, { amount: 300000 }] };
  assert.equal(paid(corrected), 300000);
  assert.equal(balance(corrected), 350000);
});
test("amounts use cents and payment validation rejects invalid inputs", () => {
  assert.equal(cents("10.25"), 1025);
  for (const value of ["", "-1", "1.001", "NaN"]) assert.equal(cents(value), null);
  for (const amount of ["0", "-1", "6500.01"]) assert.ok(validatePayment(bill, amount, "2026-05-15"));
  assert.ok(validatePayment(bill, "100", "2099-01-01"));
  assert.ok(validatePayment(bill, "100", "2026-04-30"));
  assert.equal(validatePayment(bill, "3000", "2026-05-15"), "");
});
