import { today } from './billing.js';
import { readAll } from './readAll.js';
const cents = value => Math.round(Number(value || 0)*100);
export async function loadAdminAnalytics(client) {
  const {data:auth,error}=await client.auth.getUser();
  if(error || !auth.user)throw new Error('Sign in to view analytics.');
  const profile=await client.from('profiles').select('role').eq('id',auth.user.id).single();
  if(profile.error || profile.data?.role!=='admin')throw new Error('Administrator access required.');
  const all=(table,columns)=>readAll(()=>client.from(table).select(columns).order('id'));
  const [rooms,profiles,leases,bills,payments,requests,inquiries]=await Promise.all([
    all('rooms','id,room_number,status,monthly_rate,buildings(name)'),all('profiles','id,full_name,role'),
    all('leases','id,tenant_id,room_id,status'),all('bills','id,lease_id,bill_type,billing_period,due_date,rent_amount,electricity_amount,water_amount'),
    all('payments','id,bill_id,amount,payment_date'),all('tenant_requests','id,kind,status,subject,created_at'),all('inquiries','id,status,created_at'),
  ]);
  return {rooms,profiles,leases,bills,payments,requests,inquiries,loadedAt:new Date().toISOString()};
}
export function periodSeries(data,month,group='Monthly') {
  const [year,m]=month.split('-').map(Number);const step=group==='Yearly'?12:group==='Quarterly'?3:1;
  const start=group==='Yearly'?0:group==='Quarterly'?Math.floor((m-1)/3)*3:m-1;
  const limit=monthEnd(month)<today()?monthEnd(month):today();
  return Array.from({length:6},(_,i)=>{
    const date=new Date(Date.UTC(year,start-(5-i)*step,1));const end=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+step,1));
    const from=date.toISOString().slice(0,10),to=end.toISOString().slice(0,10);
    const inPeriod=value=>value>=from&&value<to&&value<=limit;
    const value=data.payments.filter(p=>inPeriod(p.payment_date)).reduce((sum,p)=>sum+cents(p.amount),0)/100;
    const billed=data.bills.filter(b=>inPeriod(b.billing_period)).reduce((sum,b)=>sum+cents(b.rent_amount)+cents(b.electricity_amount)+cents(b.water_amount),0)/100;
    const label=group==='Monthly'?from.slice(0,7):group==='Quarterly'?`Q${Math.floor(date.getUTCMonth()/3)+1} ${date.getUTCFullYear()}`:String(date.getUTCFullYear());
    return {label,value,billed};
  });
}
export function monthEnd(month) {const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);}
export function comparisonTotals(series) {
  return {
    billed: series.reduce((sum, point) => sum + cents(point.billed), 0) / 100,
    collected: series.reduce((sum, point) => sum + cents(point.value), 0) / 100,
    periods: series.length,
  };
}
export function analyticsSnapshot(data,month,asOf=today()) {
  const cutoff=monthEnd(month)<asOf?monthEnd(month):asOf;
  const leaseMap=new Map(data.leases.map(l=>[l.id,l]));const profileMap=new Map(data.profiles.map(p=>[p.id,p]));const roomMap=new Map(data.rooms.map(r=>[r.id,r]));
  const paymentTotals=new Map();
  for(const p of data.payments)if(p.payment_date<=cutoff)paymentTotals.set(p.bill_id,(paymentTotals.get(p.bill_id)||0)+cents(p.amount));
  const rows=data.bills.filter(b=>b.billing_period<=cutoff).map(b=>{
    const lease=leaseMap.get(b.lease_id),room=roomMap.get(lease?.room_id);const total=cents(b.rent_amount)+cents(b.electricity_amount)+cents(b.water_amount);
    const paid=paymentTotals.get(b.id)||0,balance=Math.max(0,total-paid);
    return {...b,total:total/100,paid:paid/100,balance:balance/100,name:profileMap.get(lease?.tenant_id)?.full_name || 'Unknown tenant',room:room?`${room.buildings?.name || 'Building'} / ${room.room_number}`:'Unassigned',status:balance===0?'Paid':b.due_date<cutoff?'Late':paid>0?'Partially paid':'Pending'};
  });
  const selected=rows.filter(b=>b.billing_period.slice(0,7)===month);
  const available=data.rooms.filter(r=>r.status==='available');
  const outstanding=rows.reduce((sum,b)=>sum+cents(b.balance),0)/100;
  const late=rows.filter(b=>b.status==='Late');
  return {cutoff,rows,selected,outstanding,late,overdue:late.reduce((sum,b)=>sum+cents(b.balance),0)/100,
    collected:data.payments.filter(p=>p.payment_date.slice(0,7)===month&&p.payment_date<=cutoff).reduce((sum,p)=>sum+cents(p.amount),0)/100,
    inventory:['occupied','available','reserved','maintenance'].map(status=>({status,count:data.rooms.filter(r=>r.status===status).length})),
    occupancy:data.rooms.length?data.rooms.filter(r=>r.status==='occupied').length/data.rooms.length*100:0,
    activeTenants:new Set(data.leases.filter(l=>l.status==='active'&&profileMap.get(l.tenant_id)?.role==='tenant').map(l=>l.tenant_id)).size,
    available:available.length,vacancyGap:available.reduce((sum,r)=>sum+cents(r.monthly_rate),0)/100,
    openRequests:data.requests.filter(r=>r.status!=='Resolved'),openInquiries:data.inquiries.filter(r=>r.status!=='Resolved'),
  };
}
export function forecastCollections(data,month) {
  const series=periodSeries(data,month).slice(-3);
  // Require three completed months with recorded collections, rather than
  // inventing history for a newly connected database.
  if(month>=today().slice(0,7)||series.some(p=>!data.payments.some(row=>row.payment_date.slice(0,7)===p.label)))return null;
  return Math.round(series.reduce((sum,p)=>sum+cents(p.value),0)/3)/100;
}
export function csvCell(value) {
  let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function analyticsCsv(snapshot,series,month) {
  const rows=[['Report through',snapshot.cutoff],['Selected month',month],[],['Period','Billed PHP (billing period)','Collected PHP (payment date)'],...series.map(p=>[p.label,p.billed,p.value]),[],['Bill ID','Tenant','Room','Type','Period','Due date','Billed PHP','Paid through cutoff PHP','Balance PHP','Status'],...snapshot.rows.map(b=>[b.id,b.name,b.room,b.bill_type,b.billing_period,b.due_date,b.total,b.paid,b.balance,b.status]),[],['Current inventory (not historical)','Rooms'],...snapshot.inventory.map(r=>[r.status,r.count]),['Current available-room monthly rate total PHP',snapshot.vacancyGap]];
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
