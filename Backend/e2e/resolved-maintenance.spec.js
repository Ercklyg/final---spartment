import { test, expect } from '@playwright/test';
import { mockTenantApi } from './helpers/mockApi.js';

const requestId='44444444-4444-4444-8444-444444444444';
const attachmentId='55555555-5555-4555-8555-555555555555';
const attachment={id:attachmentId,original_name:'repair-evidence.pdf',mime_type:'application/pdf',size_bytes:100,created_at:'2026-11-01T00:00:00Z'};
const request=(status='Resolved')=>({id:requestId,kind:'maintenance',subject:'Leaking roof',message:'Water leaks into the room.',priority:'Normal',status,admin_note:status==='Resolved'?'The roof repair is complete.':'A repair visit has been scheduled.',created_at:'2026-11-01T00:00:00Z',updated_at:status==='Resolved'?'2026-11-19T00:00:00Z':'2026-11-18T00:00:00Z',maintenance_attachments:[attachment]});
const card=page=>page.locator('article').filter({hasText:'Leaking roof'});

test('resolved maintenance clearly closes uploads while existing files remain viewable',async({page},testInfo)=>{
  if(testInfo.project.name==='mobile-chrome')await page.setViewportSize({width:320,height:740});
  await mockTenantApi(page);
  await page.route('**/api/requests',route=>route.fulfill({json:[request()]}));
  await page.route(`**/api/requests/${requestId}/attachments/${attachmentId}`,route=>route.fulfill({json:{...attachment,url:'http://127.0.0.1:4173/maintenance-evidence'}}));
  await page.context().route('**/maintenance-evidence',route=>route.fulfill({contentType:'text/plain',body:'Existing maintenance evidence'}));
  await page.goto('/');
  const item=card(page);
  await expect(item.getByText('Maintenance resolved',{exact:true})).toBeVisible();
  await expect(item).toContainText('This request is complete. New attachments can no longer be added.');
  await expect(item.getByRole('button',{name:/Add.*attachment/})).toHaveCount(0);
  await expect(item.locator('input[type=file]')).toHaveCount(0);
  await expect(item.getByText('The roof repair is complete.',{exact:false})).toBeVisible();
  expect(await item.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await item.scrollIntoViewIfNeeded();
  await item.screenshot({path:testInfo.outputPath('resolved-maintenance.png')});
  const opened=page.waitForEvent('popup');
  await item.getByRole('button',{name:/repair-evidence.pdf/}).click();
  const popup=await opened;
  await expect(popup).toHaveURL('http://127.0.0.1:4173/maintenance-evidence');
  await expect(popup.locator('body')).toContainText('Existing maintenance evidence');
  await popup.close();
});

test('visible-page polling detects resolution and returning to the page detects a reopened request',async({page})=>{
  await page.clock.install();
  await mockTenantApi(page);
  let status='Scheduled',reads=0;
  await page.route('**/api/requests',route=>{reads++;return route.fulfill({json:[request(status)]});});
  await page.goto('/');
  const item=card(page);
  await expect(item.getByRole('button',{name:'Add more attachments'})).toBeVisible();
  status='Resolved';
  const before=reads;
  await page.clock.fastForward(31000);
  await expect.poll(()=>reads).toBeGreaterThan(before);
  await expect(item.getByText('Maintenance resolved',{exact:true})).toBeVisible();
  await expect(item.locator('input[type=file]')).toHaveCount(0);
  status='In progress';
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(item.getByRole('button',{name:'Add more attachments'})).toBeVisible();
  await expect(item.getByText('Maintenance resolved',{exact:true})).toHaveCount(0);
});

test('resolution during a multi-file upload stops the queue and refreshes the resolved notice',async({page})=>{
  await mockTenantApi(page);
  let status='Scheduled',uploads=0;
  await page.route('**/api/requests',route=>route.fulfill({json:[request(status)]}));
  await page.route(`**/api/requests/${requestId}/attachments?*`,route=>{
    uploads++;status='Resolved';
    return route.fulfill({status:409,json:{code:'request_resolved',error:'This maintenance request has been resolved. New attachments are no longer accepted.'}});
  });
  await page.goto('/');
  const item=card(page);
  const files=['first.pdf','second.pdf'].map(name=>({name,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7')}));
  await item.getByLabel('Choose maintenance attachments').setInputFiles(files);
  await expect(item.getByText('Maintenance resolved',{exact:true})).toBeVisible();
  await expect(item.getByRole('button',{name:/Add.*attachment/})).toHaveCount(0);
  expect(uploads).toBe(1);
  await expect(item.getByRole('button',{name:/repair-evidence.pdf/})).toBeVisible();
});

test('a request resolved during its initial attachment upload shows completion instead of inviting upload retries',async({page})=>{
  await mockTenantApi(page);
  await page.route('**/api/requests/*/attachments?*',route=>route.fulfill({status:409,json:{code:'request_resolved',error:'This maintenance request has been resolved. New attachments are no longer accepted.'}}));
  await page.goto('/');
  await page.getByRole('button',{name:'Open Spartment Assistant',exact:true}).click();
  await page.getByRole('button',{name:/Maintenance Request/}).click();
  const dialog=page.getByRole('dialog',{name:'Spartment customer service'});
  await dialog.getByLabel('Issue type').fill('Leaking roof');
  await dialog.getByLabel('Describe the problem').fill('Water is leaking into the room.');
  await dialog.getByLabel(/Photos or documents/).setInputFiles({name:'evidence.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7')});
  await dialog.getByRole('button',{name:'Submit request',exact:true}).click();
  await expect(dialog.getByText('Maintenance resolved',{exact:true})).toBeVisible();
  await expect(dialog).toContainText('New attachments are no longer accepted.');
  await expect(dialog.locator('input[type=file]')).toHaveCount(0);
  await expect(dialog.getByRole('button',{name:'Submit request',exact:true})).toHaveCount(0);
});
