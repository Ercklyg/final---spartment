import { Download, Printer, X } from "lucide-react";
import PageSkeleton from '../PageSkeleton.jsx';
import { showFeedback } from "../../lib/actionFeedback.js";
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { loadPaymentReceipt, receiptHtml } from '../../lib/paymentReceipt.js';
import { closeFromBackdrop } from '../../lib/dialog.js';
export default function PaymentReceiptDialog({paymentId,onClose}) {
  const dialog=useRef(null),frame=useRef(null);
  const [html,setHtml]=useState(''),[error,setError]=useState(''),[ready,setReady]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();return ()=>previous?.focus();},[]);
  useEffect(()=>{
    const controller=new AbortController();
    loadPaymentReceipt(api.withSignal(controller.signal,{force:revision>0}),paymentId).then(payment=>setHtml(receiptHtml(payment))).catch(e=>{if(e?.name!=='AbortError')setError(e.message);});
    return ()=>controller.abort();
  },[paymentId,revision]);
  const download=()=>{const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`spartment-payment-${paymentId}.html`;link.click();showFeedback("Receipt download requested. Check your browser downloads.","info");setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const print=()=>{try{frame.current.contentWindow.focus();frame.current.contentWindow.print();showFeedback("Print dialog requested. Choose a printer or Save as PDF in your browser.","info");}catch{showFeedback('Printing is unavailable. Download the receipt and print it from your browser.','error');setError('Printing is unavailable. Download the receipt and print it from your browser.');}};
  return <dialog ref={dialog} onMouseDown={event=>closeFromBackdrop(event,onClose)} onCancel={onClose} aria-labelledby="payment-receipt-heading" className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/40 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 id="payment-receipt-heading" className="text-xl font-bold">Payment receipt</h2><button type="button" onClick={onClose} aria-label="Close receipt" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={19}/></button></div>{error&&<p role="alert" className="mt-3 text-rose-700">{error} {!html&&<button onClick={()=>{setError('');setRevision(n=>n+1);}} className="underline">Retry</button>}</p>}{!html&&!error&&<PageSkeleton variant="table" label="Loading saved payment..."/>}{html&&<iframe ref={frame} title="Printable payment receipt" sandbox="allow-same-origin allow-modals" srcDoc={html} onLoad={()=>setReady(true)} className="mt-4 h-[55dvh] w-full rounded-xl border border-slate-200 bg-slate-50"/>}<div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4"><button disabled={!html||!ready} onClick={print} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Printer size={17}/>Print / Save as PDF</button><button disabled={!html} onClick={download} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download size={17}/>Download HTML</button></div></dialog>;
}
