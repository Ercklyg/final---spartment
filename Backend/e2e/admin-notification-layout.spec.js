import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

const categories=['Payments','Leases','Requests','Rooms','Inquiries'];
const notices=Array.from({length:111},(_,index)=>({
  id:`notice-${index}`,category:index<106?'Payments':categories[index-106],
  title:index<106?'Late payment alert':`Property update ${index}`,
  text:'Test Family · Main Building / 207 · ₱1,250.00 remaining',
  priority:'High',time:'Due 2026-08-31',
}));

test('notification category buttons fit their container and stay visible while the list scrolls', async ({ page }, testInfo) => {
  await mockAdminApi(page,{startAuthenticated:true});
  await page.route('**/api/notifications/admin',route=>route.fulfill({json:notices}));
  await page.goto('/');
  await page.getByRole('button',{name:'View all',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'All notifications',exact:true});
  const group=dialog.getByRole('group',{name:'Notification categories'});
  for(const width of [320,768,1280,1920]){
    await page.setViewportSize({width,height:900});
    await expect(group.getByRole('button')).toHaveCount(6);
    const layout=await group.evaluate(element=>{
      const container=element.getBoundingClientRect();
      const buttons=[...element.querySelectorAll('button')].map(button=>{
        const rect=button.getBoundingClientRect();
        return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,fits:button.scrollWidth<=button.clientWidth};
      });
      return {left:container.left,right:container.right,buttons};
    });
    for(const button of layout.buttons){
      expect(button.left).toBeGreaterThanOrEqual(layout.left);
      expect(button.right).toBeLessThanOrEqual(layout.right+1);
      expect(button.fits).toBe(true);
    }
    expect(await group.locator('.admin-notification-category-label').evaluateAll(labels=>labels.every(label=>label.scrollWidth<=label.clientWidth))).toBe(true);
    for(let i=0;i<layout.buttons.length;i++)for(let j=i+1;j<layout.buttons.length;j++){
      const a=layout.buttons[i],b=layout.buttons[j];
      expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true);
    }
    await page.screenshot({path:testInfo.outputPath(`notifications-${width}.png`)});
  }
  const header=dialog.getByRole('heading',{name:'All notifications',exact:true});
  const before=await header.boundingBox();
  const list=dialog.locator('.overflow-y-auto');
  await list.evaluate(element=>{element.scrollTop=element.scrollHeight;});
  expect(await list.evaluate(element=>element.scrollTop)).toBeGreaterThan(0);
  expect((await header.boundingBox()).y).toBe(before.y);
  await expect(group.getByRole('button',{name:'Inquiries: 1 notifications'})).toBeVisible();
  await group.getByRole('button',{name:'Inquiries: 1 notifications'}).click();
  await expect(dialog.getByRole('button',{name:/View notification:/})).toHaveCount(1);
  await dialog.getByRole('button',{name:'Close notifications'}).click();
  await expect(dialog).toBeHidden();
});
