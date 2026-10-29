import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const origin = process.env.SMOKE_URL || 'http://127.0.0.1:4173/Gogogo/';
const browser = await chromium.launch({headless:true, executablePath, args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200);
  await page.locator('.title-content').waitFor({timeout:45000});
  assert.equal(await page.locator('.startup-error').count(),0);
  await page.locator('[data-action="new-game"]').first().click();
  await page.locator('#hud').waitFor({timeout:10000});
  await page.waitForTimeout(1200);
  assert.ok(await page.locator('canvas').count()>0);
  assert.deepEqual(errors,[],`Unexpected browser runtime errors: ${errors.join('; ')}`);
  console.log('Browser smoke passed: world loaded, title shown, game started, HUD visible, no runtime errors.');
} finally { await browser.close(); }
