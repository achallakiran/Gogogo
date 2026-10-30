import {VEHICLES,COLORS,formatMoney,DEFAULT_SAVE} from '../core/config.js';
import {svgIcon} from './icons.js';

const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const missionRouteColour=kind=>kind==='dropoff'?'#5ceade':'#ffce66';
const icon={play:'▶',garage:'▤',settings:'⚙',map:'⌖',camera:'◉',pause:'Ⅱ',back:'←',full:'⛶',check:'✓'};
export class UI{
  constructor(game){this.game=game;this.root=document.getElementById('app-ui');this.screen='loading';this.previous='title';this.toastTimeout=0;this.root.addEventListener('click',e=>this.click(e));this.root.addEventListener('change',e=>this.change(e));this.root.addEventListener('input',e=>this.range(e));this.render();}
  go(screen,from=this.screen){this.previous=from;this.screen=screen;this.game.onScreenChanged(screen);this.render();}
  toTitle(){this.screen='title';this.game.onScreenChanged('title');this.render();}
  render(){
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
    this.root.innerHTML=`<div class="title-wash"></div><main class="title-content"><div class="game-brand"><div class="eyebrow"><span class="eyebrow-dot"></span> A WORLD MADE TO DRIVE</div><h1><span>VOXEL</span><br><em>CITY</em> DRIVER<span class="title-dot">.</span></h1><p class="tagline">Your city. Your wheels. Your adventure.</p><div class="brand-pills"><span>OPEN WORLD</span><span>DRIVE & EARN</span><span>COLLECT CARS</span></div></div><div class="menu-stack"><button class="primary-cta" data-action="${has?'continue':'new-game'}">${icon.play} ${has?'CONTINUE DRIVING':'START YOUR ENGINE'} <span>↗</span></button>${has?'<button class="menu-button" data-action="new-game">↺ &nbsp; NEW GAME</button>':''}<button class="menu-button" data-action="garage">${icon.garage} &nbsp; GARAGE <span>→</span></button><button class="menu-button" data-action="settings">${icon.settings} &nbsp; SETTINGS <span>→</span></button><button class="menu-button" data-action="howto">? &nbsp; HOW TO PLAY <span>→</span></button></div><div class="footer-tag">VERSION 0.1 &nbsp;·&nbsp; MADE FOR THE OPEN ROAD <span>☀️ EXPLORE WITHOUT LIMITS</span></div></main>`;
  }
  header(title,subtitle=''){return `<div class="panel-heading"><button data-action="back" class="back-btn" aria-label="Go back">${icon.back}</button><div><div class="section-label">VOXEL CITY DRIVER</div><h2>${title}</h2>${subtitle?`<p>${subtitle}</p>`:''}</div></div>`;}
  renderSettings(){const s=this.game.save.settings;
    this.root.innerHTML=`<div class="panel-wash"></div><main class="panel settings-panel">${this.header('Settings','Tune your ride, your way.')}<div class="setting-grid"><div class="setting"><label for="quality">GRAPHICS QUALITY</label><select id="quality" data-setting="quality"><option value="auto" ${s.quality==='auto'?'selected':''}>Auto (recommended)</option><option value="low" ${s.quality==='low'?'selected':''}>Battery saver</option><option value="medium" ${s.quality==='medium'?'selected':''}>Balanced</option><option value="high" ${s.quality==='high'?'selected':''}>High</option></select></div><div class="setting"><label for="camera">DEFAULT CAMERA</label><select id="camera" data-setting="camera">${[['chase','Chase (default)'],['close','Close chase'],['hood','Hood'],['cockpit','Cockpit'],['orbit','Orbit']].map(([k,v])=>`<option value="${k}" ${s.camera===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="setting"><label for="sensitivity">STEERING SENSITIVITY <output id="sensitivity-label">${Math.round(s.sensitivity*100)}%</output></label><input id="sensitivity" type="range" min="20" max="100" value="${Math.round(s.sensitivity*100)}" data-setting="sensitivity"/></div><div class="setting"><label for="volume">SOUND VOLUME <output id="volume-label">${Math.round(s.volume*100)}%</output></label><input id="volume" type="range" min="0" max="100" value="${Math.round(s.volume*100)}" data-setting="volume"/></div><div class="setting"><label class="toggle-row"><span>GAME SOUNDS</span><input type="checkbox" data-setting="sound" ${s.sound?'checked':''}/></label></div><div class="setting"><label class="toggle-row"><span>REAL-TIME SHADOWS</span><input type="checkbox" data-setting="shadows" ${s.shadows?'checked':''}/></label></div></div><div class="panel-note">Settings are saved automatically on this device. A faster graphics preset can help mobile battery life.</div><button data-action="back" class="primary-cta compact">${icon.check} SAVE & RETURN</button></main>`;
  }
  renderGarage(){const s=this.game.save;
    this.root.innerHTML=`<div class="panel-wash"></div><main class="panel garage-panel">${this.header('The Garage','Collect your dream fleet. Paint every car for free.')}<div class="garage-top"><div class="money-pill">WALLET <strong>${formatMoney(s.cash)}</strong></div><span>${s.owned.length} / ${VEHICLES.length} VEHICLES OWNED</span></div><div class="car-grid">${VEHICLES.map(v=>{
      const owned=s.owned.includes(v.id),selected=s.selected===v.id;
      return `<article class="car-card ${selected?'selected':''}"><div class="car-symbol">${svgIcon('car')}</div><div class="car-heading"><h3>${esc(v.name)}</h3>${selected?'<span class="selected-tag">DRIVING</span>':''}</div><p>${esc(v.subtitle)}</p><div class="car-stats"><span>⚡ ${Math.round(v.topSpeed*3.6)} km/h</span><span>◉ ${v.capacity} seats</span></div>${owned?`<div class="paint-label">FREE PAINT</div><div class="swatches">${COLORS.map(c=>`<button data-action="paint" data-car="${v.id}" data-color="${c.hex}" class="swatch ${s.colors[v.id]===c.hex?'active':''}" style="--paint:${c.hex}" aria-label="Paint ${esc(v.name)} ${c.name}" title="${c.name}"></button>`).join('')}</div><button class="garage-action" data-action="select" data-car="${v.id}" ${selected?'disabled':''}>${selected?'✓ SELECTED':'DRIVE THIS CAR'}</button>`:`<div class="garage-price">${formatMoney(v.price)}</div><button class="garage-action buy" data-action="buy" data-car="${v.id}" ${s.cash<v.price?'disabled':''}>${s.cash<v.price?'EARN MORE TO UNLOCK':'BUY VEHICLE'}</button>`}</article>`;
    }).join('')}</div><div class="garage-footnote">Every vehicle has its own handling. No paid performance upgrades. All paint colors are free.</div></main>`;
  }
  renderHowto(){this.root.innerHTML=`<div class="panel-wash"></div><main class="panel howto-panel">${this.header('How to Play','A whole city at your fingertips.')}<div class="tutorial-grid"><section><h3>🚗 DRIVE ANYWHERE</h3><p>Use <b>W / ↑</b> to accelerate, <b>S / ↓</b> to brake or reverse, and <b>A / D</b> or <b>← / →</b> to steer. On touchscreens use the large driving buttons.</p></section><section><h3>✈️ AIRPORT RIDES</h3><p>Follow the golden passenger markers, stop nearby and press <b>E</b> or the <b>PICK UP</b> button. Drive to the turquoise airport drop-off marker for your fare.</p></section><section><h3>🎥 SWITCH CAMERAS</h3><p>Press <b>C</b> or tap the camera button. Chase, close, hood, cockpit and orbit modes are available. Drag the scene to rotate the orbit camera.</p></section><section><h3>💰 BUILD YOUR FLEET</h3><p>Earn money by taking passengers to the airport. Buy cars in the garage and repaint them any color for free.</p></section><section><h3>🧭 EXPLORE FREELY</h3><p>Missions are optional. Explore the beautiful city, hills, roads and airport at your own pace. Press <b>R</b> to recover a stuck car.</p></section><section><h3>⏸️ PAUSE</h3><p>Press <b>Esc</b> or tap pause to open settings, change vehicles, return to the menu or continue driving.</p></section></div><button data-action="back" class="primary-cta compact">GOT IT, LET'S DRIVE →</button></main>`;}
  renderConfirm(){this.root.innerHTML=`<div class="panel-wash"></div><main class="panel small-panel">${this.header('Start a New Game?')}<p>This will replace your locally saved money, garage and driving position. Your settings will be kept.</p><button data-action="confirm-new" class="primary-cta">YES, START FRESH</button><button data-action="back" class="menu-button">CANCEL</button></main>`;}
  renderPause(){this.root.innerHTML=`<div class="panel-wash pause-wash"></div><main class="pause-content"><div class="section-label">TAKING A BREATHER</div><h2>PAUSED<span class="title-dot">.</span></h2><p>The city will be here when you get back.</p><button data-action="resume" class="primary-cta">${icon.play} RESUME DRIVE</button><button data-action="garage" class="menu-button">${icon.garage} &nbsp; GARAGE</button><button data-action="settings" class="menu-button">${icon.settings} &nbsp; SETTINGS</button><button data-action="howto" class="menu-button">? &nbsp; HOW TO PLAY</button><button data-action="title" class="menu-button">⌂ &nbsp; MAIN MENU</button></main>`;}
  renderHUD(){this.root.innerHTML=`<div id="hud"><div class="hud-top"><div class="hud-objective"><div class="hud-objective-label">NAVIGATION <span id="route-status">FREE ROAM</span></div><div class="route-primary"><div id="route-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1 21 22l-9-5-9 5Z"/></svg></div><div class="route-copy"><b id="route-turn">FIND A RIDE</b><span id="route-meter">Follow the golden road guides</span></div></div><div id="objective" class="objective-line">EXPLORE THE CITY</div><div id="distance" class="objective-distance">Find a golden passenger marker</div></div><div class="hud-actions"><div id="cash" class="hud-cash">${formatMoney(this.game.save.cash)}</div><button type="button" class="hud-icon" data-action="camera-next" aria-label="Change camera" title="Change camera">${svgIcon('camera')}</button><button type="button" class="hud-icon" data-action="fullscreen" aria-label="Toggle fullscreen" title="Fullscreen">${svgIcon('fullscreen')}</button><button type="button" class="hud-icon" data-action="pause" aria-label="Pause" title="Pause">${svgIcon('pause')}</button></div></div><div class="mini-map-wrap"><canvas id="minimap" width="152" height="152" aria-label="Minimap"></canvas><span>LIVE MAP</span></div><div id="interact-prompt" class="interact-prompt hidden"><button type="button" data-action="interact" class="interact-button" aria-label="Pick up passenger">${svgIcon('passenger')}</button><span class="interact-caption" aria-live="polite">Pick up passenger</span></div><div id="toast" class="toast hidden"></div><div class="hud-bottom"><div class="hud-speed"><b id="speed">0</b><span>KM/H</span><div id="camera-label">CHASE CAM</div></div><div class="touch-pad drive-pad" aria-label="Driving controls"><div class="touch-steer"><button type="button" data-drive="left" aria-label="Steer left" title="Steer left">${svgIcon('left')}</button><button type="button" data-drive="right" aria-label="Steer right" title="Steer right">${svgIcon('right')}</button></div><div class="touch-pedals"><button type="button" data-drive="brake" class="brake" aria-label="Brake and reverse" title="Brake and reverse">${svgIcon('brake')}</button><button type="button" data-drive="gas" class="gas" aria-label="Accelerate" title="Accelerate">${svgIcon('gas')}</button></div></div><div class="hud-help">WASD / ARROWS &nbsp;•&nbsp; C CAMERA &nbsp;•&nbsp; E PICKUP &nbsp;•&nbsp; R RECOVER</div></div></div>`;
    this.minimap=this.root.querySelector('#minimap');this.mmctx=this.minimap?.getContext('2d');this.updateHUD(true);
  }
  updateHUD(force=false){if(this.screen!=='playing'||!this.game.player)return;
    const p=this.game.player.position,mission=this.game.missions, target=mission.target(p),nearest=mission.available(p),atAirport=mission.active&&Math.hypot(p[0]-355,p[2]+123)<13;
    const q=id=>this.root.querySelector('#'+id);
    q('speed').textContent=Math.round(this.game.player.horizontalSpeed*3.6);
    const hint=this.game.navigation?.direction;
    q('route-status').textContent=mission.active?'AIRPORT DROP-OFF':'PASSENGER PICKUP';
    q('route-turn').textContent=hint?hint.direction:'FIND A RIDE';
    q('route-meter').textContent=hint?`${Math.round(hint.turnDistance)}m to next waypoint · ${Math.round(hint.remaining)}m left`:'Follow the road markers';
    q('route-arrow').style.transform=hint?`rotate(${-hint.relative*180/Math.PI}deg)`:'rotate(0deg)';
    q('cash').textContent=formatMoney(this.game.save.cash);
    q('camera-label').textContent=this.game.cameraMode.mode.toUpperCase()+' CAM';
    q('objective').textContent=mission.active?'✈ '+target.label.toUpperCase():target?'◈ '+target.label.toUpperCase():'EXPLORE THE CITY';
    q('distance').textContent=target?Math.round(Math.hypot(p[0]-target.pos[0],p[2]-target.pos[1]))+' M AWAY'+(mission.active?' • AIRPORT DROP-OFF':' • PASSENGER PICKUP'):'FREE ROAM';
    const prompt=q('interact-prompt');
    const actionable=nearest||atAirport;
    prompt.classList.toggle('hidden',!actionable);
    if(actionable){
      const label=atAirport?'Drop off passengers':`Pick up ${nearest.passengers} passenger${nearest.passengers===1?'':'s'}`;
      prompt.querySelector('button').setAttribute('aria-label',label);
      prompt.querySelector('.interact-caption').textContent=label;
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
    point(355,-123,'#53e3e7',4);for(const x of this.game.missions.pickups){point(x.pos[0],x.pos[1],'#ffd56e',2.6);}
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
      case 'camera-next':this.game.cycleCamera();break;
      case 'interact':this.game.interact();break;
      case 'paint':this.game.paint(t.dataset.car,t.dataset.color);this.renderGarage();break;
      case 'select':this.game.selectVehicle(t.dataset.car);this.renderGarage();break;
      case 'buy':this.game.buy(t.dataset.car);this.renderGarage();break;
    }
  }
  change(e){const key=e.target.dataset.setting;if(!key)return;const val=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value)/100:e.target.value;this.game.changeSetting(key,val);}
  range(e){const key=e.target.dataset.setting;if(!['sensitivity','volume'].includes(key))return;const n=Number(e.target.value);const out=this.root.querySelector(`#${key}-label`);if(out)out.textContent=n+'%';this.game.changeSetting(key,n/100);}
}
