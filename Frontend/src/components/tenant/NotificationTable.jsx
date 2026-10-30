import PageSkeleton from "../PageSkeleton.jsx";
import { useRef, useState } from "react";
import { BellRing, ChevronRight, Info, ReceiptText } from "lucide-react";
import { markAllNotificationsRead, markNotificationsRead } from "../../lib/notifications.js";
import { useNotificationFeed } from "../../lib/useNotificationFeed.js";
import { api } from "../../lib/api.js";

export default function NotificationTable({ onNavigate }) {
  const { data, error, loading, reload:reloadFeed, more, total, unreadCount, asOf, loadingMore } = useNotificationFeed();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [limit, setLimit] = useState(3);
  const reload=()=>{setLimit(3);reloadFeed();};
  const busy = useRef(false);
  const mark = async ids => {
    if (busy.current || (ids!==null&&!ids.length)) return;
    busy.current = true;
    setSaving(true);
    setSaveError("");
    try { if(ids===null)await markAllNotificationsRead(api,asOf);else await markNotificationsRead(api, ids); reload(); }
    catch (e) { setSaveError(e.message); }
    finally { busy.current = false; setSaving(false); }
  };
  return <section aria-labelledby="notifications-heading" className="mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BellRing size={19} /></span><div><h2 id="notifications-heading" className="text-sm font-bold text-slate-900">Notifications</h2><p className="mt-0.5 text-[11px] text-slate-500">Your latest account updates</p></div>{data && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">{unreadCount} unread</span>}</div>
      <button type="button" disabled={saving || loading || !unreadCount} onClick={() => mark(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40">Mark all as read</button>
    </div>
    <p className="px-5 pt-3 text-[11px] text-slate-400">Unread first · newest first within each group</p>
    {loading ? <PageSkeleton variant="list" label="Loading notifications..."/>
      : error ? <p role="alert" className="px-5 py-3 text-xs text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>
        : !data.length ? <p className="px-5 py-3 text-xs text-slate-500">No notifications yet.</p>
          : <div className="space-y-2 p-3">{data.slice(0, limit).map(item => {
            const isBilling = item.kind === "bill" || item.kind === "payment";
            const Icon = item.kind === "payment" ? ReceiptText : Info;
            const color = item.is_read ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-600";
            return <article key={item.id} className={"flex items-start gap-3 rounded-xl border px-4 py-4 transition-colors " + (item.is_read ? "border-slate-100 bg-white" : "border-blue-100 bg-blue-50/60 shadow-[inset_3px_0_0_#3b82f6]")}>
              <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + color}><Icon size={17} /></span>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className={"text-sm text-slate-800 " + (item.is_read ? "font-medium" : "font-semibold")}>{item.title}</h3>{!item.is_read && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-600" />Unread</span>}</div>{item.alert && <span className="my-1 inline-block rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{item.alert}</span>}<p className="whitespace-pre-wrap text-xs text-slate-500">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-3">{!item.is_read && <button disabled={saving} onClick={() => mark([item.id])} className="text-[11px] font-medium text-slate-500 hover:text-blue-700 disabled:text-slate-400">Mark as read</button>}{isBilling && <button onClick={() => onNavigate?.("billing")} className="inline-flex items-center text-[11px] font-semibold text-blue-600 hover:underline">View billing <ChevronRight size={14} /></button>}</div>
              </div>
              <span className="hidden whitespace-nowrap text-[11px] text-slate-400 sm:block">{new Date(item.created_at).toLocaleDateString("en-PH")}</span>
            </article>;
          })}</div>}
    {loadingMore&&<PageSkeleton variant="list" label="Loading more notifications..."/>}{total > limit && <button disabled={loadingMore} onClick={async () => {if(data.length>=total||limit+5<=data.length||await more())setLimit(n=>n+5);}} className="px-5 py-3 text-xs font-medium text-blue-600 hover:underline">Show more</button>}
    {saving && <p role="status" className="px-5 py-3 text-xs text-slate-500">Saving read status...</p>}
    {saveError && <p role="alert" className="px-5 py-3 text-xs text-rose-700">{saveError}</p>}
  </section>;
}
