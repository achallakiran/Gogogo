import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import './style.css';
import {createWorld,terrainHeight} from './world/World.js';
import {TERRAIN_WIDTH,TERRAIN_DEPTH} from './world/terrainCollider.js';
import {Vehicle} from './vehicles/Vehicle.js';
import {Traffic} from './traffic/Traffic.js';
import {Missions} from './missions/Missions.js';
import {CameraManager} from './render/CameraManager.js';
import {Navigator} from './navigation/Navigator.js';
import {Input} from './core/Input.js';
import {UI} from './ui/UI.js';
import {Sounds} from './audio/Sounds.js';
import {VEHICLES,DEFAULT_SAVE,loadSave,saveGame,formatMoney} from './core/config.js';

class Game{
  constructor(){
    this.container=document.getElementById('game');this.save=loadSave();this.input=new Input();this.sounds=new Sounds();this.sounds.configure(this.save.settings);
    this.player=null;this.missions=null;this.world=null;this.scene=null;this.renderer=null;this.cameraMode=null;this.t=0;this.accumulator=0;this.lastSave=0;this.ui=new UI(this);
    this.tick=this.tick.bind(this);
    window.addEventListener('resize',()=>this.resize());
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.ui.screen==='playing')this.pause();});
    window.addEventListener('keydown',event=>{
      if(event.repeat)return;
      if(event.code==='Escape'){
        if(this.ui.screen==='playing')this.pause();else if(this.ui.screen==='paused')this.resume();
        else if(['settings','garage','howto','confirm'].includes(this.ui.screen))this.ui.go(this.ui.previous,'title');
      }
      if(this.ui.screen==='playing'){
        if(event.code==='KeyC')this.cycleCamera();
        if(event.code==='KeyE')this.interact();
        if(event.code==='KeyR')this.recover();
        if(event.code==='KeyF')this.toggleFullscreen();
      }
    });
    this.orbitPointer=null;
    this.container.addEventListener('pointerdown',e=>{if(this.ui.screen==='playing'&&this.cameraMode.mode==='orbit')this.orbitPointer=e.clientX;});
    window.addEventListener('pointermove',e=>{if(this.orbitPointer!==null){this.cameraMode.rotateOrbit((e.clientX-this.orbitPointer)*.009);this.orbitPointer=e.clientX;}});
    window.addEventListener('pointerup',()=>this.orbitPointer=null);
  }
  async init(){
    try{
      await RAPIER.init();
      this.world=new RAPIER.World({x:0,y:-9.81,z:0});this.world.timestep=1/60;
      this.scene=new THREE.Scene();
      this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
      this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.10;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.container.appendChild(this.renderer.domElement);
      this.camera=new THREE.PerspectiveCamera(64,1,.1,1200);
      this.cameraMode=new CameraManager(this.camera);
      const environment=createWorld(this.scene,this.world);this.environment=environment;this.cameraMode.occluders=environment.occluders;
      this.missions=new Missions(this.scene);this.navigation=new Navigator(this.scene);this.traffic=new Traffic(this.scene,this.world);
      this.spawnPlayer([0,2,0],0);
      this.applySettings();this.resize();
      this.ui.toTitle();this.clock=new THREE.Clock();requestAnimationFrame(this.tick);
    }catch(err){console.error(err);this.ui.root.innerHTML=`<div class="startup-error"><h2>Could not start the city</h2><p>${String(err.message||err).replaceAll('<','&lt;')}</p><button onclick="location.reload()">TRY AGAIN</button><p>Please use an up-to-date browser with WebGL and WebAssembly enabled.</p></div>`;}
  }
  spawnPlayer(pos=[0,2,0],heading=0){
    if(this.player)this.player.dispose();
    const spec=VEHICLES.find(v=>v.id===this.save.selected)||VEHICLES[0];
    this.player=new Vehicle(this.scene,this.world,spec,this.save.colors[spec.id]||spec.color,pos,heading);
    if(this.cameraMode)this.cameraMode.initial=true;
    // Newly spawned or purchased cars always have a safe recovery reference.
    this.lastGroundedPose={x:pos[0],z:pos[2],heading};
  }
  onScreenChanged(screen){this.input.setActive(screen==='playing');if(screen==='title')this.cameraMode.initial=true;}
  start(newGame=false){
    if(newGame){const settings={...this.save.settings};this.save=DEFAULT_SAVE();this.save.settings=settings;this.missions.cancel();}
    const p=this.save.position;
    this.spawnPlayer(this.save.hasPlayed?[p[0],Math.max(p[1],terrainHeight(p[0],p[2])+2),p[2]]:[0,2,0],this.save.heading||0);
    this.save.hasPlayed=true;this.persist();this.cameraMode.setMode(this.save.settings.camera);
    this.ui.go('playing','title');this.input.clear();this.sounds.play('pickup');
  }
  pause(){if(this.ui.screen!=='playing')return;this.persist();this.ui.go('paused','playing');}
  resume(){this.ui.go('playing','paused');this.input.clear();this.cameraMode.initial=true;}
  toTitle(){this.persist();this.missions.cancel();this.ui.toTitle();}
  async toggleFullscreen(force=false){
    const nativeFull=document.fullscreenElement||document.webkitFullscreenElement;
    if(nativeFull){
      if(force)return;
      try{
        const close=document.exitFullscreen||document.webkitExitFullscreen;
        await close?.call(document);
      }catch(err){this.ui.toast('Unable to exit fullscreen on this browser.','warn');}
      return;
    }
    const elem=document.documentElement,open=elem.requestFullscreen||elem.webkitRequestFullscreen;
    if(!open){
      if(!force)this.ui.showFullscreenHelp();
      return;
    }
    try{
      await open.call(elem);
      this.resize();
    }catch(err){
      // On iOS Safari arbitrary elements cannot enter native fullscreen.
      // An explicit, useful fallback is better than a silent no-op.
      if(!force)this.ui.showFullscreenHelp();
    }
  }
  cycleCamera(){const mode=this.cameraMode.next();this.save.settings.camera=mode;this.persist();this.sounds.play('click');}
  recover(){if(!this.player)return;
    const pos=this.player.position;
    const checkpoint=this.lastGroundedPose||{x:0,z:0,heading:0};
    // Only return the car to verified navigable roads, never a point beyond
    // the ground mesh or inside an airport structure.
    let x=checkpoint.x,z=checkpoint.z,heading=checkpoint.heading;
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>TERRAIN_WIDTH/2-25||Math.abs(z)>TERRAIN_DEPTH/2-25){
      x=0;z=0;heading=0;
    }
    this.player.reset([x,terrainHeight(x,z)+2,z],heading);
    this.cameraMode.initial=true;
    this.input.clear();
    this.ui.toast('Back on the road!');
  }
  probeObstacleRay(start,direction,maxDistance=70){
    this.world.updateSceneQueries();
    const hit=this.world.castRay(new RAPIER.Ray(
      {x:start[0],y:start[1],z:start[2]},
      {x:direction[0],y:direction[1],z:direction[2]}
    ),maxDistance,true);
    return {hit:!!hit,toi:hit?.timeOfImpact??null};
  }
  probeGround(x,z){
    // Scene queries can be stale before the first physics step (especially
    // under SwiftShader startup). Explicitly sync the Rapier query pipeline.
    this.world.updateSceneQueries();
    const hit=this.world.castRay(new RAPIER.Ray({x,y:65,z},{x:0,y:-1,z:0}),90,true);
    return {x,z,hit:!!hit,toi:hit?.timeOfImpact??null,
      groundHeight:terrainHeight(x,z),colliderCount:this.world.colliders.len()};
  }
  keepCarOnGround(){
    if(!this.player)return;
    const p=this.player.position,{x,y,z}={x:p[0],y:p[1],z:p[2]};
    const inside=Math.abs(x)<TERRAIN_WIDTH/2-5&&Math.abs(z)<TERRAIN_DEPTH/2-5;
    const ground=terrainHeight(x,z);
    if(!inside||!Number.isFinite(y)||y<ground-3.5){
      this.recover();
      return;
    }
    // Record only navigable locations: streets or airport-access approach.
    const nearRoad=(Math.abs(x)<=262&&Math.abs(z)<=270&&
      (Math.abs(x-Math.round(x/60)*60)<6||Math.abs(z-Math.round(z/60)*60)<6));
    const airportRoad=x>=260&&x<=415&&Math.abs(z+120)<8;
    if((nearRoad||airportRoad)&&y>=ground+.25&&y<ground+3&&
       Math.abs(this.player.body.linvel().y)<4){
      this.lastGroundedPose={x,z,heading:this.player.yaw};
    }
  }
  interact(){if(this.ui.screen!=='playing')return;
    if(this.player.horizontalSpeed>3.5){this.ui.toast('Slow down to pick up or drop off passengers.','warn');this.sounds.play('error');return;}
    const result=this.missions.interact(this.player.position,this.player.spec.capacity);
    if(result.type==='picked'){this.ui.toast(`${result.mission.passengers} passenger${result.mission.passengers===1?'':'s'} aboard! Head for Skyport ✈`);this.sounds.play('pickup');}
    else if(result.type==='completed'){
      this.save.cash+=result.amount;this.save.earned+=result.amount;this.save.trips++;
      this.ui.toast(`Airport trip complete! +${formatMoney(result.amount)} 🎉`);this.ui.showEarnings(result.amount);this.sounds.play('reward');this.persist();
    }else if(result.type==='capacity'){this.ui.toast(`This group needs ${result.needed} seats. Try another vehicle.`,'warn');this.sounds.play('error');}
    else this.ui.toast('Move closer to a passenger or airport marker.','warn');
  }
  buy(id){const spec=VEHICLES.find(v=>v.id===id);if(!spec||this.save.owned.includes(id)||this.save.cash<spec.price){this.sounds.play('error');return;}
    this.save.cash-=spec.price;this.save.owned.push(id);this.save.colors[id]=spec.color;
    if(!this.missions.active){this.save.selected=id;this.switchVehicle();}
    this.persist();this.sounds.play('reward');
  }
  selectVehicle(id){if(!this.save.owned.includes(id))return;if(this.missions.active){alert('Finish or abandon your active passenger trip before switching cars.');return;}
    this.save.selected=id;this.switchVehicle();this.persist();}
  switchVehicle(){const p=this.player?.position||[0,2,0],angle=this.player?.yaw||0;this.spawnPlayer([p[0],Math.max(p[1],terrainHeight(p[0],p[2])+2),p[2]],angle);}
  paint(id,color){if(!this.save.owned.includes(id)||!/^#[0-9a-f]{6}$/i.test(color))return;this.save.colors[id]=color;
    if(this.save.selected===id)this.player.setColor(color);
    this.persist();}
  changeSetting(k,value){if(!(k in this.save.settings))return;this.save.settings[k]=value;
    if(k==='camera')this.cameraMode.setMode(value);
    if(k==='roadGuides'){this.navigation?.setRoadGuides(Boolean(value));this.persist();return;}
    this.sounds.configure(this.save.settings);this.applySettings();this.persist();}
  applySettings(){if(!this.renderer)return;const s=this.save.settings,isMobile=matchMedia('(pointer:coarse)').matches;
    this.navigation?.setRoadGuides(s.roadGuides!==false);
    const pixelRatio=s.quality==='low'?.78:s.quality==='medium'?1.0:s.quality==='high'?1.65:(isMobile?.92:1.12);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,pixelRatio));
    // Real-time shadow maps replay city geometry several times. Prefer
    // Toofan-style baked per-face shading for auto/balanced/mobile presets.
    this.renderer.shadowMap.enabled=s.shadows&&s.quality==='high';
    if(this.environment?.sun)this.environment.sun.castShadow=this.renderer.shadowMap.enabled;
    this._perf={avg:1/45,elapsed:0,adaptations:0};
    this.resize();}
  persist(){if(!this.save)return;if(this.player&&this.ui.screen==='playing'){
      const p=this.player.position;if(p.every(Number.isFinite)){this.save.position=p;this.save.heading=this.player.yaw;}
    }saveGame(this.save);}
  resize(){if(!this.camera||!this.renderer)return;const w=window.innerWidth,h=window.innerHeight;this.camera.aspect=Math.max(1,w)/Math.max(1,h);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  tick(){requestAnimationFrame(this.tick);this.frameCount=(this.frameCount||0)+1;
    // Advance game time using the REAL elapsed interval. Clamping this to
    // 0.05 made the car run in slow motion whenever a phone fell below 20fps.
    const elapsed=Math.min(this.clock.getDelta(),.22),dt=Math.min(elapsed,.06);
    this.t+=elapsed;
    const perf=this._perf;
    if(perf&&this.save.settings.quality==='auto'){
      perf.avg=THREE.MathUtils.lerp(perf.avg,Math.max(.003,elapsed),.10);
      perf.elapsed+=elapsed;
      if(perf.elapsed>3.5){
        const fps=1/Math.max(perf.avg,.001),dpr=this.renderer.getPixelRatio();
        // Adapt resolution gradually and infrequently, not every frame.
        if(fps<27 && dpr>.70){
          this.renderer.setPixelRatio(Math.max(.70,dpr-.16));
          this.resize();perf.adaptations++;
        }else if(fps>53 && dpr<Math.min(window.devicePixelRatio||1,1.16)){
          this.renderer.setPixelRatio(Math.min(1.16,dpr+.08));
          this.resize();perf.adaptations++;
        }
        perf.elapsed=0;
      }
    }
    const playing=this.ui.screen==='playing',title=this.ui.screen==='title';
    if(playing){
      const step=1/60;
      this.accumulator=Math.min(this.accumulator+elapsed,.23);
      let substeps=0;
      while(this.accumulator>=step&&substeps<14){
        this.player.drive(this.input,step,this.save.settings);
        this.traffic.update(step,this.player);
        this.world.step();
        this.player.stabilizeAfterStep();
        this.player.capturePhysicsPose();
        this.accumulator-=step;substeps++;
      }
      this.player.sync(dt,Math.min(1,this.accumulator/step));
      this.missions.update(this.t,this.player,dt);
      this.environment?.streetLife?.update(this.player,dt,this.t);
      this.navigation.update(this.player,this.missions.target(this.player.position,this.player.spec.capacity),this.t);
      this.cameraMode.update(this.player,dt);
      if(!this._lastHUD||this.t-this._lastHUD>.1){this.ui.updateHUD();this._lastHUD=this.t;}
      if(this.t-this.lastSave>4){this.persist();this.lastSave=this.t;}
      this.keepCarOnGround();
    }else if(title){
      this.navigation.group.visible=false;this.navigation.beacon.visible=false;
      // Title is a stable, lightly animated postcard: no expensive physics/AI.
      this.accumulator=0;
      const t=this.t*.08;
      this.camera.position.set(10+Math.sin(t)*2.2,15.5+Math.sin(t*.35)*.55,25+Math.cos(t)*2.0);
      this.camera.lookAt(3,4,-72);
      if(this.camera.fov!==53){this.camera.fov=53;this.camera.updateProjectionMatrix();}
    }else{this.accumulator=0;}
    this.renderer.render(this.scene,this.camera);
  }
}
const game=new Game();
if(new URLSearchParams(location.search).has('debug'))window.__GOGOGO_DEBUG__=game;
game.init();
