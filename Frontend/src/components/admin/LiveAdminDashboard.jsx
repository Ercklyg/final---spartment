import PageSkeleton from "../PageSkeleton.jsx";
import { useCallback, useState } from 'react';
import { loadAdminAnalytics } from '../../lib/adminAnalytics.js';
import { today } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import AdminHero from './AdminHero.jsx';
import AdminAttention from './AdminAttention.jsx';
import AdminNotifications from './AdminNotifications.jsx';
import AdminMetrics from './AdminMetrics.jsx';
import SmartRecommendations from './SmartRecommendations.jsx';

export default function LiveAdminDashboard({ onNavigate }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const loader = useCallback(client => loadAdminAnalytics(client, month), [month]);
  const { data, error, loading, reload } = useRemoteData(loader);
  return <>
    <AdminHero selectedMonth={month} onMonthChange={setMonth} />
    {loading ? <PageSkeleton variant="dashboard" label="Loading dashboard..."/>
      : error ? <p role="alert" className="py-5 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>
        : <div className="space-y-5">
          <AdminAttention snapshot={data.snapshot} onNavigate={onNavigate} />
          <div className="grid gap-5 xl:grid-cols-2">
            <AdminNotifications snapshot={data.snapshot} />
            <AdminMetrics snapshot={data.snapshot} onNavigate={onNavigate} />
          </div>
          <SmartRecommendations snapshot={data.snapshot} onNavigate={onNavigate} />
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <p>Updated {new Date(data.loadedAt).toLocaleString('en-PH')}</p>
            <button onClick={reload} className="font-medium text-blue-600 hover:underline">Refresh</button>
          </div>
        </div>}
  </>;
}
