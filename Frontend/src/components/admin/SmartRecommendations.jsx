import { ArrowRight, Lightbulb, RefreshCw, Sparkles } from "lucide-react";

const colors = {
  rose: "border-l-rose-500 bg-rose-50 text-rose-500",
  amber: "border-l-amber-400 bg-amber-50 text-amber-500",
  emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600",
  blue: "border-l-blue-600 bg-blue-50 text-blue-600",
};
const categoryColor = { warning: "rose", opportunity: "amber", attention: "blue", insight: "emerald" };
const categoryLabel = { warning: "Warning", opportunity: "Opportunity", attention: "Attention", insight: "Insight" };

function SmartRecommendations({ onNavigate, aiItems = [], aiLoading = false, aiError = "", aiUpdatedAt = null, aiCached = false, aiStale = false, aiSource = "ai", onRefreshAi }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <Lightbulb size={29} className="text-amber-400" />
      <div className="flex-1"><h2 className="text-xl font-bold">Smart Recommendations</h2><p className="text-sm text-slate-500">Suggested actions to improve operations.</p></div>
      {onRefreshAi && <button type="button" onClick={onRefreshAi} disabled={aiLoading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={aiLoading ? "animate-spin" : ""} />{aiLoading ? "Generating..." : "Provide Insight"}</button>}
    </div>
    {aiUpdatedAt && !aiLoading && <p className="mt-2 text-xs text-slate-400">Insights updated {new Date(aiUpdatedAt).toLocaleString("en-PH")}{aiCached ? " · cached" : ""}{aiStale ? " · last available" : ""}</p>}
    {aiLoading && <div className="mt-4 space-y-2" aria-label="Loading AI insights">{[0, 1].map(i => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-slate-100" />)}</div>}
    {!aiLoading && aiError && <p role="alert" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{aiError === "busy" ? "AI is busy — retry in a few minutes." : aiError === "quota" ? "AI quota reached. Try again later." : "AI insights are unavailable right now."} <button type="button" onClick={onRefreshAi} className="font-semibold text-blue-600 hover:underline">Retry</button></p>}
    {!aiLoading && !aiError && aiItems.length > 0 && <div className="mt-4 space-y-2">{aiItems.map(item => {
      const color = categoryColor[item.category] || "blue";
      return <button key={item.title} type="button" onClick={() => onNavigate?.(item.page)} className={`flex w-full items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white p-3 text-left hover:bg-slate-50 ${colors[color].split(" ")[0]}`}>
        <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color].replace(colors[color].split(" ")[0], "")}`}><Sparkles size={25} /></span>
        <span className="flex-1"><span className="flex items-center gap-2"><span className="block font-semibold">{item.title}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{categoryLabel[item.category] || item.category}</span></span><span className="block text-sm text-slate-500">{item.text}</span></span>
        <ArrowRight size={20} />
      </button>;
    })}</div>}
    {!aiLoading && !aiError && aiItems.length === 0 && <p className="mt-4 text-sm text-slate-500">No AI recommendations are available for this month.</p>}
    {!aiLoading && !aiError && aiItems.length > 0 && <p className="mt-2 text-xs text-slate-400">{aiSource === "ai" ? "AI suggestion — verify before acting." : aiSource === "cache" ? "Showing last insights — verify before acting." : "Smart insights (offline) — verify before acting."}</p>}
  </section>;
}

export default SmartRecommendations;
