import PageSkeleton from "../PageSkeleton.jsx";
import { CheckCircle2, Clock3, Paperclip } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../../lib/api.js";
import { loadRequests, uploadRequestAttachment } from "../../lib/requests.js";
import { useRemoteData } from "../../lib/useRemoteData.js";
import MaintenanceAttachments from "../requests/MaintenanceAttachments.jsx";

function AddRequestAttachments({request,onUploaded}){
  const input=useRef(null),busy=useRef(false);
  const [uploading,setUploading]=useState(false),[message,setMessage]=useState('');
  const count=request.maintenance_attachments?.length||0;
  const choose=async event=>{
    const files=[...event.target.files];event.target.value='';
    if(!files.length||busy.current)return;
    if(count+files.length>5){setMessage(`You can add ${5-count} more attachment${5-count===1?'':'s'} to this request.`);return;}
    const allowed=new Set(['image/jpeg','image/png','image/webp','application/pdf']);
    const invalid=files.find(file=>!allowed.has(file.type)||file.size>10*1024*1024);
    if(invalid){setMessage(`${invalid.name} must be a JPG, PNG, WebP, or PDF no larger than 10 MB.`);return;}
    busy.current=true;setUploading(true);setMessage('');
    try{
      for(let index=0;index<files.length;index++){setMessage(`Uploading ${index+1} of ${files.length}: ${files[index].name}`);const saved=await uploadRequestAttachment(api,request.id,files[index]);if(!saved?.id)throw new Error('The server did not confirm the attachment. Please retry.');}
      await onUploaded();setMessage(`${files.length} attachment${files.length===1?'':'s'} uploaded successfully.`);
    }catch(error){setMessage(error.message||'Unable to upload the attachment. Please retry.');}
    finally{busy.current=false;setUploading(false);}
  };
  if(count>=5)return <p className="mt-2 text-xs text-slate-500">Maximum of 5 attachments reached.</p>;
  return <div className="mt-2"><input ref={input} aria-label="Choose maintenance attachments" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={choose} className="sr-only"/><button type="button" disabled={uploading} onClick={()=>input.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"><Paperclip size={14}/>{uploading?'Uploading…':count?'Add more attachments':'Add attachment'}</button>{message&&<p role="status" className={`mt-1.5 text-xs ${message.includes('successfully')?'text-emerald-700':uploading?'text-blue-700':'text-rose-700'}`}>{message}</p>}</div>;
}

export default function MaintenanceRequestStatus({ onOpenChat }) {
  const { data, loading, error, reload } = useRemoteData(loadRequests);
  return <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
    <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-bold text-slate-900">Maintenance requests</h2><p className="mt-0.5 text-xs text-slate-500">Track updates from the building admin.</p></div><button type="button" onClick={onOpenChat} className="shrink-0 text-xs font-semibold text-blue-600 hover:underline">New request</button></div>
    <div className="mt-3 divide-y divide-slate-100">
      {loading ? <PageSkeleton variant="list" label="Loading requests..."/> : error ? <p role="alert" className="text-xs text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p> : !data.length ? <p className="text-xs text-slate-500">No requests submitted yet.</p> : data.map(request => {
        const Icon = request.status === "Resolved" ? CheckCircle2 : Clock3;
        const style = request.status === "Resolved" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700";
        return <article key={request.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + style}><Icon size={17} /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{request.subject}</p><span className={"shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold " + style}>{request.status}</span></div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-500">{request.message}</p>
            <p className="mt-1 text-[11px] text-slate-400">{request.kind === "maintenance" ? "Maintenance" : "Other request"} · Submitted {new Date(request.created_at).toLocaleDateString("en-PH")}</p>
            {request.admin_note && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Admin update: {request.admin_note}</p>}
            <div className="mt-3 flex items-center" aria-label={`Request progress: ${request.status}`}>{['New','Scheduled','In progress','Resolved'].map((step,index)=>{const current=['New','Scheduled','In progress','Resolved'].indexOf(request.status);return <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none"><span title={step} className={`h-2.5 w-2.5 shrink-0 rounded-full ${index<=current?'bg-blue-600':'bg-slate-200'}`}/>{index<3&&<span className={`h-0.5 min-w-4 flex-1 ${index<current?'bg-blue-600':'bg-slate-200'}`}/>}</div>})}</div>
            {request.kind === "maintenance" && <MaintenanceAttachments requestId={request.id} attachments={request.maintenance_attachments}/>}
            {request.kind === "maintenance" && <AddRequestAttachments request={request} onUploaded={reload}/>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
