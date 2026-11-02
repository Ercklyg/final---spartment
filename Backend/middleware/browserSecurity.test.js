import test from 'node:test';
import assert from 'node:assert/strict';
import { browserSecurity } from './browserSecurity.js';

const request=({path='/requests/id/attachments',type='image/png',origin='http://localhost:5173',header='1'}={})=>({
  method:'POST',path,
  get:name=>name==='Origin'?origin:name==='X-Spartment-Request'?header:undefined,
  is:value=>Array.isArray(value)?value.includes(type):value===type,
});
const response=()=>({set(){}});

test('trusted maintenance uploads allow only supported file content types',()=>{
  let error='not-called';
  browserSecurity(request(),response(),value=>{error=value;});
  assert.equal(error,undefined);
  browserSecurity(request({type:'text/html'}),response(),value=>{error=value;});
  assert.equal(error.status,415);
});

test('attachment uploads still require the trusted origin and CSRF header',()=>{
  let error;
  browserSecurity(request({origin:'https://attacker.example'}),response(),value=>{error=value;});
  assert.equal(error.status,403);
  browserSecurity(request({header:null}),response(),value=>{error=value;});
  assert.equal(error.status,403);
});

test('the file exception cannot bypass JSON checks on another route',()=>{
  let error;
  browserSecurity(request({path:'/billing/payments'}),response(),value=>{error=value;});
  assert.equal(error.status,415);
});
