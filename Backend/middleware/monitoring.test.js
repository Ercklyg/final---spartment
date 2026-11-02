import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { requestMonitoring } from './monitoring.js';

test('request monitoring assigns a safe correlation ID',()=>{
  const req={method:'GET',originalUrl:'/api/test'};
  const res=new EventEmitter();
  res.statusCode=200;
  res.setHeader=(name,value)=>{res.headers={...res.headers,[name]:value};};
  let continued=false;
  requestMonitoring(req,res,()=>{continued=true;});
  assert.match(req.requestId,/^[A-F0-9]{8}$/);
  assert.equal(res.headers['X-Request-ID'],req.requestId);
  assert.equal(continued,true);
  res.emit('finish');
});
