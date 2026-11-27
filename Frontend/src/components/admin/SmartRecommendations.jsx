import DashboardPreviewList from './DashboardPreviewList.jsx';
import DashboardDialog from './DashboardDialog.jsx';
import { ArrowRight, ChevronDown, Lightbulb, RefreshCw, Wallet, DoorOpen, MessagesSquare, ChartNoAxesCombined } from "lucide-react";
import { lazy, Suspense, useId, useState } from 'react';
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

function RecommendationCard({ item, expanded, onToggle, onReview }) {
  const adviceId = useId();
  const titleId = useId();
  const color = categoryColor[item.category] || 'blue';
  const [accent, ...tone] = colors[color].split(' ');
  const Icon = categoryIcon[item.category] || Wallet;
  const [primaryEvidence, ...supportingEvidence] = item.evidence.split(' · ');
  const showSubject = item.tenantId || item.category === 'warning' || item.category === 'insight';
  const control = 'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:text-sm';
  return <article aria-labelledby={titleId} className={`min-w-0 rounded-xl border border-slate-200 border-l-2 bg-white p-3 sm:p-3.5 ${accent}`}>
    <div className="flex min-w-0 items-start gap-2.5">
      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${tone.join(' ')}`}><Icon size={17}/></span>
      <div className="min-w-0 flex-1 break-words">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.join(' ')}`}>{categoryLabel[item.category] || item.category}</span><h3 id={titleId} className="text-sm font-semibold leading-5 text-slate-900">{item.title}</h3></div>
        {showSubject && <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">{item.subject}{item.room ? ` · ${item.room}` : ''}</p>}
        <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm"><strong className="font-semibold text-slate-900">{primaryEvidence}</strong>{supportingEvidence.length > 0 && <span className="text-xs">{` · ${supportingEvidence.join(' · ')}`}</span>}</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <button type="button" aria-expanded={expanded} aria-controls={adviceId} onClick={onToggle} className={`${control} -ml-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900`}>{expanded ? 'Hide advice' : 'Show advice'}<ChevronDown aria-hidden="true" size={14} className={expanded ? 'rotate-180' : ''}/></button>
          <button type="button" onClick={onReview} className={`${control} text-blue-600 hover:bg-blue-50`}>{item.actionLabel || 'View supporting records'}<ArrowRight aria-hidden="true" size={14}/></button>
        </div>
        <div id={adviceId} hidden={!expanded} className="mt-2 space-y-2 border-t border-slate-100 pt-3 text-sm leading-6 text-slate-600">
          {item.reason && <p><span className="font-medium text-slate-700">Reason: </span>{item.reason}</p>}
          <p>{item.text}</p>
          {Array.isArray(item.suggestedSteps) && item.suggestedSteps.length > 0 && <div>
            <p className="font-semibold text-slate-800">Suggested steps</p>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5">{item.suggestedSteps.slice(0,3).map((step,index)=><li key={index} className="pl-0.5">{step}</li>)}</ol>
          </div>}
        </div>
      </div>
    </div>
  </article>;
}

function RecommendationCards({ items, onReview, initialExpanded = null, dialogLayout = false }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  return <div className={(dialogLayout ? "insights-dialog-cards " : "") + "mt-3 space-y-2"}>{items.map(item => {
    const id = item.factId || item.title;
    return <RecommendationCard key={id} item={item} expanded={expanded === id} onToggle={() => setExpanded(current => current === id ? null : id)} onReview={() => onReview(item)}/>;
  })}</div>;
}

