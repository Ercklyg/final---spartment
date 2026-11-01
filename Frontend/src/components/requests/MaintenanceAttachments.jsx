import { useEffect, useState } from 'react';
import { ExternalLink, FileImage, FileText, LoaderCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { loadRequestAttachmentUrl } from '../../lib/requests.js';

const size=value=>value>=1024*1024?`${(value/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(value/1024))} KB`;
function AttachmentPreview({requestId,item}){
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!item.mime_type.startsWith('image/'))return;const controller=new AbortController();loadRequestAttachmentUrl(api,requestId,item.id).then(result=>setUrl(result.url)).catch(()=>undefined);return()=>controller.abort();},[item.id,item.mime_type,requestId]);
 if(item.mime_type==='application/pdf')return <span className="flex h-20 w-full items-center justify-center bg-red-50 text-red-600"><FileText size={28}/></span>;
 return <span className="block h-28 w-full overflow-hidden bg-slate-100">{url?<img src={url} alt={item.original_name} className="h-full w-full object-cover"/>:<span className="flex h-full items-center justify-center text-slate-400"><LoaderCircle size={20} className="animate-spin"/></span>}</span>;
}
export default function MaintenanceAttachments({requestId,attachments=[]}){
 const [opening,setOpening]=useState('');const [error,setError]=useState('');
 if(!attachments.length)return null;
 const open=async item=>{const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;setOpening(item.id);setError('');try{const result=await loadRequestAttachmentUrl(api,requestId,item.id);if(tab)tab.location.href=result.url;else throw new Error('Allow pop-ups to open this attachment.');}catch(reason){tab?.close();setError(reason.message);}finally{setOpening('');}};
 return <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments ({attachments.length})</h3><ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{attachments.map(item=>{const Icon=item.mime_type==='application/pdf'?FileText:FileImage;return <li key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"><AttachmentPreview requestId={requestId} item={item}/><button type="button" disabled={Boolean(opening)} onClick={()=>open(item)} className="flex min-h-11 w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-blue-50 disabled:opacity-60"><Icon size={16} className="shrink-0 text-blue-600"/><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-800">{item.original_name}</span><span className="text-[11px] text-slate-500">{size(item.size_bytes)}</span></span>{opening===item.id?<LoaderCircle size={14} className="animate-spin"/>:<ExternalLink size={14} className="shrink-0 text-slate-400"/>}</button></li>})}</ul>{error&&<p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}<p className="mt-2 text-[11px] text-slate-500">Select an attachment to open the full file in a new tab.</p></section>;
}
