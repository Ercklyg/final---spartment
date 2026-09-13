import { formatTenantDate, formatTenantRent } from "../../lib/tenantAccount.js";
import { Building2, Mail, UserRound } from "lucide-react";
function AccountInformation({ account }) { const details = [
{label:"Name",value:account.full_name,icon:UserRound},
{label:"Email",value:account.email || "Not specified",icon:Mail},
{label:"Phone",value:account.phone || "Not specified",icon:UserRound},
{label:"Room",value:account.room?.room_number || "Not assigned",detail:account.room ? (account.room.buildings?.name || "Building")+" / Floor "+account.room.floor : "Contact your administrator for a room assignment.",icon:Building2},
{label:"Monthly rent",value:formatTenantRent(account.rent),icon:Building2},
{label:"Move-in date",value:formatTenantDate(account.lease?.move_in_date),icon:Building2},
{label:"Lease end date",value:formatTenantDate(account.lease?.lease_end_date),icon:Building2},
{label:"Emergency contact",value:account.assignment ? account.assignment.emergency_name+" / "+account.assignment.emergency_phone+" ("+account.assignment.relationship+")" : "Not specified",icon:UserRound}
]; return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-6"><div className="flex items-center gap-3 sm:gap-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-[60px] sm:w-[60px]"><UserRound size={24} className="sm:hidden"/><UserRound size={29} className="hidden sm:block"/></span><div><h2 className="text-base font-bold tracking-tight sm:text-lg">Account information</h2><p className="mt-0.5 text-xs text-slate-500 sm:mt-1 sm:text-sm">This information is used for your tenant account.</p></div></div><div className="mt-4 space-y-2 sm:mt-5">{details.map(({ label, value, detail, icon: Icon }) => <div key={label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 sm:grid sm:min-h-[54px] sm:grid-cols-[275px_1fr] sm:items-center sm:px-4 sm:py-2"><div className="flex items-center gap-2 text-xs text-slate-500 sm:gap-4 sm:text-sm"><Icon size={17} className="sm:hidden"/><Icon size={21} className="hidden sm:block"/>{label}</div><div className="mt-1 sm:mt-0"><p className="text-sm font-semibold text-slate-900">{value}</p>{detail && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{detail}</p>}</div></div>)}</div></section>; }
export default AccountInformation;
