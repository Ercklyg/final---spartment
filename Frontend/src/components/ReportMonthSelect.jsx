const reportMonthLabel = month => new Date(month + '-01T12:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

export default function ReportMonthSelect({ months = [], value, onChange, ...props }) {
  return <select {...props} disabled={!months.length} value={months.includes(value) ? value : ''} onChange={event => { if (months.includes(event.target.value)) onChange(event.target.value); }}>
    {!months.length && <option value="">No reporting data</option>}
    {[...months].reverse().map(month => <option key={month} value={month}>{reportMonthLabel(month)}</option>)}
  </select>;
}
