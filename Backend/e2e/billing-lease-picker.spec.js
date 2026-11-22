import { test, expect } from '@playwright/test';
import { mockAdminApi } from './helpers/mockApi.js';

test('lease dropdown remains clickable below the create form in both billing tabs', async ({ page }, testInfo) => {
  await mockAdminApi(page, { startAuthenticated: true });
  await page.route('**/api/billing/leases?**', route => route.fulfill({ json: Array.from({length:27}, (_,i)=>({
    id:`lease-${i}`,rent:6500,billed:false,profiles:{full_name:`Tenant ${i+1}`},
    rooms:{room_number:String(101+i),buildings:{name:'Main Building'}},
  })) }));
  await page.goto('/');
  await page.locator('button[aria-label="Billing"]:visible').click();
  for (const tab of ['Rent Billing','Utility Billing']) {
    await page.getByRole('button',{name:tab,exact:true}).click();
    const trigger=page.getByRole('button',{name:'Tenant / room',exact:true});
    await trigger.click();
    const options=page.getByRole('listbox',{name:'Active leases'});
    await expect(options).toBeVisible();
    // A hit test catches paint containment even when DOM visibility checks pass.
    const lastVisible=options.getByRole('option').nth(2);
    await lastVisible.scrollIntoViewIfNeeded();
    expect(await lastVisible.evaluate(element=>{
      const rect=element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2));
    })).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`${tab.startsWith('Rent')?'rent':'utility'}-lease-picker.png`),fullPage:true});
    await page.getByRole('searchbox',{name:'Search active tenants and rooms'}).fill('Tenant 27');
    await options.getByRole('option',{name:/Tenant 27/}).click();
    await expect(options).toHaveCount(0);
    await expect(trigger).toContainText('Tenant 27 / Main Building');
  }
});
