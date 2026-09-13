import assert from 'node:assert/strict';
import { chromium } from 'playwright';
export async function checkBrowser({adminEmail,tenantEmail,password,paymentId}) {
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    for(const width of [1440,390]) {
      const context=await browser.newContext({viewport:{width,height:900}});
      const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const login=async email=>{await page.goto('http://127.0.0.1:5173');await page.locator('input[type="email"]').fill(email);await page.locator('input[autocomplete="current-password"],input[type="password"]').first().fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();};
      await login(adminEmail);
      await page.getByRole('heading',{name:'Admin dashboard',exact:true}).waitFor();
      await page.getByRole('button',{name:'Billing',exact:true}).first().click();
      await page.getByRole('heading',{name:'Create rent bill'}).waitFor();
      await page.getByRole('button',{name:/View payments/}).first().click();
      const payment=page.locator('div.mb-2').filter({hasText:paymentId});
      await payment.getByRole('button',{name:'Correct payment / history'}).click();
      await page.getByRole('dialog',{name:'Correct payment'}).waitFor();
      await page.getByText('Correction history',{exact:true}).waitFor();
      await page.getByRole('button',{name:'Cancel',exact:true}).click();
      await payment.getByRole('button',{name:'View / print receipt'}).click();
      const receipt=page.frameLocator('iframe[title="Printable payment receipt"]');
      await receipt.getByText('Payment receipt',{exact:true}).waitFor();
      // Verify receipt frame print output via Chromium's PDF renderer; do not
      // invoke a physical printer or depend on a native dialog in headless mode.
      const html=await page.locator('iframe').getAttribute('srcdoc');
      const printPage=await context.newPage();await printPage.setContent(html);
      const pdf=await printPage.pdf({format:'A4'});assert.ok(pdf.length>1000);await printPage.close();
      await page.getByRole('button',{name:'Close',exact:true}).click();
      await page.getByRole('button',{name:'Analytics & Reports',exact:true}).click();
      await page.getByRole('heading',{name:'Collections trend'}).waitFor();
      const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();await downloadPromise;
      await context.close();
      const tenantContext=await browser.newContext({viewport:{width,height:900}});const tenant=await tenantContext.newPage();tenant.on('pageerror',e=>errors.push(e.message));
      await tenant.goto('http://127.0.0.1:5173');await tenant.locator('input[type="email"]').fill(tenantEmail);await tenant.locator('input[type="password"]').fill(password);await tenant.getByRole('button',{name:'Sign in',exact:true}).click();
      await tenant.getByRole('heading',{name:'My requests',exact:true}).waitFor();
      await tenant.getByRole('button',{name:'Settings',exact:true}).filter({visible:true}).first().click();
      await tenant.getByRole('heading',{name:'Account information',exact:true}).waitFor();
      assert.ok((await tenant.locator('body').innerText()).includes(tenantEmail));
      const overflow=await tenant.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,'Tenant settings horizontal overflow');
      assert.deepEqual(errors,[],'Browser runtime errors');await tenantContext.close();
      console.log('PASS: '+width+'px browser login, admin billing/correction history, receipt PDF, analytics CSV, tenant dashboard/settings');
    }
  } finally {await browser.close();}
}
