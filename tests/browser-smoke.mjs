import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const origin = process.env.SMOKE_URL || 'http://127.0.0.1:4173/Gogogo/';
const browser = await chromium.launch({headless:true, executablePath, args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1280,height:720}});
const errors=[],consoleMessages=[],networkErrors=[];
page.on('pageerror',e=>errors.push(e.stack||e.message));
page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')consoleMessages.push(m.type()+': '+m.text());});
page.on('response',r=>{if(r.status()>=400)networkErrors.push(r.status()+' '+r.url());});
page.on('requestfailed',r=>networkErrors.push(r.url()+' '+r.failure()?.errorText));
try {
  const response=await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200,'Vite preview should return 200');
  try {
    await page.waitForFunction(()=>!!document.querySelector('.title-content, .startup-error'),null,{timeout:20000});
  } catch {
    throw new Error('Game never finished startup. Visible text: '+(await page.locator('body').innerText()).slice(0,1500));
  }
  const startup=page.locator('.startup-error');
  if(await startup.count())throw new Error('Game startup error: '+(await startup.innerText()).slice(0,1800));
  await page.locator('[data-action="new-game"]').first().click();
  await page.locator('#hud').waitFor({timeout:10000});
  await page.waitForTimeout(800);
  assert.ok(await page.locator('#game canvas').count()>0,'Expected rendered canvas');
  assert.deepEqual(errors,[],'Unexpected browser runtime errors');
  console.log('Browser smoke PASSED: title, WebGL/WASM startup, playable HUD.');
} catch(e) {
  console.error('BROWSER TEST FAILED:',e.message);
  console.error('JS ERRORS:',JSON.stringify(errors).slice(0,4000));
  console.error('CONSOLE:',JSON.stringify(consoleMessages).slice(0,4000));
  console.error('NETWORK:',JSON.stringify(networkErrors).slice(0,2500));
  try{console.error('PAGE BODY:',(await page.locator('body').innerText()).slice(0,2200));}catch{}
  try{await page.screenshot({path:'browser-smoke-failure.png',fullPage:true,timeout:5000});}catch{}
  throw e;
} finally {await browser.close();}
