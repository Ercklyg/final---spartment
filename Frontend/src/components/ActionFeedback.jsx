import { useEffect, useRef, useSyncExternalStore } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { dismissFeedback, getFeedback, subscribeFeedback } from '../lib/actionFeedback.js';

export default function ActionFeedback(){
  const messages=useSyncExternalStore(subscribeFeedback,getFeedback);
  const panel=useRef(null);
  useEffect(()=>{
    const element=panel.current;
    // Native popovers remain visible above modal dialogs without taking focus.
    if(element?.showPopover){
      if(element.matches(':popover-open'))element.hidePopover();
      if(messages.length)element.showPopover();
    }
  },[messages]);
  return <div ref={panel} popover="manual" aria-label="Action confirmations" className="action-feedback-panel">
    {messages.map(({id,message,type})=>{
      const Icon=type==='error'?CircleAlert:type==='info'?Info:CheckCircle2;
      return <div key={id} role={type==='error'?'alert':'status'} aria-atomic="true" className={'action-feedback-message action-feedback-'+type}>
        <Icon size={23} aria-hidden="true" className="mt-0.5 shrink-0"/>
        <div className="min-w-0 flex-1"><p className="font-semibold">{type==='error'?'Action could not be completed':type==='info'?'Action update':'Success'}</p><p className="mt-1 text-sm leading-5">{message}</p></div>
        <button type="button" onClick={()=>dismissFeedback(id)} aria-label="Dismiss confirmation" className="rounded-md p-1 hover:bg-black/5 focus-visible:outline-2"><X size={18}/></button>
      </div>;
    })}
  </div>;
}
