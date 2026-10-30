import * as THREE from 'three';
import {PICKUPS,AIRPORT,tripReward,distance2} from '../core/config.js';
import {terrainHeight} from '../world/World.js';
import {makeVoxelPedestrian} from '../world/StreetLife.js';
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...opts});
function block(parent,w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function person(scene,x,z,index){
  const o=new THREE.Group();o.position.set(x,terrainHeight(x,z),z);scene.add(o);
  const personBody=makeVoxelPedestrian(index);
  personBody.scale.setScalar(1.18);
  o.add(personBody);
  const marker=new THREE.Mesh(new THREE.TorusGeometry(1.8,.18,8,28),new THREE.MeshBasicMaterial({color:'#ffd46c',transparent:true,opacity:.92}));
  marker.rotation.x=Math.PI/2;marker.position.y=3.5;o.add(marker);
  const light=new THREE.PointLight('#ffde78',1.4,12);light.position.y=3.1;o.add(light);
  return {group:o,marker,body:personBody,jumpStarted:-100,cooldown:0,dirX:0,dirZ:0};
}
export class Missions{
  constructor(scene){this.scene=scene;this.pickups=PICKUPS.map((data,i)=>({...data,visual:person(scene,...data.pos,i)}));this.active=null;this.lastPickup=null;
    this.dropMarker=new THREE.Group();this.dropMarker.position.set(AIRPORT.pos[0],0,AIRPORT.pos[1]);scene.add(this.dropMarker);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(5,.34,10,50),new THREE.MeshBasicMaterial({color:'#65e6e7'}));ring.rotation.x=Math.PI/2;ring.position.y=.4;this.dropMarker.add(ring);
    this.dropLight=new THREE.PointLight('#42e2e4',3.0,32);this.dropLight.position.y=2;this.dropMarker.add(this.dropLight);
    this.dropMarker.visible=false;
  }
  available(position){
    if(this.active)return null;
    let closest=null,best=Infinity;
    for(const p of this.pickups){const d=distance2([position[0],position[2]],p.pos);if(d<best){best=d;closest=p;}}
    return best<9?closest:null;
  }
  target(position){
    if(this.active)return {pos:AIRPORT.pos,label:AIRPORT.name,kind:'dropoff'};
    let nearest=null,best=Infinity;
    for(const p of this.pickups){const d=distance2([position[0],position[2]],p.pos);if(d<best){best=d;nearest=p;}}
    return nearest?{pos:nearest.pos,label:nearest.label,kind:'pickup'}:null;
  }
  interact(position,capacity){
    if(this.active){
      if(distance2([position[0],position[2]],AIRPORT.pos)>13)return {type:'tooFar'};
      const mission=this.active;this.active=null;this.dropMarker.visible=false;this.pickups.forEach(p=>p.visual.group.visible=true);
      this.lastPickup=mission.id;
      return {type:'completed',amount:tripReward(mission.pos,AIRPORT.pos,mission.bonus),mission};
    }
    const p=this.available(position);if(!p)return {type:'none'};
    if(p.passengers>capacity)return {type:'capacity',needed:p.passengers};
    this.active=p;this.pickups.forEach(p=>p.visual.group.visible=false);this.dropMarker.visible=true;
    return {type:'picked',mission:p};
  }
  cancel(){this.active=null;this.dropMarker.visible=false;this.pickups.forEach(p=>p.visual.group.visible=true);}
  update(time,player,dt=1/60){
    const car=player?.position,speed=player?.horizontalSpeed||0;
    this.pickups.forEach((p,i)=>{
      const v=p.visual;
      v.marker.position.y=3.45+Math.sin(time*2+i)*.17;
      v.marker.rotation.z=time*.9;
      v.cooldown=Math.max(0,v.cooldown-dt);
      if(car&&v.group.visible&&speed>2&&v.cooldown===0){
        const dx=p.pos[0]-car[0],dz=p.pos[1]-car[2],d=Math.hypot(dx,dz);
        if(d<8){v.jumpStarted=time;v.cooldown=2.6;v.dirX=(dx/(d||1)||1);v.dirZ=dz/(d||1);}
      }
      const elapsed=time-v.jumpStarted;
      if(elapsed>=0&&elapsed<.9){
        const u=elapsed/.9;
        v.body.position.set(v.dirX*4.5*u,Math.sin(u*Math.PI)*2.7,v.dirZ*4.5*u);
        v.body.rotation.z=Math.sin(u*Math.PI)*.28;
      }else{
        v.body.position.lerp(new THREE.Vector3(),Math.min(1,dt*1.7));
        v.body.rotation.z*=Math.max(0,1-dt*5);
      }
    });
    this.dropMarker.rotation.y=time*.32;
  }
}
