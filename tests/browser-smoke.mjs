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
  // The garage must also work BEFORE the first drive.
  await page.locator('.menu-stack [data-action="garage"]').click();
  assert.equal(await page.locator('.car-card').count(),5);
  assert.match(await page.locator('.garage-top').innerText(),/\$0/);
  await page.locator('[data-action="paint"][data-car="taxi"]').first().click();
  await page.locator('[data-action="back"]').click();
  await page.locator('[data-action="new-game"]').first().click();
  await page.locator('#hud').waitFor({timeout:10000});
  await page.waitForTimeout(800);
  assert.ok(await page.locator('#game canvas').count()>0,'Expected rendered canvas');
  const worldFoundation=await page.evaluate(()=>{
    const e=window.__GOGOGO_DEBUG__?.environment;
    return e?{version:e.worldManifestVersion,ids:e.permanentLandmarkIds,
      collisionCount:e.landmarkColliders?.count,rigidBodies:e.landmarkColliders?.bodies?.length}:null;
  });
  console.log('WORLD_FOUNDATION',JSON.stringify(worldFoundation));
  const hill=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    const m=g.environment.mountain;
    return {railCount:m.railCount,barriers:m.barrierBodies.length,
      trees:m.trees,rocks:m.rocks,navRoute:(g.navigation.getRoute()||[]).length,
      samples:m.length,
      surfaces:[[120,272],[120,275],[160,325],[175,390],[206,455]].map(([x,z])=>g.probeGround(x,z))};
  });
  console.log('MOUNTAIN_DISTRICT',JSON.stringify(hill));
  const regions=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,roads=g.environment.regionalRoads;
    const patches=roads.roads.map(r=>({
      id:r.id,triangles:r.indices.length/3,
      holes:r.holes.map(p=>({
        x:p.x,z:p.z,depth:p.depth,
        support:g.probeGround(p.x,p.z)
      }))
    }));
    return {count:roads.roads.length,holeCount:roads.holeCount,patches};
  });
  console.log('REGIONAL_ROADS',JSON.stringify(regions));
  const biomeStats=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,s=g.environment.biomes;
    const validMaterials=Object.values(s.meshes).every(mesh=>!mesh||mesh.count>0);
    const ground=g.scene.children.find(m=>m.isMesh&&m.geometry?.getAttribute('position')?.count===
      (133*101)&&m.geometry.getAttribute('color'));
    return {counts:s.counts,background:s.background.length,
      obstacles:s.obstacleCount,meshCount:Object.keys(s.meshes).length,
      groundColors:!!ground,validMaterials,
      mountainPatchTriangles:g.environment.terrainPatch?.triangles||0,
      samples:[[150,340],[205,455],[-360,350]].map(([x,z])=>g.probeGround(x,z))};
  });
  console.log('BIOME_SCENERY',JSON.stringify(biomeStats));
  assert.ok(biomeStats.counts.conifers>50&&biomeStats.counts.broadleaf>30,
    'Alpine and countryside vegetation must be present: '+JSON.stringify(biomeStats));
  assert.ok(biomeStats.counts.outcrops>35&&biomeStats.obstacles>5,
    'Faceted cliff rock and collidable near-road obstacles required: '+JSON.stringify(biomeStats));
  assert.equal(biomeStats.background,3);
  assert.ok(biomeStats.mountainPatchTriangles>1000,
    'High-detail mountain collider must be built directly from terrain mesh');
  assert.ok(biomeStats.groundColors&&biomeStats.validMaterials);
  assert.ok(biomeStats.samples.every(p=>p.hit&&Number.isFinite(p.toi)&&
    Math.abs((65-p.toi)-p.groundHeight)<3.5),
    'Mountain/country physics must match visible ground, not the deep safety floor: '+JSON.stringify(biomeStats));

  assert.equal(regions.count,3);
  assert.equal(regions.holeCount,7);
  assert.ok(regions.patches.every(p=>p.triangles>100&&p.holes.every(h=>h.support.hit&&h.support.toi<68.5)),
    'Mountain and country damaged roads must be physically supported: '+JSON.stringify(regions));

  const potholeTest=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,r=g.environment.roadDamage;
    const holes=r.potholes.map(h=>{
      const bottom=g.probeGround(h.x,h.z),rim=g.probeGround(h.x+h.rx*1.7,h.z);
      return {x:h.x,z:h.z,depth:(bottom.toi??0)-(rim.toi??0)};
    });
    return {stones:r.stoneCount,holes,hasPhysics:!!r.collider};
  });
  console.log('POTHOLE_PHYSICS',JSON.stringify(potholeTest));
  assert.ok(potholeTest.hasPhysics&&potholeTest.stones>50&&potholeTest.holes.length===3,
    'Detailed pothole surface should exist');
  assert.ok(potholeTest.holes.every(h=>h.depth>.09&&h.depth<.40),
    'Potholes must register physical depth: '+JSON.stringify(potholeTest));

  assert.ok(hill.railCount>15&&hill.barriers>15&&hill.trees>40&&hill.samples>130);
  assert.ok(hill.surfaces.every(s=>s.hit&&s.toi<68.5),'Mountain terrain must be physically supported '+JSON.stringify(hill));
  assert.equal(worldFoundation?.version,1);
  assert.equal(worldFoundation?.ids?.length,6);
  assert.ok(worldFoundation?.collisionCount>=12,'Expected landmark obstacle colliders: '+JSON.stringify(worldFoundation));
  assert.equal(worldFoundation?.rigidBodies,5);

  // Regression: holding throttle must not produce an involuntary
  // wheelie / launch. Simulate physics at fixed dt without frame-time noise.
  const stability=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,p=g.player;
    const quatToTilt=()=>{
      const q=p.body.rotation();
      const uy=1-2*(q.x*q.x+q.z*q.z);
      return Math.acos(Math.min(1,Math.max(-1,uy)))*180/Math.PI;
    };
    const scenarios=[];
    for(const scenario of [
      {name:'straight',at:[0,2,0],heading:0,turn:0},
      {name:'turn',at:[-60,2,-120],heading:0,turn:1},
      {name:'reverse',at:[60,2,0],heading:Math.PI,turn:0}
    ]){
      p.reset(scenario.at,scenario.heading);
      let maxHeight=0,maxTilt=0,maxRise=0;
      for(let i=0;i<250;i++){
        p.drive({gas:true,brake:false,left:false,right:i<90&&scenario.turn>0},1/60,g.save.settings);
        g.world.step();p.stabilizeAfterStep();p.capturePhysicsPose();
        const body=p.body.translation();
        // height sampling is independent from castRay, but local height is
        // near zero on the initial city straightaways.
        maxHeight=Math.max(maxHeight,body.y);
        maxTilt=Math.max(maxTilt,quatToTilt());
        maxRise=Math.max(maxRise,p.body.linvel().y);
      }
      scenarios.push({scenario:scenario.name,maxHeight,maxTilt,maxRise,at:p.position});
    }
    p.reset([0,2,0],0);
    return scenarios;
  });
  console.log('VEHICLE_STABILITY',JSON.stringify(stability));
  assert.ok(stability.every(s=>s.maxTilt<36&&s.maxHeight<8&&s.maxRise<5.5),
    'Throttle must not cause huge jumps or wheelies: '+JSON.stringify(stability));
  // Verify *physics* support instead of relying on a single rendering screenshot.
  // The original airport apron/runway extended outside the heightfield, so a
  // player could drive off the physics world while standing on a visible slab.
  // Do not sample until the game has run its first actual physics step.
  await page.waitForFunction(()=>window.__GOGOGO_DEBUG__?.frameCount>1,null,{timeout:25000});
  const support=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    const checks=[[0,0],[240,-120],[355,-123],[390,-117],[444,-220],[492,-117],[516,-240],[550,-100]]
      .map(([x,z])=>g.probeGround(x,z));
    return {checks};
  });
  console.log('GROUND_SUPPORT',JSON.stringify(support));
  assert.ok(support.checks.every(x=>x.hit&&Number.isFinite(x.toi)&&x.toi>0&&x.toi<68.5),
    'Every road and airport spot must have a ground collider close to visible ground, not just the deep catch floor: '+JSON.stringify(support.checks));
  // Simulate a fall and confirm the player returns to the last safe road.
  const recovered=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    g.player.body.setTranslation({x:0,y:-15,z:0},true);
    g.keepCarOnGround();
    const p=g.player.position;
    return p[1]>1 && Math.abs(p[0])<300 && Math.abs(p[2])<300;
  });
  assert.ok(recovered,'Falling below ground must automatically recover the car');
  const landmarkRays=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    const rays=[
      {id:'clock-square',start:[-166,5,150],dir:[1,0,0],length:30},
      {id:'metro-terminal',start:[120,9.4,150],dir:[1,0,0],length:60},
      {id:'gogogo-welcome-gate',start:[-21,4,-27],dir:[1,0,0],length:25},
      {id:'sunrise-plaza',start:[0,3,16],dir:[1,0,0],length:40},
      {id:'skyport-airport',start:[380,8,-55],dir:[1,0,0],length:70},
    ];
    const hits=rays.map(r=>({...r,...g.probeObstacleRay(r.start,r.dir,r.length)}));
    const gateOpen=g.probeObstacleRay([0,3,-37],[0,0,1],20);
    return {hits,gateOpen};
  });
  console.log('LANDMARK_COLLISION_RAYS',JSON.stringify(landmarkRays));
  for(const item of landmarkRays.hits){
    assert.ok(item.hit&&Number.isFinite(item.toi)&&item.toi>=0&&item.toi<item.length,
      'Expected solid obstacle for '+item.id+': '+JSON.stringify(item));
  }
  assert.equal(landmarkRays.gateOpen.hit,false,
    'Welcome gate should leave the driving lane unobstructed: '+JSON.stringify(landmarkRays.gateOpen));


  assert.ok(await page.locator('#route-arrow svg').count()>0,'Expected GPS route arrow');
  assert.ok(await page.locator('#route-turn').count()>0,'Expected route instruction');
  assert.equal(await page.locator('.hud-help,.hud-objective-label,.objective-line,.objective-distance,.interact-caption,#camera-label,.route-copy').count(),0,
    'The driving HUD should not include verbose labels');
  // Startup on CI's software WebGL renderer can take multiple seconds.
  // Wait until a real gameplay tick has built its guide instances.
  await page.waitForFunction(()=>{
    const g=window.__GOGOGO_DEBUG__;
    return g?.navigation?.guideMesh?.count>0;
  },null,{timeout:25000}).catch(async err=>{
    const diag=await page.evaluate(()=>{
      const g=window.__GOGOGO_DEBUG__;
      return g?{frames:g.frameCount,t:g.t,screen:g.ui.screen,target:g.missions.target(g.player.position),
        route:g.navigation.route,samples:g.navigation.samples?.length,
        count:g.navigation.guideMesh.count,enabled:g.navigation.guidesEnabled}:null;
    });
    throw new Error('Guide arrow initialization timed out: '+JSON.stringify(diag)+' '+err.message);
  });
  const guideState=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    return {enabled:g.save.settings.roadGuides,count:g.navigation.guideMesh.count,visible:g.navigation.group.visible};
  });
  assert.ok(guideState.enabled&&guideState.count>0&&guideState.visible,
    'Default blue road helper arrows should be enabled and visible: '+JSON.stringify(guideState));
  await page.evaluate(()=>window.__GOGOGO_DEBUG__.changeSetting('roadGuides',false));
  assert.equal(await page.evaluate(()=>window.__GOGOGO_DEBUG__.navigation.group.visible),false,'Road guides should hide immediately');
  await page.evaluate(()=>window.__GOGOGO_DEBUG__.changeSetting('roadGuides',true));
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
  // Mountain art inspection: fixed camera at the scenic uphill approach,
  // facing the Pinecrest lodge. Review this alongside the city screenshot.
  const mountainView=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    const s=g.environment.mountain.samples[112],next=g.environment.mountain.samples[114];
    const heading=Math.atan2(-(next.x-s.x),-(next.z-s.z));
    g.player.reset([s.x,2,s.z],heading);
    g.player.capturePhysicsPose(true);g.player.sync(.016,1);
    g.cameraMode.initial=true;
    g.cameraMode.setMode('chase');
    g.cameraMode.update(g.player,.016);
    g.renderer.render(g.scene,g.camera);
    return {at:g.player.position,lodge:g.environment.mountain.cabin.position.toArray()};
  });
  console.log('MOUNTAIN_VIEW',JSON.stringify(mountainView));
  assert.ok(mountainView.at[1]>10,'Hill preview camera must stand on elevated terrain');
  await page.screenshot({path:'game-mountain-smoke.png',timeout:18000});
  // Visual QA of the physical pothole section from the actual driving camera.
  await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    g.player.reset([60,2,111],0);
    g.player.capturePhysicsPose(true);
    g.player.sync(.016,1);
    g.cameraMode.initial=true;
    g.cameraMode.setMode('chase');
    g.cameraMode.update(g.player,.016);
    g.navigation.group.visible=false;
    g.renderer.render(g.scene,g.camera);
  });
  await page.screenshot({path:'game-road-damage-smoke.png',timeout:18000});
  // Repeatable visual review of the new countryside driving environment.
  await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,r=g.environment.regionalRoads.roads[2];
    const mid=Math.floor(r.rows*.50),stride=r.columns+1;
    const at=mid*stride+Math.floor(r.columns/2);
    const ahead=(mid+2)*stride+Math.floor(r.columns/2);
    const x=r.positions[at*3],z=r.positions[at*3+2];
    const dx=r.positions[ahead*3]-x,dz=r.positions[ahead*3+2]-z;
    const yaw=Math.atan2(-dx,-dz);
    g.player.reset([x,2,z],yaw);
    g.player.capturePhysicsPose(true);
    g.player.sync(.016,1);
    g.cameraMode.initial=true;
    g.cameraMode.setMode('chase');
    g.cameraMode.update(g.player,.016);
    g.navigation.group.visible=false;
    g.renderer.render(g.scene,g.camera);
  });
  await page.screenshot({path:'game-country-road-smoke.png',timeout:18000});


  const damageDrive=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,p=g.player;
    p.reset([60,2,108],0);
    let maxTilt=0,maxUp=0,maxHeight=0;
    for(let i=0;i<160;i++){
      p.drive({gas:true,brake:false,left:false,right:false},1/60,g.save.settings);
      g.world.step();p.stabilizeAfterStep();p.capturePhysicsPose();
      const b=p.body.translation(),q=p.body.rotation();
      maxTilt=Math.max(maxTilt,Math.acos(Math.min(1,Math.max(-1,1-2*(q.x*q.x+q.z*q.z))))*180/Math.PI);
      maxUp=Math.max(maxUp,p.body.linvel().y);
      maxHeight=Math.max(maxHeight,b.y);
    }
    p.reset([0,2,0],0);
    return {maxTilt,maxUp,maxHeight};
  });
  console.log('POTHOLE_DRIVE',JSON.stringify(damageDrive));
  // Existing city no-jump regression still applies after spring impulses;
  // monitor wheel-by-wheel support and rollout across country/mountain.
  const springTrials=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,p=g.player,roads=g.environment.regionalRoads.roads;
    const cases=[
      {name:'alpine',route:roads[0],atIndex:3},
      {name:'country',route:roads[2],atIndex:10}
    ];
    const results=[];
    for(const c of cases){
      const d=c.route,idx=Math.floor((c.atIndex/(c.name==='country'?20:12))*(d.rows));
      const j=Math.min(d.rows-1,Math.max(2,idx)),stride=d.columns+1,
        at=j*stride+Math.floor(d.columns/2),next=(j+2)*stride+Math.floor(d.columns/2);
      const x=d.positions[at*3],z=d.positions[at*3+2],x2=d.positions[next*3],z2=d.positions[next*3+2];
      const yaw=Math.atan2(-(x2-x),-(z2-z));
      p.reset([x,2,z],yaw);
      let maxTilt=0,maxRise=0,maxYAbove=0,support=0;
      for(let i=0;i<70;i++){
        p.drive({gas:true,brake:false,left:false,right:false},1/60,g.save.settings);
        g.world.step();p.stabilizeAfterStep();p.capturePhysicsPose();
        const b=p.body.translation(),r=p.body.rotation();
        const up=1-2*(r.x*r.x+r.z*r.z);
        maxTilt=Math.max(maxTilt,Math.acos(Math.max(-1,Math.min(1,up)))*180/Math.PI);
        maxRise=Math.max(maxRise,p.body.linvel().y);
        maxYAbove=Math.max(maxYAbove,b.y-(65-g.probeGround(b.x,b.z).toi));
        if(p.springContactCount>0)support++;
      }
      results.push({name:c.name,maxTilt,maxRise,maxYAbove,support});
    }
    p.reset([0,2,0],0);
    return results;
  });
  console.log('REGIONAL_SUSPENSION',JSON.stringify(springTrials));
  assert.ok(springTrials.every(r=>r.maxTilt<36&&r.maxRise<5.5&&r.maxYAbove<6&&r.support>10),
    'Spring-damped cars must stay grounded in both biomes: '+JSON.stringify(springTrials));
  assert.ok(damageDrive.maxTilt<36&&damageDrive.maxUp<5.5&&damageDrive.maxHeight<8,
    'Car must remain stable driving over broken road: '+JSON.stringify(damageDrive));
  const mountainDrive=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,p=g.player,route=g.environment.mountain.samples;
    const points=[route[14],route[43],route[82],route[118]];
    const trials=[];
    for(let k=0;k<points.length;k++){
      const here=points[k],next=route[Math.min(route.length-1,[16,45,84,120][k])];
      const yaw=Math.atan2(-(next.x-here.x),-(next.z-here.z));
      p.reset([here.x,2,here.z],yaw);
      let maxTilt=0,maxRise=0,minGroundClearance=Infinity;
      for(let step=0;step<35;step++){
        p.drive({gas:true,brake:false,left:false,right:false},1/60,g.save.settings);
        g.world.step();p.stabilizeAfterStep();p.capturePhysicsPose();
        const pos=p.body.translation(),rot=p.body.rotation();
        const upright=Math.max(-1,Math.min(1,1-2*(rot.x*rot.x+rot.z*rot.z)));
        maxTilt=Math.max(maxTilt,Math.acos(upright)*180/Math.PI);
        maxRise=Math.max(maxRise,p.body.linvel().y);
        if(step%7===0){
          const support=g.probeGround(pos.x,pos.z);
          if(support.toi!==null){
            const height=65-support.toi;
            minGroundClearance=Math.min(minGroundClearance,pos.y-height);
          }
        }
      }
      trials.push({at:[here.x,here.z],maxTilt,maxRise,minGroundClearance});
    }
    p.reset([0,2,0],0);
    return trials;
  });
  console.log('MOUNTAIN_DRIVING',JSON.stringify(mountainDrive));
  assert.ok(mountainDrive.every(x=>x.maxTilt<35&&x.maxRise<5.5&&x.minGroundClearance>-1.8),
    'Mountain road must remain stable under throttle: '+JSON.stringify(mountainDrive));
  await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;
    g.player.reset([0,2,0],0);g.cameraMode.initial=true;
  });

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
  assert.deepEqual(await page.locator('.hud-icon').evaluateAll(els=>els.map(el=>el.dataset.action)),
    ['garage','camera-next','fullscreen','pause'],'HUD must expose the garage, camera, fullscreen and pause controls');
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
  const overlaps=(a,b)=>a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  for(const size of [{width:844,height:390},{width:667,height:375},{width:390,height:844},{width:320,height:640}]){
    await page.setViewportSize(size);
    const [p,m,pedals,steer,nav,actions]=await Promise.all([
      prompt.boundingBox(),meter.boundingBox(),
      page.locator('.touch-pedals').boundingBox(),page.locator('.touch-steer').boundingBox(),
      page.locator('.hud-objective').boundingBox(),page.locator('.hud-actions').boundingBox()
    ]);
    for(const [name,a,b] of [['passenger/speed',p,m],['passenger/pedals',p,pedals],
      ['speed/pedals',m,pedals],['speed/steering',m,steer],['speed/navigation',m,nav],
      ['speed/action-icons',m,actions]]){
      assert.ok(!overlaps(a,b),size.width+'x'+size.height+' '+name+' overlap: '+JSON.stringify({a,b}));
    }
  }
  await page.setViewportSize({width:844,height:390});
  await page.screenshot({path:'game-mobile-passenger-smoke.png',timeout:18000});
  const reacted=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,v=g.missions.pickups[0].visual;
    g.player.body.setLinvel({x:0,y:0,z:-6},true);
    g.missions.update(g.t,g.player,1/60);
    return v.cooldown>0 && v.jumpStarted===g.t;
  });
  assert.ok(reacted,'Passenger should initiate a jump/evade reaction to a moving nearby car');
  // Physical impact regression: accelerate a real taxi toward the welcome
  // gate's western pillar and verify that it cannot drive through the post.
  const impact=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,p=g.player;
    p.reset([-9,2,-36],Math.PI);
    for(let i=0;i<80;i++){
      p.drive({gas:true,brake:false,left:false,right:false},1/60,g.save.settings);
      g.world.step();
    }
    const at=p.position;
    return {x:at[0],y:at[1],z:at[2],velocity:p.body.linvel()};
  });
  console.log('GATE_IMPACT',JSON.stringify(impact));
  assert.ok(impact.z< -28.0 && Math.abs(impact.x+9)<3,
    'Player car should not pass through gate pillar: '+JSON.stringify(impact));
  // Full user-visible economy loop: pickup -> airport fare -> wallet -> purchase -> ownership.
  const economy=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__;g.missions.cancel();
    const before=g.save.cash;let expected=0;
    for(const id of ['p0','p1','p2']){
      const p=g.missions.pickups.find(x=>x.id===id);
      g.player.reset([p.pos[0],2,p.pos[1]],0);
      g.interact();
      if(g.missions.active?.id!==id)throw Error('Passenger was not picked up: '+id);
      g.player.reset([380,2,-120],0);
      g.interact();
      if(g.missions.active)throw Error('Airport drop-off did not complete: '+id);
      expected+=Math.round(160+Math.hypot(p.pos[0]-380,p.pos[1]+120)*1.3+p.bonus);
    }
    g.ui.updateHUD(true);
    return {before,cash:g.save.cash,earned:g.save.earned,trips:g.save.trips,expected,wallet:document.querySelector('#wallet-balance')?.textContent};
  });
  assert.equal(economy.cash,economy.before+economy.expected,'Taxi fares must credit the wallet exactly once');
  assert.equal(economy.earned,economy.expected);
  assert.equal(economy.trips,3);
  assert.ok(economy.cash>=1600);
  assert.match(economy.wallet,/\$/);
  await page.locator('.hud-icon[data-action="garage"]').click();
  const sportsBuy=page.locator('[data-action="buy"][data-car="coupe"]');
  assert.ok(await sportsBuy.isEnabled(),'Earned fares should enable the car purchase button');
  await sportsBuy.click();
  assert.equal(await page.locator('[role="dialog"] [data-action="confirm-buy"]').count(),1);
  await page.locator('[data-action="cancel-buy"]').click();
  assert.equal(await page.locator('[role="dialog"]').count(),0,'Cancel must not buy a car');
  await sportsBuy.click();
  await page.locator('[role="dialog"] [data-action="confirm-buy"]').click();
  const purchase=await page.evaluate(()=>{
    const g=window.__GOGOGO_DEBUG__,saved=JSON.parse(localStorage.getItem('voxel-city-driver:v1'));
    return {cash:g.save.cash,owned:g.save.owned,selected:g.save.selected,vehicle:g.player.spec.id,
      savedCash:saved.cash,savedOwned:saved.owned,savedSelected:saved.selected,feedback:document.querySelector('.garage-feedback')?.textContent};
  });
  assert.equal(purchase.cash,economy.cash-1600);
  assert.equal(purchase.savedCash,purchase.cash);
  assert.ok(purchase.owned.includes('coupe')&&purchase.savedOwned.includes('coupe'));
  assert.equal(purchase.selected,'coupe');
  assert.equal(purchase.savedSelected,'coupe');
  assert.equal(purchase.vehicle,'coupe');
  assert.match(purchase.feedback,/purchased/i);
  await page.locator('[data-action="back"]').click();
  assert.equal(await page.locator('#wallet-balance').count(),1,'Garage must return to gameplay HUD');
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
