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
  const response=await page.goto(origin+'?debug=1',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response.status(),200,'Vite preview should return 200');
  try {
    await page.waitForFunction(()=>!!document.querySelector('.title-content, .startup-error'),null,{timeout:20000});
  } catch {
    throw new Error('Game never finished startup. Visible text: '+(await page.locator('body').innerText()).slice(0,1500));
  }
  const startup=page.locator('.startup-error');
  if(await startup.count())throw new Error('Game startup error: '+(await startup.innerText()).slice(0,1800));
  await page.screenshot({path:'game-title-smoke.png',timeout:15000});
  await page.locator('[data-action="new-game"]').first().click();
  await page.locator('#hud').waitFor({timeout:10000});
  await page.waitForTimeout(800);
  assert.ok(await page.locator('#game canvas').count()>0,'Expected rendered canvas');
  assert.ok(await page.locator('#route-arrow svg').count()>0,'Expected GPS route arrow');
  assert.ok(await page.locator('#route-turn').count()>0,'Expected route instruction');
  await page.waitForTimeout(450);
  const guidance=(await page.locator('#route-turn').innerText()).trim();
  assert.ok(guidance.length>0&&guidance!=='FIND A RIDE','Route planner should guide to a pickup; got '+guidance);
  await page.keyboard.down('w');
  await page.waitForTimeout(1950);
  await page.keyboard.up('w');
  const diag=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    return g?{frames:g.frameCount,t:g.t,inputGas:g.input.gas,ui:g.ui.screen,
      mass:g.player.body.mass(),body:g.player.body.translation(),
      velocity:g.player.body.linvel(),horizontalSpeed:g.player.horizontalSpeed}:null;
  });
  console.log('DRIVING_DIAGNOSTICS',JSON.stringify(diag));
  const speed=Number((await page.locator('#speed').innerText()).trim());
  assert.ok(Number.isFinite(speed)&&speed>10,'Holding accelerate should move the car; speed='+speed+' km/h');
  await page.screenshot({path:'game-driving-smoke.png',timeout:15000});

  // Mobile controls must be SVG-only, selectable text is forbidden, and
  // pointer press must still register for the driving input mapper.
  const controls=await page.locator('.touch-pad [data-drive]').evaluateAll(btns=>btns.map(btn=>({
    name:btn.dataset.drive,
    svg:btn.querySelectorAll('svg').length,
    text:btn.textContent.trim(),
    selectable:getComputedStyle(btn).userSelect,
    webkitSelectable:getComputedStyle(btn).webkitUserSelect,
  })));
  assert.deepEqual(controls.map(c=>c.name),['left','right','brake','gas']);
  assert.ok(controls.every(c=>c.svg===1&&c.text===''&&c.selectable==='none'),JSON.stringify(controls));
  assert.equal(await page.locator('.hud-icon svg').count(),3);
  // Exercise a real pointer press: synthetic PointerEvents do not acquire
  // browser pointer capture and would fail the game's setPointerCapture call.
  await page.locator('.touch-pad').evaluate(el=>{el.style.display='flex';});
  const steerLeft=page.locator('[data-drive="left"]');
  await steerLeft.hover();
  await page.mouse.down();
  assert.ok(await steerLeft.evaluate(el=>el.classList.contains('down')),'Hold should highlight steering button');
  await page.mouse.up();
  assert.ok(!(await steerLeft.evaluate(el=>el.classList.contains('down'))),'Release should clear the button');
  // The app's expand control must never be a silent no-op on browsers that
  // cannot fullscreen regular HTML pages (notably iPhone Safari).
  await page.evaluate(()=>{
    Object.defineProperty(document.documentElement,'requestFullscreen',{value:undefined,configurable:true});
    Object.defineProperty(document.documentElement,'webkitRequestFullscreen',{value:undefined,configurable:true});
  });
  await page.locator('[data-action="fullscreen"]').click();
  await page.locator('#fullscreen-help').waitFor({timeout:5000});
  assert.match(await page.locator('#fullscreen-help').innerText(),/FULLSCREEN OPTIONS/);
  await page.locator('[data-action="dismiss-fullscreen-help"]').click();
  assert.equal(await page.locator('#fullscreen-help').count(),0);

  // Reuse the running WebGL context for a mobile-sized layout pass.
  // GitHub's software renderer struggles to boot a SECOND 3D city in parallel.
  // Apply the actual (pointer:coarse) CSS rules to a 844x390 viewport, then
  // measure geometry and capture the pickup state.
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{
    const rules=[];
    for(const sheet of document.styleSheets){
      let css;try{css=sheet.cssRules;}catch{continue;}
      for(const rule of css||[]){
        if(rule.type===CSSRule.MEDIA_RULE && rule.conditionText.includes('pointer: coarse')){
          for(const child of rule.cssRules)rules.push(child.cssText);
        }
        if(rule.type===CSSRule.MEDIA_RULE && rule.conditionText.includes('pointer:coarse')){
          for(const child of rule.cssRules)rules.push(child.cssText);
        }
      }
    }
    if(!rules.length)throw Error('No coarse-pointer CSS available for mobile layout test');
    const injected=document.createElement('style');
    injected.id='mobile-layout-emulation';
    injected.textContent=rules.join('\n');
    document.head.appendChild(injected);
    const g=window.__GOGOGO_DEBUG__;
    g.player.reset([5,2,-75],0);
    g.ui.updateHUD(true);
  });
  const prompt=page.locator('#interact-prompt'),meter=page.locator('.hud-speed');
  assert.ok(!(await prompt.evaluate(el=>el.classList.contains('hidden'))),'Expected pickup action at passenger location');
  const [p,m,pedals]=await Promise.all([prompt.boundingBox(),meter.boundingBox(),page.locator('.touch-pedals').boundingBox()]);
  const overlaps=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  assert.ok(!overlaps(p,m),'Passenger action must not overlap speedometer: '+JSON.stringify({p,m}));
  assert.ok(!overlaps(p,pedals),'Passenger action must not overlap pedals: '+JSON.stringify({p,pedals}));
  await page.screenshot({path:'game-mobile-passenger-smoke.png',timeout:18000});
  const reacted=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,v=g.missions.pickups[0].visual;
    g.player.body.setLinvel({x:0,y:0,z:-6},true);
    g.missions.update(g.t,g.player,1/60);
    return v.cooldown>0 && v.jumpStarted===g.t;
  });
  assert.ok(reacted,'Passenger should initiate a jump/evade reaction to a moving nearby car');
  assert.deepEqual(errors,[],'Unexpected browser runtime errors');
  console.log('Browser smoke PASSED: desktop drive, fullscreen feedback, mobile passenger placement, pedestrian reaction.');
} catch(e) {
  console.error('BROWSER TEST FAILED:',e.message);
  console.error('JS ERRORS:',JSON.stringify(errors).slice(0,4000));
  console.error('CONSOLE:',JSON.stringify(consoleMessages).slice(0,4000));
  console.error('NETWORK:',JSON.stringify(networkErrors).slice(0,2500));
  try{console.error('PAGE BODY:',(await page.locator('body').innerText()).slice(0,2200));}catch{}
  try{await page.screenshot({path:'browser-smoke-failure.png',fullPage:true,timeout:5000});}catch{}
  throw e;
} finally {await browser.close();}
