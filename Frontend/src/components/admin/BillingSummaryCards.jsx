const cards = [
  ["Total Billed (May)", "₱65,000"],
  ["Total Collected", "₱39,000"],
  ["Pending", "₱13,000"],
  ["Late", "₱13,000"],
];

function BillingSummaryCards() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value]) => (
        <article key={label} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">{label}</p>
          <h2 className="mt-2 text-2xl font-bold">{value}</h2>
        </article>
      ))}
    </section>
  );
}

export default BillingSummaryCards;
