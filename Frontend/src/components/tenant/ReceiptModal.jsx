import { Download, ReceiptText, X } from "lucide-react";

function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;
  const downloadReceipt = () => {
    const content = ["Spartment", receipt.type + " payment receipt", "", "Amount paid: " + receipt.amount, "Tenant: Maria Santos", "Room: 201", "Billing period: " + receipt.period, "Due date: " + receipt.dueDate, "Status: " + receipt.status].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "spartment-" + receipt.type.toLowerCase().replaceAll(" ", "-") + "-receipt-" + receipt.period.replaceAll(" ", "-") + ".txt";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <div role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ReceiptText size={22}/></span><button type="button" onClick={onClose} aria-label="Close receipt" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={20}/></button></div><h2 id="receipt-title" className="mt-4 text-xl font-bold text-slate-900">{receipt.type} receipt</h2><p className="mt-1 text-sm text-slate-500">Payment recorded for {receipt.period}</p><div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><span className="text-sm text-slate-500">Amount paid</span><strong className="text-xl text-slate-900">{receipt.amount}</strong></div><dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-2 text-sm"><dt className="text-slate-500">Tenant</dt><dd className="font-medium">Maria Santos</dd><dt className="text-slate-500">Room</dt><dd className="font-medium">201</dd><dt className="text-slate-500">Due date</dt><dd className="font-medium">{receipt.dueDate}</dd><dt className="text-slate-500">Status</dt><dd className="font-semibold text-emerald-600">{receipt.status}</dd></dl></div><div className="mt-5 flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button><button type="button" onClick={downloadReceipt} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Download size={17}/>Download</button></div></div></div>;
}

export default ReceiptModal;
