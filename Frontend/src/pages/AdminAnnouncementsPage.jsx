import { useCallback, useRef, useState } from 'react';
import { Megaphone, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import AdminHeader from '../components/admin/AdminHeader.jsx';
import AdminSidebar from '../components/admin/AdminSidebar.jsx';
import AnnouncementDialog from '../components/admin/AnnouncementDialog.jsx';
import PageSkeleton from '../components/PageSkeleton.jsx';
import { api } from '../lib/api.js';
import { useRemoteData } from '../lib/useRemoteData.js';

const date = value => new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50';

function AnnouncementEditor({ announcement, onClose, onSaved }) {
  const [title, setTitle] = useState(announcement.title || '');
  const [message, setMessage] = useState(announcement.message || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const editing = !announcement.isNew;
  const submit = async event => {
    event.preventDefault();
    if (busy.current) return;
    if (!title.trim() || !message.trim()) { setError('Enter a title and message.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      const body = { id: announcement.id, title: title.trim(), message: message.trim() };
      const result = editing ? await api.patch(`/announcements/${announcement.id}`, body, { silent: true }) : await api.post('/announcements', body, { silent: true });
      api.invalidate();
      onSaved(result, editing);
    } catch (error) { setError(error.message); }
    finally { busy.current = false; setSaving(false); }
  };
  return <AnnouncementDialog title={editing ? 'Edit announcement' : 'Post announcement'} busy={saving} onClose={onClose}>
    <p className="mb-5 text-sm leading-6 text-slate-500">{editing ? 'Changes update active tenants’ notifications and mark them unread again.' : 'Post to all current tenants. Newly active tenants also receive retained announcements.'}</p>
    <form onSubmit={submit} className="space-y-4">
      <div><label htmlFor="announcement-title" className="mb-1.5 block text-sm font-semibold">Title</label><input id="announcement-title" required maxLength={150} value={title} disabled={saving} onChange={event => setTitle(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/><p className="mt-1 text-right text-xs text-slate-500">{title.length}/150</p></div>
      <div><label htmlFor="announcement-message" className="mb-1.5 block text-sm font-semibold">Message</label><textarea id="announcement-message" required maxLength={5000} rows={8} value={message} disabled={saving} onChange={event => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/><p className="mt-1 text-right text-xs text-slate-500">{message.length}/5,000</p></div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" disabled={saving} onClick={onClose} className={secondary}>Cancel</button><button type="submit" disabled={saving} className={primary}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Post announcement'}</button></div>
    </form>
  </AnnouncementDialog>;
}

export default function AdminAnnouncementsPage({ onNavigate, onLogout }) {
  const [offset, setOffset] = useState(0);
  const loader = useCallback(client => client.get(`/announcements?limit=20&offset=${offset}`), [offset]);
  const { data, loading, error, reload } = useRemoteData(loader, { keepPrevious: true });
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');
  const busy = useRef(false);
  const saved = (announcement, editing) => {
    setEditor(null);
    setNotice(editing ? 'Announcement updated. Active tenants have been notified again.' : `Announcement posted to ${announcement.recipient_count} current tenant${announcement.recipient_count === 1 ? '' : 's'}.`);
    if (offset) setOffset(0); else reload();
  };
  const remove = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setDeleteError('');
    try {
      await api.delete(`/announcements/${deleting.id}`, { silent: true });
      api.invalidate();
      setDeleting(null); setNotice('Announcement deleted and removed from tenant notifications.');
      if (data?.data.length === 1 && offset) setOffset(value => Math.max(0, value - 20)); else reload();
    } catch (error) { setDeleteError(error.message); }
    finally { busy.current = false; setSaving(false); }
  };
  return <main className="flex min-h-screen bg-[#f6f9fd] text-slate-900">
    <AdminSidebar activePage="Announcements" onNavigate={onNavigate}/>
    <div className="min-w-0 flex-1">
      <AdminHeader onLogout={onLogout}/>
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 xl:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><Megaphone size={25}/></span><div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Announcements</h1><p className="mt-1 text-sm text-slate-500">Keep your tenants informed.</p></div></div>
          <button type="button" onClick={() => { setNotice(''); setEditor({ id: crypto.randomUUID(), isNew: true }); }} className={primary}><Plus size={18}/>Post announcement</button>
        </div>
        {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
        <section aria-label="Posted announcements" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Posted announcements</h2><button type="button" disabled={loading} onClick={reload} aria-label="Refresh announcements" className={secondary}><RefreshCw size={16}/><span className="hidden sm:inline">Refresh</span></button></div>
          {error && <p role="alert" className="mb-4 text-sm text-rose-700">{error} <button type="button" onClick={reload} className="underline">Retry</button></p>}
          {loading && !data ? <PageSkeleton variant="list" label="Loading announcements..."/> : data && <>
            {data.data.length ? <div className="space-y-3" aria-busy={loading}>{data.data.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4">
              <h3 className="break-words text-base font-bold">{item.title}</h3>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.message}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-1 text-xs text-slate-500"><p>Posted {date(item.created_at)}</p>{item.updated_at !== item.created_at && <p>Edited {date(item.updated_at)}</p>}<p>{item.recipient_count} tenant{item.recipient_count === 1 ? '' : 's'} notified</p></div>
                <div className="flex flex-wrap gap-2"><button type="button" disabled={loading} onClick={() => setEditor(item)} aria-label={`Edit announcement: ${item.title}`} className={secondary}><Pencil size={15}/>Edit</button><button type="button" disabled={loading} onClick={() => { setDeleteError(''); setDeleting(item); }} aria-label={`Delete announcement: ${item.title}`} className={`${secondary} text-rose-600`}><Trash2 size={15}/>Delete</button></div>
              </div>
            </article>)}</div> : <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center"><Megaphone size={30} className="mx-auto text-blue-400"/><p className="mt-3 font-semibold">No announcements yet</p><p className="mt-1 text-sm text-slate-500">Post your first announcement to notify current tenants.</p></div>}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500">{data.total ? `${offset + 1}–${Math.min(offset + data.data.length, data.total)} of ${data.total} announcements` : '0 announcements'}</p><div className="flex gap-2"><button type="button" disabled={loading || !offset} onClick={() => setOffset(value => Math.max(0, value - 20))} className={secondary}>Previous</button><button type="button" disabled={loading || offset + 20 >= data.total} onClick={() => setOffset(value => value + 20)} className={secondary}>Next</button></div></div>
          </>}
        </section>
      </div>
    </div>
    {editor && <AnnouncementEditor key={editor.id} announcement={editor} onClose={() => setEditor(null)} onSaved={saved}/>}
    {deleting && <AnnouncementDialog title="Delete announcement?" busy={saving} onClose={() => setDeleting(null)}><p className="break-words text-sm leading-6 text-slate-600">Delete “{deleting.title}”? This also removes it from tenant notifications.</p>{deleteError && <p role="alert" className="mt-3 text-sm text-rose-700">{deleteError}</p>}<div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving} onClick={() => setDeleting(null)} className={secondary}>Cancel</button><button type="button" disabled={saving} onClick={remove} className="min-h-11 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{saving ? 'Deleting...' : 'Delete announcement'}</button></div></AnnouncementDialog>}
  </main>;
}
