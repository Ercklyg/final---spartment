import assert from 'node:assert/strict';
import test from 'node:test';
import { updateLoginLimit } from './loginLimit.js';

const request=()=>({ip:'127.0.0.1',body:{email:'Tenant@Example.com'}});

test('login limiter sends distinct check, failure and success actions without credentials',async()=>{
  const originalFetch=globalThis.fetch;
  const originalSecret=process.env.RECOVERY_STORAGE_SECRET;
  const originalUrl=process.env.SUPABASE_URL;
  const originalKey=process.env.SUPABASE_ANON_KEY;
  const bodies=[];
  process.env.RECOVERY_STORAGE_SECRET='test-secret';
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY='public-test-key';
  globalThis.fetch=async(_url,options)=>{bodies.push(JSON.parse(options.body));return {ok:true,json:async()=>({allowed:true})};};
  try{
    for(const action of ['login-check','login-failure','login-success'])await updateLoginLimit(request(),action);
    assert.deepEqual(bodies.map(body=>body.action),['login-check','login-failure','login-success']);
    assert.ok(bodies.every(body=>/^[a-f0-9]{64}$/.test(body.key)&&/^[a-f0-9]{64}$/.test(body.ipKey)));
    assert.ok(bodies.every(body=>!Object.hasOwn(body,'email')&&!Object.hasOwn(body,'password')));
  }finally{
    globalThis.fetch=originalFetch;
    if(originalSecret===undefined)delete process.env.RECOVERY_STORAGE_SECRET;else process.env.RECOVERY_STORAGE_SECRET=originalSecret;
    if(originalUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=originalUrl;
    if(originalKey===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=originalKey;
  }
});

test('login limiter returns 429 and Retry-After for a blocked check',async()=>{
  const originalFetch=globalThis.fetch;
  const originalSecret=process.env.RECOVERY_STORAGE_SECRET;
  const originalUrl=process.env.SUPABASE_URL;
  process.env.RECOVERY_STORAGE_SECRET='test-secret';
  process.env.SUPABASE_URL='https://example.supabase.co';
  globalThis.fetch=async()=>({ok:true,json:async()=>({allowed:false,retryAfter:90})});
  try{
    await assert.rejects(updateLoginLimit(request(),'login-check'),error=>error.status===429&&error.code==='login_limited'&&error.retryAfter===90);
  }finally{
    globalThis.fetch=originalFetch;
    if(originalSecret===undefined)delete process.env.RECOVERY_STORAGE_SECRET;else process.env.RECOVERY_STORAGE_SECRET=originalSecret;
    if(originalUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=originalUrl;
  }
});
