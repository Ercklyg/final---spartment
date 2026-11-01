import { useState } from 'react';
import { ExternalLink, FileImage, FileText, LoaderCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { loadRequestAttachmentUrl } from '../../lib/requests.js';

const size=value=>value>=1024*1024?`${(value/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(value/1024))} KB`;
export default function MaintenanceAttachments({requestId,attachments=[]}){
 const [opening,setOpening]=useState('');const [error,setError]=useState('');
 if(!attachments.length)return null;
 const open=async item=>{const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;setOpening(item.id);setError('');try{const result=await loadRequestAttachmentUrl(api,requestId,item.id);if(tab)tab.location.href=result.url;else throw new Error('Allow pop-ups to open this attachment.');}catch(reason){tab?.close();setError(reason.message);}finally{setOpening('');}};
 return <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments ({attachments.length})</h3><ul className="mt-2 space-y-2">{attachments.map(item=>{const Icon=item.mime_type==='application/pdf'?FileText:FileImage;return <li key={item.id}><button type="button" disabled={Boolean(opening)} onClick={()=>open(item)} className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-blue-200 hover:bg-blue-50 disabled:opacity-60"><Icon size={18} className="shrink-0 text-blue-600"/><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-800">{item.original_name}</span><span className="text-xs text-slate-500">{size(item.size_bytes)}</span></span>{opening===item.id?<LoaderCircle size={16} className="animate-spin"/>:<ExternalLink size={16} className="text-slate-400"/>}</button></li>})}</ul>{error&&<p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}<p className="mt-2 text-[11px] text-slate-500">Links expire after one minute and open in a new tab.</p></section>;
}
