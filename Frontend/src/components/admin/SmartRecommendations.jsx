import { money } from "../../lib/billing.js";
import { ArrowRight, BarChart3, House, Lightbulb, UserRound } from "lucide-react";
const colors = { rose: "border-l-rose-500 bg-rose-50 text-rose-500", amber: "border-l-amber-400 bg-amber-50 text-amber-500", emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-600", blue: "border-l-blue-600 bg-blue-50 text-blue-600" };
function SmartRecommendations({snapshot, onNavigate}) {
const recommendations = [
  ...(snapshot.overdue > 0 ? [["Follow up on late payments", snapshot.late.length + " bills have " + money(snapshot.overdue) + " past due.", UserRound, "rose", "Billing"]] : []),
  ...(snapshot.available > 0 ? [["Vacant rooms detected", snapshot.available + " rooms are available. Review room listings.", House, "amber", "Rooms"]] : []),
  ["Review monthly collections", money(snapshot.collected) + " collected for the selected month.", BarChart3, "emerald", "Billing"],
  ...(snapshot.openRequests.length + snapshot.openInquiries.length > 0 ? [["Respond to pending requests", snapshot.openRequests.length + " tenant requests and " + snapshot.openInquiries.length + " guest inquiries need review.", UserRound, "blue", "Customer Requests"]] : [])
];
return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><Lightbulb size={29} className="text-amber-400" /><div><h2 className="text-xl font-bold">Smart Recommendations</h2><p className="text-sm text-slate-500">Suggested actions to improve operations.</p></div></div><div className="mt-4 space-y-2">{recommendations.map(([title, text, Icon, color, page]) => <button key={title} type="button" onClick={()=>onNavigate?.(page)} className={`flex w-full items-center gap-4 rounded-xl border border-slate-200 border-l-4 bg-white p-3 text-left hover:bg-slate-50 ${colors[color].split(" ")[0]}`}><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors[color].replace(colors[color].split(" ")[0], "")}`}><Icon size={25} /></span><span className="flex-1"><span className="block font-semibold">{title}</span><span className="block text-sm text-slate-500">{text}</span></span><ArrowRight size={20} /></button>)}</div></section>; }
export default SmartRecommendations;
