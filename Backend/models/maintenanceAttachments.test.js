import assert from 'node:assert/strict';
import test from 'node:test';
import { maxAttachmentBytes, validateMaintenanceFile, uploadMaintenanceAttachment } from './maintenanceAttachments.js';

const samples={
 'image/jpeg':Buffer.from([0xff,0xd8,0xff,0x00]),
 'image/png':Buffer.from([137,80,78,71,13,10,26,10,0]),
 'image/webp':Buffer.from('RIFF0000WEBP'),
 'application/pdf':Buffer.from('%PDF-1.7'),
};

test('maintenance attachments accept supported files only when signatures match',()=>{
 for(const [type,buffer] of Object.entries(samples))assert.equal(validateMaintenanceFile(buffer,type,'evidence.file').mimeType,type);
 assert.throws(()=>validateMaintenanceFile(Buffer.from('not an image'),'image/png','fake.png'),/valid JPG/);
 assert.throws(()=>validateMaintenanceFile(samples['image/png'],'image/svg+xml','image.svg'),/valid JPG/);
});

test('maintenance attachments enforce names, content, and the 10 MB boundary',()=>{
 assert.throws(()=>validateMaintenanceFile(Buffer.alloc(0),'image/png','empty.png'),/Choose a file/);
 assert.throws(()=>validateMaintenanceFile(samples['image/png'],'image/png','bad\nname.png'),/file name is invalid/);
 const oversized=Buffer.alloc(maxAttachmentBytes+1);oversized.set(samples['image/jpeg']);
 assert.throws(()=>validateMaintenanceFile(oversized,'image/jpeg','large.jpg'),/10 MB or smaller/);
});

function fixture(status='New',failure=null){
 const state={status,uploaded:[],removed:[],registered:0};
 const client={
  from(table){
   const query={select(){return query;},eq(){return query;},async maybeSingle(){return {data:state.status==null?null:{status:state.status}};},then(resolve,reject){return Promise.resolve({count:0}).then(resolve,reject);}};
   assert.ok(['tenant_requests','maintenance_attachments'].includes(table));return query;
  },
  storage:{from(){return {
   async upload(path){state.uploaded.push(path);if(failure==='storage-race'){state.status='Resolved';return {error:{message:'row-level security'}};}return {};},
   async remove(paths){state.removed.push(...paths);return {};},
  };}},
  async rpc(){state.registered++;if(failure==='registration-race')return {error:{message:'This maintenance request has been resolved. New attachments are no longer accepted.'}};return {data:{}};},
 };
 return {client,state};
}
const upload=client=>uploadMaintenanceAttachment(client,'tenant-id','request-id',samples['application/pdf'],'application/pdf','evidence.pdf');

test('resolved maintenance rejects uploads before sending bytes to storage',async()=>{
 const {client,state}=fixture('Resolved');
 await assert.rejects(upload(client),e=>e.status===409&&e.code==='request_resolved');
 assert.deepEqual(state.uploaded,[]);assert.equal(state.registered,0);
});

test('active and reopened maintenance requests continue to accept valid attachments',async()=>{
 for(const status of ['New','Scheduled','In progress']){
  const {client,state}=fixture(status);const result=await upload(client);
  assert.ok(result.id);assert.equal(state.uploaded.length,1);assert.equal(state.registered,1);assert.deepEqual(state.removed,[]);
 }
});

test('resolution between storage upload and registration rejects the attachment and cleans up its file',async()=>{
 const {client,state}=fixture('In progress','registration-race');
 await assert.rejects(upload(client),e=>e.status===409&&e.code==='request_resolved');
 assert.equal(state.registered,1);assert.deepEqual(state.removed,state.uploaded);
});

test('resolution before storage accepts the file returns the same clear conflict response',async()=>{
 const {client,state}=fixture('Scheduled','storage-race');
 await assert.rejects(upload(client),e=>e.status===409&&e.code==='request_resolved');
 assert.equal(state.registered,0);
});

test('missing or unauthorized requests do not upload any bytes',async()=>{
 const {client,state}=fixture(null);
 await assert.rejects(upload(client),e=>e.status===404);assert.deepEqual(state.uploaded,[]);
});
