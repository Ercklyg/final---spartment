export const money = value => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value / 100);
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const cents = value => /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) < 100000000 ? Math.round(Number(value) * 100) : null;
export const total = bill => bill.rent + bill.e + bill.w;
export const paid = bill => bill.payments.filter(payment => !payment.voided).reduce((sum, payment) => sum + payment.amount, 0);
export const balance = bill => total(bill) - paid(bill);
export function status(bill, date = today()) {
  if (!total(bill)) return "No charges";
  if (!balance(bill)) return "Paid";
  if (date > bill.due) return "Overdue";
  return paid(bill) ? "Partially paid" : "Pending";
}
export function validatePayment(bill, amount, date) {
  const value = cents(amount);
  if (value === null || value <= 0 || value > balance(bill)) return "Enter an amount above zero and no greater than the balance.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < `${bill.period}-01` || date > today()) return "Choose a payment date within or after the billing month, and not in the future.";
  return "";
}
