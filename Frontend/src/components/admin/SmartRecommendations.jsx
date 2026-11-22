import { ArrowRight, Lightbulb, RefreshCw, Wallet, DoorOpen, MessagesSquare, ChartNoAxesCombined } from "lucide-react";
import { lazy, Suspense, useState } from 'react';
import { formatInsightDate, recommendationFallbackMessage, hasRecommendationEvidence } from '../../lib/aiRecommendations.js';
const RecommendationRecords = lazy(() => import('./RecommendationRecords.jsx'));

const colors = {
  amber: "border-l-amber-400 bg-amber-50 text-amber-500",
  emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
  blue: "border-l-blue-600 bg-blue-50 text-blue-600",
};
const categoryColor = { warning: "blue", opportunity: "emerald", attention: "amber", insight: "emerald" };
const categoryLabel = { warning: "Payments", opportunity: "Vacancies", attention: "Requests", insight: "Collections" };
const categoryIcon = { warning: Wallet, opportunity: DoorOpen, attention: MessagesSquare, insight: ChartNoAxesCombined };

function SmartRecommendations({ onNavigate, aiItems: receivedItems = [], aiLoading = false, aiError = "", aiUpdatedAt = null, aiFiguresCheckedAt = null, aiFiguresAsOf = null, reportMonth, aiCached = false, aiSource = "ai", aiFallback = false, aiReason = null, onRefreshAi }) {
  const [review, setReview] = useState(null);
  const aiItems = receivedItems.filter(hasRecommendationEvidence);
  const fallback = aiFallback || Boolean(aiError);
  const saved = aiItems.length > 0 && (fallback || aiCached || aiSource === 'cache');
  const generatedAt = formatInsightDate(aiUpdatedAt);
  const figuresCheckedAt = formatInsightDate(aiFiguresCheckedAt);
  return <section aria-label="Insights & Recommendations" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4">
      <Lightbulb size={25} className="mt-0.5 shrink-0 text-amber-400 sm:mt-0" />
      <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight sm:text-xl">Insights &amp; Recommendations</h2><p className="text-xs leading-5 text-slate-500 sm:text-sm">Property highlights and suggested next steps.</p></div>
      {onRefreshAi && <button type="button" onClick={onRefreshAi} disabled={aiLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"><RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />{aiLoading ? "Refreshing..." : fallback ? "Try again" : aiItems.length ? "Refresh insights" : "Generate insights"}</button>}
    </div>
    {!fallback && generatedAt && <p className="mt-3 text-xs leading-5 text-slate-500">{saved ? 'Saved insights · ' : ''}Actions generated {generatedAt}</p>}
    {aiItems.length > 0 && figuresCheckedAt && <p className="mt-1 text-xs leading-5 text-slate-500">Figures checked {figuresCheckedAt}{aiFiguresAsOf ? ` · Financial records through ${aiFiguresAsOf}` : ''}</p>}
    {fallback && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{recommendationFallbackMessage({ reason: aiReason || aiError, updatedAt: aiUpdatedAt, hasItems: aiItems.length > 0 })}</p>}
    {aiLoading && aiItems.length > 0 && <p role="status" className="mt-2 text-xs text-slate-500">Refreshing insights. Showing saved recommendations.</p>}
    {aiLoading && aiItems.length === 0 && <div className="mt-4 space-y-2" aria-label="Loading AI insights">{[0, 1].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-slate-100" />)}</div>}
    {aiItems.length > 0 && <div className="mt-4 space-y-3">{aiItems.map(item => {
      const color = categoryColor[item.category] || "blue";
      const Icon = categoryIcon[item.category] || Wallet;
      const [primaryEvidence, ...supportingEvidence] = item.evidence.split(' · ');
      const showSubject = item.tenantId || item.category === 'warning' || item.category === 'insight';
      return <button key={item.factId || item.title} type="button" onClick={() => reportMonth && item.factId ? setReview(item) : onNavigate?.(item.page)} className={`flex w-full min-w-0 items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white p-4 text-left hover:bg-slate-50 sm:gap-4 ${colors[color].split(" ")[0]}`}>
        <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:flex ${colors[color].replace(colors[color].split(" ")[0], "")}`}><Icon size={20} /></span>
        <div className="min-w-0 flex-1 break-words"><span className="flex flex-wrap items-center gap-x-2 gap-y-1.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${colors[color].replace(colors[color].split(" ")[0], "")}`}>{categoryLabel[item.category] || item.category}</span><span className="block text-sm font-semibold leading-5 sm:text-base">{item.title}</span></span>
          {showSubject && <span className="mt-2 block text-xs leading-5 text-slate-700 sm:text-sm">{item.subject}{item.room ? ` · ${item.room}` : ''}</span>}
          <span className={`${showSubject ? 'mt-1' : 'mt-2'} block text-xs leading-6 text-slate-500 sm:text-sm`}><strong className="font-semibold text-slate-900">{primaryEvidence}</strong>{supportingEvidence.length > 0 && <span className="text-[11px] sm:text-xs">{` · ${supportingEvidence.join(' · ')}`}</span>}</span>
          {item.reason && <span className="mt-2 block text-xs leading-5 text-slate-600 sm:text-sm"><span className="font-medium text-slate-700">Reason: </span>{item.reason}</span>}
          <span className="mt-2 block text-xs leading-5 text-slate-600 sm:text-sm">{item.text}</span>
          {Array.isArray(item.suggestedSteps) && item.suggestedSteps.length > 0 && <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
            <p className="text-xs font-semibold text-slate-800 sm:text-sm">Suggested steps</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">{item.suggestedSteps.slice(0,3).map((step,index)=><li key={index} className="pl-1">{step}</li>)}</ol>
          </div>}
          <span className="mt-3 inline-flex min-h-6 items-center gap-1.5 text-xs font-semibold text-blue-600 sm:text-sm">{item.actionLabel || 'View supporting records'}<ArrowRight size={14}/></span>
        </div>
        <ArrowRight size={18} className="hidden shrink-0 sm:block" />
      </button>;
    })}</div>}
    {!aiLoading && !fallback && aiItems.length === 0 && <p className="mt-4 text-sm text-slate-500">No AI recommendations are available for this month.</p>}
    {aiItems.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">AI-selected actions. Figures reflect current operational records. Review records before acting.</p>}
    {review && <Suspense fallback={<p role="status" className="mt-3 text-sm text-slate-500">Opening supporting records...</p>}><RecommendationRecords key={review.factId + reportMonth} item={review} month={reportMonth} onClose={() => setReview(null)} onNavigate={onNavigate}/></Suspense>}
  </section>;
}

export default SmartRecommendations;
