import PageSkeleton from "../PageSkeleton.jsx";
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadAdminAnalytics } from '../../lib/adminAnalytics.js';
import { today } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import { api } from '../../lib/api.js';
import { getRecommendationPreview, saveRecommendationPreview } from '../../lib/aiRecommendations.js';
import AdminHero from './AdminHero.jsx';
import AdminAttention from './AdminAttention.jsx';
import AdminNotifications from './AdminNotifications.jsx';
import AdminMetrics from './AdminMetrics.jsx';
import SmartRecommendations from './SmartRecommendations.jsx';

export default function LiveAdminDashboard({ onNavigate }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const loader = useCallback(client => loadAdminAnalytics(client, month), [month]);
  const { data, error, loading, reload } = useRemoteData(loader);
  const [ai, setAi] = useState(() => ({ ...getRecommendationPreview(month), month, loading: true, error: '' }));
  const aiRequest = useRef(null);
  const handleMonthChange = useCallback(value => {
    setMonth(value);
    setAi({ ...getRecommendationPreview(value), month: value, loading: true, error: '' });
  }, []);
  const fetchAi = useCallback(async (force = false) => {
    aiRequest.current?.abort();
    const controller = new AbortController();
    aiRequest.current = controller;
    setAi(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const load = fresh => api.post('/analytics/recommendations', { month, period: 'Monthly', force: fresh }, { signal: controller.signal, silent: true, timeoutMs: 20000 });
      const show = (result, loading) => {
        if (controller.signal.aborted) return;
        if (result.fallback) throw new Error(result.reason || 'unavailable');
        saveRecommendationPreview(month, result);
        setAi({ ...result, month, loading, error: '' });
      };
      const result = await load(force);
      show(result, !force && Boolean(result.refreshRecommended));
      if (!force && result.refreshRecommended && !controller.signal.aborted) {
        show(await load(true), false);
      }
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setAi(prev => ({ ...prev, loading: false, stale: Boolean(prev.items?.length), error: requestError.message || 'unavailable' }));
    }
  }, [month]);
  useEffect(() => {
    // Start alongside analytics, rather than waiting for it and then fetching
    // the same report a second time before even checking saved insights.
    void fetchAi();
    return () => aiRequest.current?.abort();
  }, [fetchAi]);
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
