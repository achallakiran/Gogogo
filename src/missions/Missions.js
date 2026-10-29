import * as THREE from 'three';
import {PICKUPS,AIRPORT,tripReward,distance2} from '../core/config.js';
import {terrainHeight} from '../world/World.js';
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...opts});
function block(parent,w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function person(scene,x,z,index){
  const o=new THREE.Group();o.position.set(x,terrainHeight(x,z),z);scene.add(o);
  block(o,.65,1.05,.4,mat(['#59c4a6','#8fa8fa','#ffaf68','#cd9bd2','#e9c35f'][index%5]),0,1.15,0);
  block(o,.62,.62,.60,mat('#f0c7a8'),0,2.0,0);
  block(o,.3,.75,.33,mat('#304860'),-.2,.3,0);block(o,.3,.75,.33,mat('#304860'),.2,.3,0);
  block(o,.3,.55,.35,mat('#e4b98f'),.5,1.2,0);
  block(o,.55,.65,.35,mat('#3e689f'),-.75,.45,0);
  const marker=new THREE.Mesh(new THREE.TorusGeometry(1.8,.18,8,28),new THREE.MeshBasicMaterial({color:'#ffd46c',transparent:true,opacity:.92}));
  marker.rotation.x=Math.PI/2;marker.position.y=3.5;o.add(marker);
  const light=new THREE.PointLight('#ffde78',1.4,12);light.position.y=3.1;o.add(light);
  return {group:o,marker};
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
  update(time){
    this.pickups.forEach((p,i)=>{p.visual.marker.position.y=3.45+Math.sin(time*2+i)*.17;p.visual.marker.rotation.z=time*.9;});
    this.dropMarker.rotation.y=time*.32;
  }
}
