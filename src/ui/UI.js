import {VEHICLES,COLORS,AIRPORT,tripReward,formatMoney,DEFAULT_SAVE,VERSION} from '../core/config.js';
import {svgIcon} from './icons.js';
import {safeRepairCost} from '../vehicles/DrivingFeel.js';
import {CarShowroom} from './CarShowroom.js';
import {creditedFare} from '../gameplay/RideQuality.js';

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const missionRouteColour=kind=>kind==='dropoff'?'#5ceade':'#ffce66';
const icon={play:'▶',garage:'▤',settings:'⚙',map:'⌖',camera:'◉',pause:'Ⅱ',back:'←',full:'⛶',check:'✓'};
export class UI{
  constructor(game){this.game=game;this.root=document.getElementById('app-ui');this.screen='loading';this.previous='title';this.toastTimeout=0;this.root.addEventListener('click',e=>this.click(e));this.root.addEventListener('change',e=>this.change(e));this.root.addEventListener('input',e=>this.range(e));this.render();}
  go(screen,from=this.screen){if(this.screen==='playing'&&screen!=='playing')this.game.persist();this.previous=from;this.screen=screen;this.game.onScreenChanged(screen);this.render();}
  toTitle(){this.screen='title';this.game.onScreenChanged('title');this.render();}
  render(){
    if(this.screen!=='garage')this.showroom?.suspend();
    if(this.screen==='loading')this.root.innerHTML=`<div class="loading-screen"><div class="loading-spinner"></div><h2>BUILDING YOUR CITY</h2><p>Starting 3D world & vehicle physics...</p></div>`;
    else if(this.screen==='title')this.renderTitle();
    else if(this.screen==='settings')this.renderSettings();
    else if(this.screen==='garage')this.renderGarage();
    else if(this.screen==='howto')this.renderHowto();
    else if(this.screen==='confirm')this.renderConfirm();
    else if(this.screen==='paused')this.renderPause();
    else if(this.screen==='playing')this.renderHUD();
    this.game.input.bindTouch(this.root);
  }
  renderTitle(){const has=this.game.save.hasPlayed;
    this.root.innerHTML=`<div class="title-wash"></div><main class="title-content"><div class="game-brand"><div class="eyebrow"><span class="eyebrow-dot"></span> A WORLD MADE TO DRIVE</div><h1><span>VOXEL</span><br><em>CITY</em> DRIVER<span class="title-dot">.</span></h1><p class="tagline">Your city. Your wheels. Your adventure.</p><div class="brand-pills"><span>OPEN WORLD</span><span>DRIVE & EARN</span><span>COLLECT CARS</span></div></div><div class="menu-stack"><button class="primary-cta" data-action="${has?'continue':'new-game'}">${icon.play} ${has?'CONTINUE DRIVING':'START YOUR ENGINE'} <span>↗</span></button>${has?'<button class="menu-button" data-action="new-game">↺ &nbsp; NEW GAME</button>':''}<button class="menu-button" data-action="garage">${icon.garage} &nbsp; GARAGE <span>→</span></button><button class="menu-button" data-action="settings">${icon.settings} &nbsp; SETTINGS <span>→</span></button><button class="menu-button" data-action="howto">? &nbsp; HOW TO PLAY <span>→</span></button></div><div class="footer-tag">VERSION ${VERSION} &nbsp;·&nbsp; MADE FOR THE OPEN ROAD <span>☀️ EXPLORE WITHOUT LIMITS</span></div></main>`;
  }
  header(title,subtitle=''){return `<div class="panel-heading"><button data-action="back" class="back-btn" aria-label="Go back">${icon.back}</button><div><div class="section-label">VOXEL CITY DRIVER</div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div></div>`;}
  renderSettings(){const s=this.game.save.settings;
    this.root.innerHTML=`<div class="panel-wash"></div><main class="panel settings-panel">${this.header('Settings','Tune your ride, your way.')}<div class="setting-grid"><div class="setting"><label for="quality">GRAPHICS QUALITY</label><select id="quality" data-setting="quality"><option value="auto" ${s.quality==='auto'?'selected':''}>Auto (recommended)</option><option value="low" ${s.quality==='low'?'selected':''}>Battery saver</option><option value="medium" ${s.quality==='medium'?'selected':''}>Balanced</option><option value="high" ${s.quality==='high'?'selected':''}>High</option></select></div><div class="setting"><label for="camera">DEFAULT CAMERA</label><select id="camera" data-setting="camera">${[['chase','Chase (default)'],['close','Close chase'],['hood','Hood'],['cockpit','Cockpit'],['orbit','Orbit']].map(([k,v])=>`<option value="${k}" ${s.camera===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="setting"><label for="sensitivity">STEERING SENSITIVITY <output id="sensitivity-label">${Math.round(s.sensitivity*100)}%</output></label><input id="sensitivity" type="range" min="20" max="100" value="${Math.round(s.sensitivity*100)}" data-setting="sensitivity"/></div><div class="setting"><label for="volume">SOUND VOLUME <output id="volume-label">${Math.round(s.volume*100)}%</output></label><input id="volume" type="range" min="0" max="100" value="${Math.round(s.volume*100)}" data-setting="volume"/></div><div class="setting"><label class="toggle-row"><span>GAME SOUNDS</span><input type="checkbox" data-setting="sound" ${s.sound?'checked':''}/></label></div><div class="setting"><label class="toggle-row"><span>REAL-TIME SHADOWS</span><input type="checkbox" data-setting="shadows" ${s.shadows?'checked':''}/></label></div><div class="setting"><label class="toggle-row"><span>ROUTE BREADCRUMBS<small class="setting-subtitle">Small translucent navigation markers</small></span><input type="checkbox" data-setting="roadGuides" ${s.roadGuides?'checked':''}/></label></div></div><div class="panel-note">Settings are saved automatically on this device. A faster graphics preset can help mobile battery life.</div><button data-action="back" class="primary-cta compact">${icon.check} SAVE & RETURN</button></main>`;
  }
  renderGarage(message=''){const s=this.game.save;
    if(!VEHICLES.some(v=>v.id===this.previewId))this.previewId=s.selected;
    const previewIndex=VEHICLES.findIndex(v=>v.id===this.previewId),previewSpec=VEHICLES[previewIndex];
    this.root.innerHTML=`<div class="panel-wash"></div><main class="panel garage-panel">${this.header('The Garage','Collect your dream fleet. Paint every car for free.')}<div class="garage-top"><div class="money-pill">WALLET <strong>${formatMoney(s.cash)}</strong></div><span>${s.trips} TRIPS · TOTAL EARNED ${formatMoney(s.earned)} · ${s.owned.length}/${VEHICLES.length} CARS</span></div><p class="garage-progress">${VEHICLES.filter(v=>!s.owned.includes(v.id)).length?`NEXT UNLOCK: ${esc(VEHICLES.filter(v=>!s.owned.includes(v.id)).sort((a,b)=>a.price-b.price)[0].name)} · ${formatMoney(Math.max(0,VEHICLES.filter(v=>!s.owned.includes(v.id)).sort((a,b)=>a.price-b.price)[0].price-s.cash))} MORE TO EARN`:"ALL CARS UNLOCKED"}</p><section class="garage-showroom"><div class="garage-showroom-top"><div><small>ROTATING 3D PREVIEW</small><strong>${esc(previewSpec.name)}</strong></div><span>${previewIndex+1} / ${VEHICLES.length}</span></div><div class="garage-showroom-stage" id="garage-showroom-stage" aria-label="3D preview of ${esc(previewSpec.name)}"></div><div class="garage-showroom-nav"><button data-action="preview-prev" aria-label="Previous vehicle">‹</button><span>ROTATE · EXPLORE · DRIVE</span><button data-action="preview-next" aria-label="Next vehicle">›</button></div></section><div class="car-grid">${VEHICLES.map(v=>{
      const owned=s.owned.includes(v.id),selected=s.selected===v.id;
      const condition=s.condition?.[v.id]??100,repairCost=safeRepairCost(condition,v);
      return `<article class="car-card ${selected?'selected':''}"><button class="car-symbol" data-action="preview" data-car="${v.id}" aria-label="Preview ${esc(v.name)} in 3D">${svgIcon('car')} <span>VIEW 3D</span></button><div class="car-heading"><h3>${esc(v.name)}</h3>${selected?'<span class="selected-tag">DRIVING</span>':''}</div><p>${esc(v.subtitle)}</p><div class="car-stats"><span>⚡ ${Math.round(v.topSpeed*3.6)} km/h</span><span>◉ ${v.capacity} seats</span></div>${owned?`<div class="garage-condition">CONDITION <strong>${Math.round(condition)}%</strong>${repairCost?`<button data-action="repair" data-car="${v.id}" ${s.cash<repairCost?'disabled':''}>REPAIR ${formatMoney(repairCost)}</button>`:''}</div><div class="paint-label">FREE PAINT</div><div class="swatches">${COLORS.map(c=>`<button data-action="paint" data-car="${v.id}" data-color="${c.hex}" class="swatch ${s.colors[v.id]===c.hex?'active':''}" style="--paint:${c.hex}" aria-label="Paint ${esc(v.name)} ${c.name}" title="${c.name}"></button>`).join('')}</div><button class="garage-action" data-action="select" data-car="${v.id}" ${selected?'disabled':''}>${selected?'✓ SELECTED':'DRIVE THIS CAR'}</button>`:`<div class="garage-price">${formatMoney(v.price)}</div><button class="garage-action buy" data-action="buy" data-car="${v.id}" ${s.cash<v.price?'disabled':''}>${s.cash<v.price?'EARN MORE TO UNLOCK':'BUY VEHICLE'}</button>`}</article>`;
    }).join('')}</div><div class="garage-footnote">Every vehicle has its own handling. No paid performance upgrades. All paint colors are free.</div></main>`;
    if(message){const note=document.createElement('p');note.className='garage-feedback';note.setAttribute('role','status');note.textContent=message;this.root.querySelector('.garage-top')?.after(note);}
    this.showroom??=new CarShowroom();
    this.showroom.mount(this.root.querySelector('#garage-showroom-stage'),previewSpec,s.colors[previewSpec.id]||previewSpec.color);
  }
  confirmPurchase(id){
    const spec=VEHICLES.find(v=>v.id===id);
    if(this.screen!=='garage'||!spec||this.game.save.owned.includes(id)||this.game.save.cash<spec.price)return;
    const dialog=document.createElement('div');dialog.className='purchase-overlay';
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Confirm car purchase');
    dialog.innerHTML='<section class="purchase-dialog"><div class="section-label">CONFIRM PURCHASE</div>'+
      '<h3>'+esc(spec.name)+'</h3><p>Price: <strong>'+formatMoney(spec.price)+'</strong>. Remaining wallet: <strong>'+
      formatMoney(this.game.save.cash-spec.price)+'</strong>.</p>'+
      '<button class="primary-cta" data-action="confirm-buy" data-car="'+esc(id)+'">BUY THIS VEHICLE</button>'+
      '<button class="menu-button" data-action="cancel-buy">CANCEL</button></section>';
    this.root.appendChild(dialog);dialog.querySelector('[data-action="confirm-buy"]').focus();
  }
  renderHowto(){this.root.innerHTML=`<div class="panel-wash"></div><main class="panel howto-panel">${this.header('How to Play','A whole city at your fingertips.')}<div class="tutorial-grid"><section><h3>🚗 DRIVE ANYWHERE</h3><p>Use <b>W / ↑</b> to accelerate, <b>S / ↓</b> to brake or reverse, and <b>A / D</b> or <b>← / →</b> to steer. On touchscreens use the large driving buttons.</p></section><section><h3>✈️ AIRPORT RIDES</h3><p>Follow the golden passenger markers, stop nearby and press <b>E</b> or the <b>PICK UP</b> button. Drive to the turquoise airport drop-off marker for your fare.</p></section><section><h3>🎥 SWITCH CAMERAS</h3><p>Press <b>C</b> or tap the camera button. Chase, close, hood, cockpit and orbit modes are available. Drag the scene to rotate the orbit camera.</p></section><section><h3>💰 BUILD YOUR FLEET</h3><p>Earn money by taking passengers to the airport. Buy cars in the garage and repaint them any color for free.</p></section><section><h3>🧭 EXPLORE FREELY</h3><p>Missions are optional. Explore the beautiful city, hills, roads and airport at your own pace. Press <b>R</b> to recover a stuck car.</p></section><section><h3>⏸️ PAUSE</h3><p>Press <b>Esc</b> or tap pause to open settings, change vehicles, return to the menu or continue driving.</p></section></div><button data-action="back" class="primary-cta compact">GOT IT, LET'S DRIVE →</button></main>`;}
  renderConfirm(){this.root.innerHTML=`<div class="panel-wash"></div><main class="panel small-panel">${this.header('Start a New Game?')}<p>This will replace your locally saved money, garage and driving position. Your settings will be kept.</p><button data-action="confirm-new" class="primary-cta">YES, START FRESH</button><button data-action="back" class="menu-button">CANCEL</button></main>`;}
  renderPause(){this.root.innerHTML=`<div class="panel-wash pause-wash"></div><main class="pause-content"><div class="section-label">TAKING A BREATHER</div><h2>PAUSED<span class="title-dot">.</span></h2><p>The city will be here when you get back.</p><button data-action="resume" class="primary-cta">${icon.play} RESUME DRIVE</button><button data-action="garage" class="menu-button">${icon.garage} &nbsp; GARAGE</button><button data-action="settings" class="menu-button">${icon.settings} &nbsp; SETTINGS</button><button data-action="howto" class="menu-button">? &nbsp; HOW TO PLAY</button><button data-action="title" class="menu-button">⌂ &nbsp; MAIN MENU</button></main>`;}
  showFullscreenHelp(){
    if(this.screen!=='playing')return;
    if(this.root.querySelector('#fullscreen-help'))return;
    const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    const message=isIOS
      ? 'Safari on iPhone cannot make a normal webpage truly fullscreen. Tap Share, choose Add to Home Screen, then launch Gogogo from its Home Screen icon. Rotate to landscape for the biggest view.'
      : 'This browser is not allowing native fullscreen. Try a recent Chrome, Edge, or Safari version, or Add to Home Screen where supported.';
    const modal=document.createElement('aside');
    modal.id='fullscreen-help';modal.setAttribute('role','dialog');
    modal.setAttribute('aria-label','Fullscreen information');
    modal.innerHTML=`<h3>FULLSCREEN OPTIONS</h3><p>${message}</p>
      <button type="button" data-action="dismiss-fullscreen-help" aria-label="Close fullscreen help">GOT IT</button>`;
    this.root.querySelector('#hud')?.appendChild(modal);
  }
  renderHUD(){this.root.innerHTML=`<div id="hud">
    <div class="hud-top">
      <div class="hud-objective" aria-label="Direction to destination">
        <div id="route-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 21 22l-9-5-9 5Z"/></svg></div>
        <span id="route-meter">-- m</span>
        <span id="route-turn" class="visually-hidden">STRAIGHT</span>
      </div>
      <div class="hud-actions">
        <button type="button" class="hud-icon" data-action="garage" aria-label="Open garage and buy cars" title="Garage">${svgIcon("car")}</button><button type="button" class="hud-icon" data-action="camera-next" aria-label="Change camera" title="Change camera">${svgIcon('camera')}</button>
        <button type="button" class="hud-icon" data-action="fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">${svgIcon('fullscreen')}</button>
        <button type="button" class="hud-icon" data-action="pause" aria-label="Pause" title="Pause">${svgIcon('pause')}</button>
      </div>
    </div>
    <div class="hud-wallet" aria-label="Taxi earnings and wallet"><span>WALLET</span><strong id="wallet-balance">${formatMoney(this.game.save.cash)}</strong><small id="wallet-earned">EARNED ${formatMoney(this.game.save.earned)}</small><small id="wallet-fare">FIND A PASSENGER</small><div class="drive-meter"><span><b>CAR HEALTH</b> <output id="damage-readout">100%</output></span><div class="drive-meter-track"><i id="damage-fill"></i></div></div><div class="drive-meter" id="happiness-meter"><span><b>HAPPINESS</b> <output id="happiness-readout">—</output></span><div class="drive-meter-track"><i id="happiness-fill"></i></div></div></div><div id="earnings-pop" class="earnings-pop hidden" role="status" aria-live="polite"></div><div class="hud-speed" aria-label="Speed in kilometers per hour"><b id="speed">0</b><span>km/h</span></div>
    <div class="mini-map-wrap"><canvas id="minimap" width="152" height="152" aria-label="Minimap"></canvas></div>
    <div id="interact-prompt" class="interact-prompt hidden"><button type="button" data-action="interact" class="interact-button" aria-label="Pick up passenger" title="Pick up passenger">${svgIcon('passenger')}</button></div>
    <div id="toast" class="toast hidden"></div>
    <div class="hud-bottom"><div class="touch-pad drive-pad" aria-label="Driving controls">
      <div class="touch-steer">
        <button type="button" data-drive="left" aria-label="Steer left" title="Steer left">${svgIcon('left')}</button>
        <button type="button" data-drive="right" aria-label="Steer right" title="Steer right">${svgIcon('right')}</button>
      </div>
      <div class="touch-pedals">
        <button type="button" data-drive="brake" class="brake" aria-label="Brake and reverse" title="Brake and reverse">${svgIcon('brake')}</button>
        <button type="button" data-drive="gas" class="gas" aria-label="Accelerate" title="Accelerate">${svgIcon('gas')}</button>
      </div>
    </div></div>
  </div>`;
    this.minimap=this.root.querySelector('#minimap');this.mmctx=this.minimap?.getContext('2d');this.updateHUD(true);
  }
  updateHUD(force=false){if(this.screen!=='playing'||!this.game.player)return;
    const p=this.game.player.position,mission=this.game.missions, target=mission.target(p,this.game.player.spec.capacity),nearest=mission.available(p),atAirport=mission.active&&Math.hypot(p[0]-AIRPORT.pos[0],p[2]-AIRPORT.pos[1])<13;
    const q=id=>this.root.querySelector('#'+id);
    q('speed').textContent=Math.round(this.game.player.horizontalSpeed*3.6);
    q('wallet-balance').textContent=formatMoney(this.game.save.cash);
    q('wallet-earned').textContent='EARNED '+formatMoney(this.game.save.earned)+' · '+this.game.save.trips+' RIDES';
    const baseFare=mission.active?tripReward(mission.active.pos,AIRPORT.pos,mission.active.bonus):0;
    const condition=this.game.player.condition??100;
    q('wallet-fare').textContent=mission.active?'EST. FARE '+formatMoney(creditedFare(baseFare,this.game.happiness,condition)):'AIRPORT RIDES PAY CASH';
    q('damage-readout').textContent=Math.round(condition)+'%';
    q('damage-fill').style.width=condition+'%';
    q('damage-fill').dataset.level=condition<35?'critical':condition<65?'warn':'good';
    const happiness=this.game.happiness??100;
    q('happiness-meter').classList.toggle('inactive',!mission.active);
    q('happiness-readout').textContent=mission.active?Math.round(happiness)+'%':'—';
    q('happiness-fill').style.width=(mission.active?happiness:0)+'%';
    q('happiness-fill').dataset.level=happiness<35?'critical':happiness<65?'warn':'good';
    const hint=this.game.navigation?.direction;
    const metres=target?Math.round(Math.hypot(p[0]-target.pos[0],p[2]-target.pos[1])):0;
    const arrived=metres<9;
    q('route-meter').textContent=target?(arrived?'0 m':metres+' m'):'-- m';
    q('route-turn').textContent=arrived?'ARRIVED':(hint?.direction||'STRAIGHT');
    q('route-arrow').style.transform=hint?`rotate(${-hint.relative*180/Math.PI}deg)`:'rotate(0deg)';
    const navigation=this.root.querySelector('.hud-objective');
    navigation.dataset.destination=mission.active?'airport':'passenger';
    navigation.setAttribute('aria-label',target?
      `${mission.active?'Airport drop-off':'Passenger pickup'}: ${target.label}, ${metres} meters, ${arrived?'arrived':hint?.direction||'follow arrow'}`:'Free driving');
    const prompt=q('interact-prompt');
    const actionable=nearest||atAirport;
    prompt.classList.toggle('hidden',!actionable);
    if(actionable){
      const label=atAirport?'Drop off passengers':`Pick up ${nearest.passengers} passenger${nearest.passengers===1?'':'s'}`;
      prompt.querySelector('button').setAttribute('aria-label',label);
      prompt.querySelector('button').setAttribute('title',label);
      prompt.dataset.actionType=atAirport?'dropoff':'pickup';
    }
    this.drawMap(p,target);
  }
  drawMap(p,target){const ctx=this.mmctx;if(!ctx)return;const w=152,h=152,scale=.27;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#10273a';ctx.fillRect(0,0,w,h);
    ctx.save();ctx.translate(w/2,h/2);ctx.translate(-p[0]*scale,-p[2]*scale);
    ctx.strokeStyle='#416378';ctx.lineWidth=12*scale;
    for(const n of [-240,-180,-120,-60,0,60,120,180,240]){
      ctx.beginPath();ctx.moveTo(n*scale,-270*scale);ctx.lineTo(n*scale,270*scale);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-270*scale,n*scale);ctx.lineTo((n===-120?420:270)*scale,n*scale);ctx.stroke();
    }
    const point=(x,z,color,r)=>{ctx.beginPath();ctx.arc(x*scale,z*scale,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};
    point(AIRPORT.pos[0],AIRPORT.pos[1],'#53e3e7',4);for(const x of this.game.missions.pickups){point(x.pos[0],x.pos[1],'#ffd56e',2.6);}
    if(target){
      const route=this.game.navigation?.getRoute()||[];
      if(route.length>1){
        ctx.strokeStyle=missionRouteColour(target.kind);ctx.lineWidth=2.6;
        ctx.setLineDash([4,2]);ctx.beginPath();
        route.forEach((p,i)=>i?ctx.lineTo(p[0]*scale,p[1]*scale):ctx.moveTo(p[0]*scale,p[1]*scale));
        ctx.stroke();ctx.setLineDash([]);
      }
      point(target.pos[0],target.pos[1],target.kind==='dropoff'?'#5ceade':'#ffd56e',4.2);
    }
    ctx.restore();ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-this.game.player.yaw);ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(-5,6);ctx.lineTo(5,6);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.restore();
  }
  showEarnings(amount){const panel=this.root.querySelector('#earnings-pop');if(!panel)return;
    panel.textContent='TRIP COMPLETE  +'+formatMoney(amount);panel.classList.remove('hidden');
    clearTimeout(this.earningsTimeout);this.earningsTimeout=setTimeout(()=>panel.classList.add('hidden'),4500);this.updateHUD(true);
  }
  toast(message,type='success'){if(this.screen!=='playing')return;const e=this.root.querySelector('#toast');if(!e)return;e.textContent=message;e.classList.remove('hidden');e.dataset.type=type;clearTimeout(this.toastTimeout);this.toastTimeout=setTimeout(()=>e.classList.add('hidden'),3000);}
  click(e){const t=e.target.closest('[data-action]');if(!t)return;const action=t.dataset.action;this.game.sounds.play('click');
    switch(action){
      case 'continue':this.game.start(false);break;
      case 'new-game':if(this.game.save.hasPlayed){this.go('confirm','title');}else this.game.start(true);break;
      case 'confirm-new':this.game.start(true);break;
      case 'garage':this.go('garage',this.screen);break;
      case 'settings':this.go('settings',this.screen);break;
      case 'howto':this.go('howto',this.screen);break;
      case 'back':this.go(this.previous,'title');break;
      case 'pause':this.game.pause();break;
      case 'resume':this.game.resume();break;
      case 'title':this.game.toTitle();break;
      case 'fullscreen':this.game.toggleFullscreen();break;
      case 'dismiss-fullscreen-help':this.root.querySelector('#fullscreen-help')?.remove();break;
      case 'camera-next':this.game.cycleCamera();break;
      case 'interact':this.game.interact();break;
      case 'preview':this.previewId=t.dataset.car;this.renderGarage();break;
      case 'preview-prev':this.previewId=VEHICLES[(VEHICLES.findIndex(v=>v.id===this.previewId)+VEHICLES.length-1)%VEHICLES.length].id;this.renderGarage();break;
      case 'preview-next':this.previewId=VEHICLES[(VEHICLES.findIndex(v=>v.id===this.previewId)+1)%VEHICLES.length].id;this.renderGarage();break;
      case 'paint':this.game.paint(t.dataset.car,t.dataset.color);this.previewId=t.dataset.car;this.renderGarage();break;
      case 'repair':{const result=this.game.repair(t.dataset.car);this.renderGarage(result?.message);break;}
      case 'select':{const result=this.game.selectVehicle(t.dataset.car);this.renderGarage(result?.message);break;}
      case 'buy':this.confirmPurchase(t.dataset.car);break;
      case 'confirm-buy':{const result=this.game.buy(t.dataset.car);this.renderGarage(result?.message);break;}
      case 'cancel-buy':this.root.querySelector('.purchase-overlay')?.remove();break;
    }
  }
  change(e){const key=e.target.dataset.setting;if(!key)return;const val=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value)/100:e.target.value;this.game.changeSetting(key,val);}
  range(e){const key=e.target.dataset.setting;if(!['sensitivity','volume'].includes(key))return;const n=Number(e.target.value);const out=this.root.querySelector(`#${key}-label`);if(out)out.textContent=n+'%';this.game.changeSetting(key,n/100);}
}
