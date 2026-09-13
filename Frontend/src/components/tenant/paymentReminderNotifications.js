const storageKey = "spartment-payment-reminders";
const eventName = "spartment:payment-reminder";

export function getPaymentReminders() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function sendPaymentReminder({ name, room, kind, period, due, amount }) {
  const reminder = {
    id: `${Date.now()}-${room}`,
    title: "Payment reminder",
    message: `${kind} payment for ${period} is due on ${due}. Remaining balance: ${amount}.`,
    date: "Just now",
    recipient: name,
    room,
  };
  const reminders = [reminder, ...getPaymentReminders()];
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(reminders));
  } catch {
    // The reminder remains available in the current page even if storage is unavailable.
  }
  window.dispatchEvent(new Event(eventName));
  return reminder;
}

export function subscribeToPaymentReminders(callback) {
  window.addEventListener(eventName, callback);
  return () => window.removeEventListener(eventName, callback);
}
