import assert from 'node:assert/strict';
import test from 'node:test';
import { maxAttachmentBytes, validateMaintenanceFile } from './maintenanceAttachments.js';

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
