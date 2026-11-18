import { ArrowRight, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { formatInsightDate, recommendationFallbackMessage, hasRecommendationEvidence } from '../../lib/aiRecommendations.js';

const colors = {
  rose: "border-l-rose-500 bg-rose-50 text-rose-500",
  amber: "border-l-amber-400 bg-amber-50 text-amber-500",
  emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
  blue: "border-l-blue-600 bg-blue-50 text-blue-600",
};
const categoryColor = { warning: "blue", opportunity: "emerald", attention: "amber", insight: "emerald" };
const categoryLabel = { warning: "Recommended action", opportunity: "Growth idea", attention: "Suggested follow-up", insight: "Insight" };

function SmartRecommendations({ onNavigate, aiItems: receivedItems = [], aiLoading = false, aiError = "", aiUpdatedAt = null, aiCached = false, aiSource = "ai", aiFallback = false, aiReason = null, onRefreshAi }) {
  const aiItems = receivedItems.filter(hasRecommendationEvidence);
  const fallback = aiFallback || Boolean(aiError);
  const saved = aiItems.length > 0 && (fallback || aiCached || aiSource === 'cache');
  const generatedAt = formatInsightDate(aiUpdatedAt);
  return <section aria-label="Smart Recommendations" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
      <Lightbulb size={25} className="mt-0.5 shrink-0 text-amber-400 sm:mt-0" />
      <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight sm:text-xl">Smart Recommendations</h2><p className="text-xs leading-5 text-slate-500 sm:text-sm">Suggested actions based on recorded property data.</p></div>
      {onRefreshAi && <button type="button" onClick={onRefreshAi} disabled={aiLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"><RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />{aiLoading ? "Generating..." : fallback ? "Try again" : "Provide Insight"}</button>}
    </div>
    {!fallback && generatedAt && <p className="mt-2 text-xs leading-5 text-slate-500">Last generated {generatedAt}</p>}
    {fallback && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{recommendationFallbackMessage({ reason: aiReason || aiError, updatedAt: aiUpdatedAt, hasItems: aiItems.length > 0 })}</p>}
    {aiLoading && aiItems.length > 0 && <p role="status" className="mt-2 text-xs text-slate-500">Updating insights in the background. Showing saved recommendations.</p>}
    {aiLoading && aiItems.length === 0 && <div className="mt-4 space-y-2" aria-label="Loading AI insights">{[0, 1].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-slate-100" />)}</div>}
    {saved && <p className="mt-4 text-xs font-semibold text-slate-600">Saved AI recommendations</p>}
    {aiItems.length > 0 && <div className="mt-4 space-y-3">{aiItems.map(item => {
      const color = categoryColor[item.category] || "blue";
      return <button key={item.factId || item.title} type="button" onClick={() => onNavigate?.(item.page)} className={`flex w-full min-w-0 items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left hover:bg-slate-50 sm:gap-4 ${colors[color].split(" ")[0]}`}>
        <span className={`hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:flex ${colors[color].replace(colors[color].split(" ")[0], "")}`}><Sparkles size={22} /></span>
        <span className="min-w-0 flex-1 break-words"><span className="flex flex-wrap items-center gap-1.5 sm:gap-2"><span className="block text-sm font-semibold leading-5 sm:text-base">{item.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600 sm:text-[10px]">{categoryLabel[item.category] || item.category}</span></span>
          <span className="mt-2 block text-xs font-semibold leading-5 text-slate-700 sm:text-sm">{item.subject}{item.room ? ` · ${item.room}` : ''}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600 sm:text-sm"><span className="font-semibold">Recorded: </span>{item.evidence}</span>
          <span className="mt-2 block text-xs leading-5 text-slate-500 sm:text-sm"><span className="font-semibold text-slate-600">Suggested action: </span>{item.text}</span>
        </span>
        <ArrowRight size={18} className="hidden shrink-0 sm:block" />
      </button>;
    })}</div>}
    {!aiLoading && !fallback && aiItems.length === 0 && <p className="mt-4 text-sm text-slate-500">No AI recommendations are available for this month.</p>}
    {aiItems.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">{fallback ? "Property data may have changed since these recommendations were generated." : "AI-selected actions. Review records before acting."}</p>}
  </section>;
}

export default SmartRecommendations;
