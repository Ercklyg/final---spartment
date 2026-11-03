const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function moveInDateError(value, now = new Date()) {
  const date = typeof value === 'string' ? value.trim() : '';
  const timestamp = Date.parse(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp)
      || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    return 'Enter a valid move-in date.';
  }
  return date > manilaDateFormatter.format(now)
    ? 'Move-in date cannot be in the future. Choose today or an earlier date.'
    : null;
}
