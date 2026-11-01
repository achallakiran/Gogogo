import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const executablePath=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const url=pathToFileURL(resolve('dist/Gogogo-offline.html')).href;
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1080,height:640}});
const errors=[],network=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',req=>{if(/^https?:/.test(req.url()))network.push(req.url());});
try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await page.locator('.title-content,.startup-error').first().waitFor({timeout:30000});
  assert.equal(await page.locator('.startup-error').count(),0,
    'Offline startup failed: '+(await page.locator('body').innerText()).slice(0,900));
  await page.locator('.menu-stack [data-action="new-game"]').click();
  await page.locator('#hud').waitFor({timeout:12000});
  assert.ok(await page.locator('#game canvas').count()>0,'WebGL canvas should appear with file://');
  assert.match(await page.locator('#wallet-balance').innerText(),/\$0/);
  await page.locator('.hud-icon[data-action="garage"]').click();
  assert.equal(await page.locator('.car-card').count(),5);
  assert.deepEqual(network,[],'Offline game must not access remote resources');
  assert.deepEqual(errors,[],'Offline game must not report uncaught JS errors');
  console.log('Offline HTML PASSED: file:// WebGL, wallet, garage and no remote requests');
}catch(error){
  console.error('Offline smoke failed:',error.message,'runtime errors:',errors,'network:',network);
  try{console.error('Visible page:',(await page.locator('body').innerText()).slice(0,1300));}catch{}
  throw error;
}finally{await browser.close();}
