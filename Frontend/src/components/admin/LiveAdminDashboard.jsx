import PageSkeleton from "../PageSkeleton.jsx";
import { useCallback, useEffect, useState } from 'react';
import { loadAdminAnalytics } from '../../lib/adminAnalytics.js';
import { today } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { api } from '../../lib/api.js';
import AdminHero from './AdminHero.jsx';
import AdminAttention from './AdminAttention.jsx';
import AdminNotifications from './AdminNotifications.jsx';
import AdminMetrics from './AdminMetrics.jsx';
import SmartRecommendations from './SmartRecommendations.jsx';

export default function LiveAdminDashboard({ onNavigate }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const loader = useCallback(client => loadAdminAnalytics(client, month), [month]);
  const { data, error, loading, reload } = useRemoteData(loader);
  const [ai, setAi] = useState({ items: [], loading: true, error: '', updatedAt: null, cached: false, stale: false, source: 'ai' });
  const handleMonthChange = useCallback(value => {
    setMonth(value);
    setAi(prev => ({ ...prev, loading: true, error: '' }));
  }, []);
  const fetchAi = useCallback(async (force = false) => {
    setAi(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const result = await api.post('/analytics/recommendations', { month, period: 'Monthly', force }, { silent: true });
      if (result.fallback) {
        setAi({ items: [], loading: false, error: result.reason || 'unavailable', updatedAt: null, cached: false, stale: false, source: 'ai' });
      } else {
        setAi({ items: result.items || [], loading: false, error: '', updatedAt: result.updatedAt || null, cached: Boolean(result.cached), stale: Boolean(result.stale), source: result.source || 'ai' });
      }
    } catch (requestError) {
      setAi({ items: [], loading: false, error: requestError.message || 'unavailable', updatedAt: null, cached: false, stale: false, source: 'ai' });
    }
  }, [month]);
  useEffect(() => {
    if (!data?.snapshot) return;
    const controller = new AbortController();
    api.post('/analytics/recommendations', { month, period: 'Monthly', force: false },{signal:controller.signal,silent:true}).then(result => {
      if (result.fallback) setAi({ items: [], loading: false, error: result.reason || 'unavailable', updatedAt: null, cached: false, stale: false, source: 'ai' });
      else setAi({ items: result.items || [], loading: false, error: '', updatedAt: result.updatedAt || null, cached: Boolean(result.cached), stale: Boolean(result.stale), source: result.source || 'ai' });
    }).catch(requestError => {
      if (requestError?.name === 'AbortError') return;
      setAi({ items: [], loading: false, error: requestError.message || 'unavailable', updatedAt: null, cached: false, stale: false, source: 'ai' });
    });
    return () => controller.abort();
  }, [data?.snapshot, month]);
  return <>
    <AdminHero selectedMonth={month} onMonthChange={handleMonthChange} />
    {loading && !data ? <PageSkeleton variant="dashboard" label="Loading dashboard..."/>
      : error && !data ? <p role="alert" className="py-5 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>
        : <div className="space-y-4 sm:space-y-5" aria-busy={loading}>
          {error && <p role="alert" className="text-sm text-rose-700">{error} Showing the last loaded dashboard.</p>}
          <AdminAttention snapshot={data.snapshot} onNavigate={onNavigate} />
          <AdminNotifications key={data.loadedAt} />
          <AdminMetrics snapshot={data.snapshot} onNavigate={onNavigate} />
          <SmartRecommendations onNavigate={onNavigate} aiItems={ai.items} aiLoading={ai.loading} aiError={ai.error} aiUpdatedAt={ai.updatedAt} aiCached={ai.cached} aiStale={ai.stale} aiSource={ai.source} onRefreshAi={() => fetchAi(true)} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 shadow-sm sm:text-xs">
            <p>Dashboard updated {new Date(data.loadedAt).toLocaleString('en-PH')}</p>
            <button disabled={loading} onClick={reload} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50">{loading ? "Refreshing..." : "Refresh dashboard"}</button>
          </div>
        </div>}
  </>;
}
