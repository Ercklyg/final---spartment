import { CheckCircle2, WalletCards, Clock3 } from "lucide-react";
import { money } from "../../lib/billing.js";
import { formatTenantDate } from "../../lib/tenantAccount.js";
export default function BillingBalanceSummary({ summary }) {
  const Icon = summary.balance > 0 ? Clock3 : CheckCircle2;
  return <section className="flex flex-col gap-4 rounded-2xl bg-blue-600 p-5 text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)] sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15"><WalletCards size={23} /></span><div><p className="text-sm text-blue-100">Current balance</p><h2 className="text-3xl font-extrabold tracking-tight">{money(summary.balance)}</h2></div></div>
    <div className="rounded-xl bg-white/10 px-4 py-3 text-sm"><span className="flex items-center gap-2 font-semibold"><Icon size={17} />{!summary.count ? "No bills issued yet" : summary.balance > 0 ? "Payment outstanding" : "All issued bills are paid"}</span><p className="mt-1 text-xs text-blue-100">{summary.nextDue ? "Earliest unpaid due date: " + formatTenantDate(summary.nextDue) : "New bills will appear here when issued."}</p></div>
  </section>;
}
