import PageSkeleton from "../PageSkeleton.jsx";
import { useState } from 'react';
import { loadBillingOverview } from '../../lib/billing.js';
import { useRemoteData } from '../../lib/useRemoteData.js';
import BillingBalanceSummary from './BillingBalanceSummary.jsx';
import UtilitySummaryCards from './UtilitySummaryCards.jsx';
import StatementSection from './StatementSection.jsx';

export default function LiveBilling() {
  const {data,error,loading,reload}=useRemoteData(loadBillingOverview);
  const [filter,setFilter]=useState('All');
  if(loading)return <PageSkeleton variant="tenant-billing" label="Loading bills..."/>;
  if(error)return <p role="alert" className="py-5 text-rose-700">{error} <button onClick={reload} className="underline">Retry</button></p>;
  return <div className="space-y-5">
    <BillingBalanceSummary summary={data.summary} />
    <div className="flex flex-wrap gap-2">{['All','Paid','Pending','Partially paid','Late'].map(status=><button key={status} type="button" onClick={()=>setFilter(status)} className={"rounded-lg px-3 py-2 text-sm font-medium "+(filter===status?"bg-blue-600 text-white":"border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{status}</button>)}<button onClick={reload} className="ml-auto text-sm font-medium text-blue-600 hover:underline">Refresh</button></div>
    <UtilitySummaryCards summary={data.summary} />
    <StatementSection type="rent" statusFilter={filter} bills={data.bills} />
    <StatementSection type="utility" statusFilter={filter} bills={data.bills} />
  </div>;
}
