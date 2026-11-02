import test from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler, HttpError, serviceError } from './errors.js';

function response() {
  return {
    headersSent:false,
    statusCode:null,
    body:null,
    status(value){this.statusCode=value;return this;},
    json(value){this.body=value;return this;},
  };
}

test('unexpected errors never expose internal messages',()=>{
  const res=response();
  errorHandler(new Error('DB_PASSWORD=do-not-show'),{method:'GET',originalUrl:'/api/test'},res,()=>{});
  assert.equal(res.statusCode,500);
  assert.equal(res.body.error,'Unable to complete the request. Please retry.');
  assert.match(res.body.errorId,/^[A-F0-9-]{8}$/);
  assert.doesNotMatch(JSON.stringify(res.body),/DB_PASSWORD|do-not-show/);
});

test('reported provider errors return safe text and a reference',()=>{
  const res=response();
  const error=serviceError(400,'Unable to save the change. Please retry.',new Error('relation secret_table failed'));
  errorHandler(error,{method:'POST',originalUrl:'/api/test'},res,()=>{});
  assert.equal(res.statusCode,400);
  assert.equal(res.body.error,'Unable to save the change. Please retry.');
  assert.equal(res.body.code,'operation_failed');
  assert.ok(res.body.errorId);
  assert.doesNotMatch(JSON.stringify(res.body),/secret_table/);
});

test('expected validation errors remain actionable without a reference',()=>{
  const res=response();
  errorHandler(new HttpError(400,'Enter a valid billing month.'),{method:'POST',originalUrl:'/api/test'},res,()=>{});
  assert.deepEqual(res.body,{error:'Enter a valid billing month.'});
});
