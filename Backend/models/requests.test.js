import test from 'node:test';
import assert from 'node:assert/strict';
import {submitTenantRequest} from './requests.js';
import {errorHandler} from '../middleware/errors.js';

const form={issue:'Leaking roof',description:'Water is leaking.',priority:'Normal'};

test('maintenance without an active assignment returns a clear explanation without a retry instruction or error reference',async()=>{
 const client={rpc:async()=>({error:{code:'P0001',message:'An active room assignment is required'}})};
 let error;
 try{await submitTenantRequest(client,'maintenance',form,'test-request');}catch(reason){error=reason;}
 assert.equal(error.status,403);assert.equal(error.code,'active_assignment_required');
 assert.match(error.message,/do not have an active room assignment/);
 assert.match(error.message,/still view your previous requests/);
 assert.match(error.message,/contact the administrator/);
 assert.doesNotMatch(error.message,/retry|reference/i);
 const response={headersSent:false,status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
 errorHandler(error,{method:'POST',originalUrl:'/api/requests/submit'},response,()=>{});
 assert.equal(response.statusCode,403);assert.equal(response.body.errorId,undefined);
 assert.equal(response.body.error,error.message);
});

test('unexpected database failures retain the generic safe error instead of being mislabeled as a move-out restriction',async()=>{
 const client={rpc:async()=>({error:{code:'42P01',message:'relation internal_table does not exist'}})};
 await assert.rejects(submitTenantRequest(client,'maintenance',form,'test-request'),error=>error.code==='operation_failed'&&error.report===true&&!error.message.includes('internal_table'));
});

test('active maintenance and general requests still submit normally',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return {};}};
 await submitTenantRequest(client,'maintenance',form,'maintenance-id');
 await submitTenantRequest(client,'other',{subject:'Previous tenancy',message:'A question about the final bill.'},'other-id');
 assert.equal(calls.length,2);assert.equal(calls[1].args.p_kind,'other');
});
