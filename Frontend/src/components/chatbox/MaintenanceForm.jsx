import { api } from "../../lib/api.js";
import { submitTenantRequest, uploadRequestAttachment } from "../../lib/requests.js";

import { ArrowLeft, FileImage, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useOnlineStatus } from "../../lib/useOnlineStatus.js";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

function MaintenanceForm({ onBack, prefilledRoom = "" }) {
  const online=useOnlineStatus();
  const draftKey='spartment-ui:maintenance-draft';
  const busy=useRef(false); const attempt=useRef(null); const [saving,setSaving]=useState(false); const [submitError,setSubmitError]=useState(""); const [sent,setSent]=useState(false); const [files,setFiles]=useState([]); const [progress,setProgress]=useState("");
  const [formData, setFormData] = useState(()=>{
    try {
      const saved=JSON.parse(sessionStorage.getItem(draftKey));
      return saved&&typeof saved==='object'?{roomNumber:prefilledRoom||saved.roomNumber||'',issue:saved.issue||'',description:saved.description||'',priority:['Normal','High','Urgent'].includes(saved.priority)?saved.priority:'Normal'}:{roomNumber:prefilledRoom,issue:'',description:'',priority:'Normal'};
    } catch { return {roomNumber:prefilledRoom,issue:'',description:'',priority:'Normal'}; }
  });
  useEffect(()=>{try{sessionStorage.setItem(draftKey,JSON.stringify(formData));}catch{/* Draft storage is optional. */}},[formData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if(!online){setSubmitError('You are offline. Your form is saved; reconnect and retry.');return;}
    if(busy.current)return;
    busy.current=true;setSaving(true);setSubmitError("");
    const signature=JSON.stringify([formData,files.map(file=>[file.name,file.size,file.type,file.lastModified])]);if(attempt.current?.signature!==signature)attempt.current={signature,id:crypto.randomUUID(),uploaded:new Set(),requestSaved:false};
    try{await submitTenantRequest(api,'maintenance',formData,attempt.current.id);attempt.current.requestSaved=true;for(let index=0;index<files.length;index++){const file=files[index],key=`${file.name}:${file.size}:${file.lastModified}`;if(attempt.current.uploaded.has(key))continue;setProgress(`Uploading ${index+1} of ${files.length}: ${file.name}`);await uploadRequestAttachment(api,attempt.current.id,file);attempt.current.uploaded.add(key);}try{sessionStorage.removeItem(draftKey);}catch{/* Draft cleanup is optional. */}setSent(true);}catch(error){setSubmitError(attempt.current?.requestSaved&&attempt.current.uploaded.size<files.length?`Your request was saved, but an attachment needs retrying: ${error.message}`:error.message);}finally{busy.current=false;setSaving(false);setProgress("");}
  }

  function chooseFiles(event){const chosen=[...event.target.files];const allowed=new Set(['image/jpeg','image/png','image/webp','application/pdf']);if(files.length+chosen.length>5){setSubmitError('You can attach up to 5 files.');event.target.value='';return;}const invalid=chosen.find(file=>!allowed.has(file.type)||file.size>10*1024*1024);if(invalid){setSubmitError(`${invalid.name} must be a JPG, PNG, WebP, or PDF no larger than 10 MB.`);event.target.value='';return;}setFiles(previous=>[...previous,...chosen]);setSubmitError('');event.target.value='';}

  if(sent)return <div role="status" className="p-5"><h3 className="font-bold">Request submitted</h3><p className="mt-2 text-sm">Your message{files.length?` and ${files.length} attachment${files.length===1?'':'s'}`:''} has been saved for the administrator.</p><button type="button" onClick={onBack} className="mt-4 text-blue-600 underline">Back to menu</button></div>;
  return (
    <div className="flex flex-col p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">
            Maintenance Request
          </h3>
          <p className="truncate text-xs text-slate-500">
            We&apos;ll forward this to building admin
          </p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
          {formData.priority} priority
        </span>
      </div>

      <form onSubmit={handleSubmit}><fieldset disabled={saving} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label htmlFor="roomNumber" className={labelClass}>
              Room number
            </label>
            <input
              id="roomNumber"
              name="roomNumber"
              type="text"
              required
              readOnly={Boolean(prefilledRoom)}
              placeholder="e.g. 204"
              value={formData.roomNumber}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="issue" className={labelClass}>
              Issue type
            </label>
            <input
              id="issue"
              name="issue"
              type="text"
              required
              placeholder="Leaking faucet"
              value={formData.issue}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-slate-700">Maintenance priority</legend>
          <div className="flex flex-wrap gap-2">
            {[['Normal', 'Routine repair', 'bg-slate-100 text-slate-800 border-slate-400'], ['High', 'Needs prompt attention', 'bg-orange-50 text-orange-800 border-orange-400'], ['Urgent', 'Immediate attention needed', 'bg-rose-50 text-rose-800 border-rose-400']].map(([level, description, color]) => (
              <label key={level} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${formData.priority === level ? color : 'border-slate-300 bg-white text-slate-700'}`}>
                <input type="radio" name="priority" value={level} checked={formData.priority === level} onChange={handleChange} aria-description={description} className="h-4 w-4 accent-blue-600"/>
                {level}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">{formData.priority === 'Normal' ? 'Routine repairs that can be scheduled.' : formData.priority === 'High' ? 'A problem affecting daily use that needs prompt attention.' : 'A serious issue needing immediate attention. For immediate danger, contact emergency services and building staff directly; do not wait for chat.'}</p>
        </fieldset>

        <div>
          <label htmlFor="description" className={labelClass}>
            Describe the problem
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            placeholder="Where is it, when did it start, how urgent is it…"
            value={formData.description}
            onChange={handleChange}
            className="min-h-[110px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
          />
        </div>

        <div><label htmlFor="maintenance-files" className={labelClass}>Photos or documents <span className="font-normal text-slate-500">(optional)</span></label><label htmlFor="maintenance-files" className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"><FileImage size={17}/>Add JPG, PNG, WebP, or PDF</label><input id="maintenance-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={chooseFiles} className="sr-only"/><p className="mt-1 text-[11px] text-slate-500">Up to 5 files, 10 MB each.</p>{files.length>0&&<ul className="mt-2 space-y-1.5">{files.map((file,index)=><li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-2 text-xs"><span className="min-w-0 flex-1 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>setFiles(items=>items.filter((_,itemIndex)=>itemIndex!==index))} className="rounded p-1 text-slate-500 hover:bg-white"><X size={14}/></button></li>)}</ul>}</div>

        <button
          type="submit"
          disabled={!online||saving}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.5)] transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
        >
          <Send size={16} />
          {online?'Submit request':'Reconnect to submit'}
        </button>
      {!online&&<p role="status" className="text-sm text-amber-800">Your typed details are saved for this browser session. Attachments must be selected again after a page reload.</p>}
      {submitError&&<p role="alert" className="text-sm text-rose-700">{submitError}</p>}{saving&&<p role="status" className="text-sm">{progress||'Submitting request...'}</p>}</fieldset></form>
    </div>
  );
}

export default MaintenanceForm;
