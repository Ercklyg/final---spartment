const json = (route,body,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
const requestBody=request=>{
  try{return request.postDataJSON();}catch{return undefined;}
};
const user={id:'11111111-1111-4111-8111-111111111111',email:'admin@example.test'};
const future=Math.floor(Date.now()/1000)+3600;

const dashboard={
  snapshot:{cutoff:'2026-11-02',rows:[],selected:[],late:[],outstanding:0,overdue:0,collected:0,
    inventory:['occupied','available','reserved','maintenance'].map(status=>({status,count:0})),occupancy:0,
    activeTenants:0,available:0,vacancyGap:0,openRequests:[],openInquiries:[],collectionHealth:null},
  series:[],forecast:null,forecastStatus:'missing_history',comparison:{billed:0,collected:0,periods:0},loadedAt:new Date().toISOString(),
};

const requestAt=index=>({
  id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,
  kind:'maintenance',subject:`Leaking faucet ${index+1}`,message:'Water is leaking under the sink.',priority:index?'Normal':'High',
  status:'New',admin_note:'',created_at:new Date(Date.UTC(2026,10,2,0,index)).toISOString(),
  profiles:{full_name:`Tenant ${index+1}`},rooms:{room_number:String(101+index),buildings:{name:'Main Building'}},maintenance_attachments:[],
});

export async function mockAdminApi(page,{startAuthenticated=false,analyticsData={}}={}) {
  let authenticated=startAuthenticated;
  let paymentRecorded=false;
  const calls=[];
  await page.route('**/api/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    const path=url.pathname.replace(/^\/api/,'');
    calls.push({method:request.method(),path,search:url.search,body:requestBody(request)});

    if(path==='/auth/session')return json(route,authenticated?{user,expires_at:future}:null);
    if(path==='/auth/login'){
      const body=request.postDataJSON();
      if(body.password==='wrong-password')return json(route,{error:'The email or password is incorrect.',code:'invalid_credentials'},401);
      authenticated=true;return json(route,{user,expires_at:future});
    }
    if(path==='/auth/forgot-password')return json(route,{message:'If an account matches that email, a reset link has been sent.'});
    if(path==='/auth/profile')return json(route,{id:user.id,role:'admin',full_name:'Test Admin'});
    if(path==='/public/config')return json(route,{idleTimeoutMinutes:15});
    if(path==='/analytics')return json(route,{...dashboard,...analyticsData});
    if(path==='/analytics/recommendations')return json(route,{fallback:true,reason:'Disabled in browser tests.'});
    if(path==='/notifications/admin')return json(route,[]);
    if(path==='/rooms')return json(route,[{id:'33333333-3333-4333-8333-333333333333',room_number:'209',floor:2,status:'available',monthly_rate:2500,buildings:{name:'Main Building'}}]);
    if(path==='/tenants'&&request.method()==='GET')return json(route,{data:[],total:0,offset:0,limit:30});
    if(path==='/tenants'&&request.method()==='POST')return json(route,{ok:true,id:'44444444-4444-4444-8444-444444444444'},201);
    if(path==='/billing/leases')return json(route,[{id:'55555555-5555-4555-8555-555555555555',rent:2500,billed:true,profiles:{full_name:'Test Tenant'},rooms:{room_number:'209',buildings:{name:'Main Building'}}}]);
    if(path==='/billing/workspace'){
      const month=url.searchParams.get('month');
      const payment={id:'66666666-6666-4666-8666-666666666666',amount:500,payment_date:`${month}-02`,reference_note:'E2E payment'};
      const bill={id:'77777777-7777-4777-8777-777777777777',lease_id:'55555555-5555-4555-8555-555555555555',bill_type:'rent',billing_period:`${month}-01`,due_date:`${month}-30`,rent_amount:2500,electricity_amount:0,water_amount:0,total:2500,paid:paymentRecorded?500:0,balance:paymentRecorded?2000:2500,displayStatus:paymentRecorded?'Partially paid':'Pending',payments:paymentRecorded?[payment]:[],leases:{tenant_id:'88888888-8888-4888-8888-888888888888',profiles:{full_name:'Test Tenant'},rooms:{room_number:'209',buildings:{name:'Main Building'}}}};
      return json(route,{bills:[bill],leases:[],summary:{months:{[month]:{rent:{total:2500,paid:paymentRecorded?500:0,balance:paymentRecorded?2000:2500,overdue:0}}}},total:1,periodTotal:1,offset:0,limit:25});
    }
    if(path==='/billing/payments'&&request.method()==='POST'){paymentRecorded=true;return json(route,{ok:true},201);}
    if(path==='/payments/66666666-6666-4666-8666-666666666666/receipt')return json(route,{id:'66666666-6666-4666-8666-666666666666',amount:500,payment_date:'2026-11-02',reference_note:'E2E payment',bills:{id:'77777777-7777-4777-8777-777777777777',bill_type:'rent',billing_period:'2026-11-01',due_date:'2026-11-30',leases:{profiles:{full_name:'Test Tenant'},rooms:{room_number:'209',buildings:{name:'Main Building'}}}}});
    if(path==='/requests/workspace'){
      const filter=url.searchParams.get('filter')||'All';
      const offset=Number(url.searchParams.get('offset')||0);
      if(filter==='Inquiry')return json(route,{requests:[],inquiries:[{id:'22222222-2222-4222-8222-222222222222',full_name:'Guest User',email:'guest@example.test',phone:'09123456789',preferred_room:'Room 209',move_in_date:'2026-12-01',message:'Is this room available?',status:'New',created_at:'2026-11-02T01:00:00.000Z'}],total:1,offset,limit:20});
      const total=25;
      return json(route,{requests:Array.from({length:Math.min(20,total-offset)},(_,index)=>requestAt(offset+index)),inquiries:[],total,offset,limit:20});
    }
    if(path.startsWith('/requests/')&&request.method()==='PATCH')return json(route,{ok:true});
    return json(route,{});
  });
  return {calls};
}

export async function mockTenantApi(page) {
  const calls=[];
  await page.route('**/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());const path=url.pathname.replace(/^\/api/,'');
    calls.push({method:request.method(),path,search:url.search,body:requestBody(request)});
    if(path==='/auth/session')return json(route,{user:{id:'88888888-8888-4888-8888-888888888888',email:'tenant@example.test'},expires_at:future});
    if(path==='/auth/profile')return json(route,{id:'88888888-8888-4888-8888-888888888888',role:'tenant',full_name:'Test Tenant'});
    if(path==='/public/config')return json(route,{idleTimeoutMinutes:15});
    if(path==='/account')return json(route,{id:'88888888-8888-4888-8888-888888888888',full_name:'Test Tenant',phone:'09123456789',role:'tenant',monthly_rent:2500,room:{id:'33333333-3333-4333-8333-333333333333',room_number:'209',floor:2,buildings:{name:'Main Building'}},move_in_date:'2026-01-01'});
    if(path==='/billing')return json(route,[]);
    if(path==='/requests'&&request.method()==='GET')return json(route,[]);
    if(path==='/notifications')return json(route,{data:[],total:0,unread:0,offset:0,limit:25,asOf:new Date().toISOString()});
    if(path==='/notifications/preferences')return json(route,{sound_enabled:false,browser_enabled:false,billing_enabled:true,payment_enabled:true,request_enabled:true,account_enabled:true});
    if(path==='/requests/submit'&&request.method()==='POST')return json(route,{ok:true},201);
    if(/^\/requests\/[^/]+\/attachments$/.test(path)&&request.method()==='POST')return json(route,{ok:true},201);
    return json(route,{});
  });
  return {calls};
}