function DetailedRecommendations({ dialogLayout = false, initialExpanded = null, onNavigate, aiItems: receivedItems = [], aiLoading = false, aiError = "", aiUpdatedAt = null, aiFiguresCheckedAt = null, aiFiguresAsOf = null, reportMonth, aiCached = false, aiSource = "ai", aiFallback = false, aiReason = null, onRefreshAi }) {
  const [review, setReview] = useState(null);
  const aiItems = receivedItems.filter(hasRecommendationEvidence);
  const fallback = aiFallback || Boolean(aiError);
  const saved = aiItems.length > 0 && (fallback || aiCached || aiSource === 'cache');
  const generatedAt = formatInsightDate(aiUpdatedAt);
  const figuresCheckedAt = formatInsightDate(aiFiguresCheckedAt);
  return <section aria-label="Insights & Recommendations" className={(dialogLayout ? "insights-dialog-content " : "") + "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"}>
    <div className={(dialogLayout ? "insights-dialog-toolbar " : "") + "flex flex-wrap items-start gap-3 sm:flex-nowrap sm:items-center sm:gap-4"}>
      <Lightbulb size={25} className="mt-0.5 shrink-0 text-amber-400 sm:mt-0" />
      <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight sm:text-xl">Insights &amp; Recommendations</h2><p className="text-xs leading-5 text-slate-500 sm:text-sm">Property highlights and suggested next steps.</p></div>
      {onRefreshAi && <button type="button" onClick={onRefreshAi} disabled={aiLoading} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"><RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />{aiLoading ? "Refreshing..." : fallback ? "Try again" : aiItems.length ? "Refresh insights" : "Generate insights"}</button>}
    </div>
    {!fallback && generatedAt && <p className="insights-dialog-meta mt-3 text-xs leading-5 text-slate-500">{saved ? 'Saved insights · ' : ''}Actions generated {generatedAt}</p>}
    {aiItems.length > 0 && figuresCheckedAt && <p className="insights-dialog-meta mt-1 text-xs leading-5 text-slate-500">Figures checked {figuresCheckedAt}{aiFiguresAsOf ? ` · Financial records through ${aiFiguresAsOf}` : ''}</p>}
    {fallback && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{recommendationFallbackMessage({ reason: aiReason || aiError, updatedAt: aiUpdatedAt, hasItems: aiItems.length > 0 })}</p>}
    {aiLoading && aiItems.length > 0 && <p role="status" className="mt-2 text-xs text-slate-500">Refreshing insights. Showing saved recommendations.</p>}
    {aiLoading && aiItems.length === 0 && <div className="mt-4 space-y-2" aria-label="Loading AI insights">{[0, 1].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-slate-100" />)}</div>}
    {aiItems.length > 0 && <RecommendationCards key={JSON.stringify([reportMonth,aiItems.map(item=>item.factId || item.title)])} items={aiItems} dialogLayout={dialogLayout} initialExpanded={initialExpanded} onReview={item => reportMonth && item.factId ? setReview(item) : onNavigate?.(item.page)}/>}
    {!aiLoading && !fallback && aiItems.length === 0 && <p className="mt-4 text-sm text-slate-500">No AI recommendations are available for this month.</p>}
    {aiItems.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-500">AI-selected actions. Figures reflect current operational records. Review records before acting.</p>}
    {review && <Suspense fallback={<p role="status" className="mt-3 text-sm text-slate-500">Opening supporting records...</p>}><RecommendationRecords key={review.factId + reportMonth} item={review} month={reportMonth} onClose={() => setReview(null)} onNavigate={onNavigate}/></Suspense>}
  </section>;
}



export default function SmartRecommendations(props) {
  const [allOpen, setAllOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  if (!props.compact) return <DetailedRecommendations {...props}/>;
  const items = (props.aiItems || []).filter(hasRecommendationEvidence);
  const fallback = props.aiFallback || Boolean(props.aiError);
  const open = item => { setExpanded(item ? item.factId || item.title : null); setAllOpen(true); };
  return <>
    <section aria-label="Insights summary" className="dashboard-insights rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2"><Lightbulb size={20} className="shrink-0 text-amber-500" aria-hidden="true"/><h2 className="min-w-0 flex-1 text-base font-bold">Insights &amp; Recommendations</h2><button type="button" onClick={() => open(null)} className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50">View all</button></div>
      {fallback && <p role="status" className="mt-2 truncate text-xs text-amber-800">{items.length ? 'Showing saved insights. Open View all for status and details.' : 'Insights unavailable. Open View all to try again.'}</p>}
      <DashboardPreviewList items={items} kind="recommendations" loading={props.aiLoading} refreshing={props.aiLoading} emptyMessage="No recommendations available for this month." renderItem={item => <button type="button" key={item.factId || item.title} onClick={() => open(item)} className={'dashboard-preview-row flex w-full min-w-0 items-center gap-3 rounded-xl border border-l-4 px-3 py-2.5 text-left transition-colors ' + (categoryColor[item.category] === 'emerald' ? 'border-emerald-200 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70' : categoryColor[item.category] === 'amber' ? 'border-amber-200 border-l-amber-400 bg-amber-50/60 hover:bg-amber-100/70' : 'border-blue-200 border-l-blue-500 bg-blue-50/60 hover:bg-blue-100/70')}>
        <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + (categoryColor[item.category] === 'emerald' ? 'bg-emerald-100 text-emerald-700' : categoryColor[item.category] === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}><Lightbulb size={17} aria-hidden="true"/></span>
        <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{item.title}</span><span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ' + (categoryColor[item.category] === 'emerald' ? 'bg-emerald-100 text-emerald-800' : categoryColor[item.category] === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800')}>{categoryLabel[item.category] || item.category}</span></span><span className="mt-1 block truncate text-xs text-slate-600">{item.evidence}</span></span><ArrowRight size={15} className="shrink-0 text-slate-500" aria-hidden="true"/>
      </button>}/>
    </section>
    {allOpen && <DashboardDialog layout="insights" title="All insights & recommendations" wide onClose={() => setAllOpen(false)}><DetailedRecommendations {...props} dialogLayout initialExpanded={expanded}/></DashboardDialog>}
  </>;
}
