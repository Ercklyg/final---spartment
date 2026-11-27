import { useEffect, useRef, useState } from 'react';

// Show three compact rows whenever the available panel height permits.
export default function DashboardPreviewList({ items, renderItem, kind, loading = false, error = '', emptyMessage, refreshing = false }) {
  const list = useRef(null);
  const [capacity, setCapacity] = useState(3);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setCapacity(Math.max(1, Math.min(3, Math.floor((entry.contentRect.height + 8) / 60))));
    });
    observer.observe(list.current);
    return () => observer.disconnect();
  }, []);
  const shown = items.slice(0, capacity);
  return <div className="dashboard-preview-area">
    <div ref={list} className="dashboard-preview-list" style={{ '--preview-rows': Math.max(1, shown.length) }}>
      {error ? <p role="alert" className="self-center text-center text-sm text-rose-700">{error}</p> : loading && !items.length ? <p role="status" className="self-center text-center text-sm text-slate-500">Loading {kind}...</p> : shown.length ? shown.map(renderItem) : <p className="self-center text-center text-sm text-slate-500">{emptyMessage}</p>}
    </div>
    <p className="mt-3 shrink-0 text-xs text-slate-500">{refreshing && items.length ? 'Refreshing saved insights…' : `Showing ${shown.length} of ${items.length} ${kind}`}</p>
  </div>;
}
