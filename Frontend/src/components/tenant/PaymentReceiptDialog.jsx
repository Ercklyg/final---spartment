import PageSkeleton from '../PageSkeleton.jsx';
import { showFeedback } from "../../lib/actionFeedback.js";
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { loadPaymentReceipt, receiptHtml } from '../../lib/paymentReceipt.js';
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
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="payment-receipt-heading" className="m-auto w-[calc(100%-2rem)] max-w-3xl rounded-xl bg-white p-5 backdrop:bg-slate-950/40"><div className="flex items-center justify-between gap-3"><h2 id="payment-receipt-heading" className="text-xl font-bold">Payment receipt</h2><button onClick={onClose} className="rounded-lg border px-3 py-2">Close</button></div>{error&&<p role="alert" className="mt-3 text-rose-700">{error} {!html&&<button onClick={()=>{setError('');setRevision(n=>n+1);}} className="underline">Retry</button>}</p>}{!html&&!error&&<PageSkeleton variant="table" label="Loading saved payment..."/>}{html&&<iframe ref={frame} title="Printable payment receipt" sandbox="allow-same-origin allow-modals" srcDoc={html} onLoad={()=>setReady(true)} className="mt-4 h-[60dvh] w-full rounded-lg border"/>}<div className="mt-4 flex flex-wrap gap-3"><button disabled={!html||!ready} onClick={print} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Print / Save as PDF</button><button disabled={!html} onClick={download} className="rounded-lg border px-4 py-2 disabled:opacity-50">Download receipt</button></div></dialog>;
}
