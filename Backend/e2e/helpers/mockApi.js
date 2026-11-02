const json = (route,body,status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
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

export async function mockAdminApi(page,{startAuthenticated=false}={}) {
  let authenticated=startAuthenticated;
  const calls=[];
  await page.route('**/api/**',async route=>{
    const request=route.request();
    const url=new URL(request.url());
    const path=url.pathname.replace(/^\/api/,'');
    calls.push({method:request.method(),path,search:url.search,body:request.postDataJSON?.()});

    if(path==='/auth/session')return json(route,authenticated?{user,expires_at:future}:null);
    if(path==='/auth/login'){
      const body=request.postDataJSON();
      if(body.password==='wrong-password')return json(route,{error:'The email or password is incorrect.',code:'invalid_credentials'},401);
      authenticated=true;return json(route,{user,expires_at:future});
    }
    if(path==='/auth/profile')return json(route,{id:user.id,role:'admin',full_name:'Test Admin'});
    if(path==='/public/config')return json(route,{idleTimeoutMinutes:15});
    if(path==='/analytics')return json(route,dashboard);
    if(path==='/analytics/recommendations')return json(route,{fallback:true,reason:'Disabled in browser tests.'});
    if(path==='/notifications/admin')return json(route,[]);
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
