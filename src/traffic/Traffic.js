import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {makeVehicleModel} from '../vehicles/Vehicle.js';
import {VEHICLES} from '../core/config.js';
import {terrainHeight} from '../world/World.js';
const rand=(()=>{let a=44881;return()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};})();
const PATHS=[
  [[-240,-180],[-240,180],[0,180],[0,-180]],
  [[60,-240],[60,120],[240,120],[240,-240]],
  [[-180,-120],[180,-120],[180,60],[-180,60]],
  [[-120,-240],[-120,120],[120,120],[120,-240]],
  [[0,-180],[240,-180],[240,180],[0,180]],
  [[-240,0],[240,0],[240,240],[-240,240]],
  [[-180,-240],[120,-240],[120,0],[-180,0]],
  [[-60,-120],[240,-120],[240,60],[-60,60]]
];
// Place vehicle a little to the right of the direction of travel.
function lanePoint(point,next){const dx=next[0]-point[0],dz=next[1]-point[1],len=Math.hypot(dx,dz)||1;return [point[0]+dz/len*2.75,point[1]-dx/len*2.75];}
export class Traffic{
  constructor(scene,physics){this.scene=scene;this.world=physics;this.cars=[];this.time=0;
    for(let i=0;i<22;i++)this.spawn(i);
  }
  spawn(i){
    const path=PATHS[i%PATHS.length],segment=Math.floor(rand()*path.length),next=(segment+1)%path.length;
    const point=lanePoint(path[segment],path[next]),to=lanePoint(path[next],path[(next+1)%path.length]);
    const t=rand()*.78;const x=point[0]+(to[0]-point[0])*t,z=point[1]+(to[1]-point[1])*t;
    const spec=VEHICLES[i%9===0?4:i%7===0?1:i%4===0?2:0],v=makeVehicleModel(spec,['#e9c376','#f1b1c0','#82b5d8','#91c9b6','#ccb8e5','#e6efef'][i%6]);
    const group=v.root;this.scene.add(group);group.position.set(x,terrainHeight(x,z)+1,z);
    const heading=Math.atan2(-(to[0]-point[0]),-(to[1]-point[1]));group.rotation.y=heading;
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,terrainHeight(x,z)+1,z).setRotation({x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)}));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(spec.width*.45,.62,spec.length*.43).setFriction(1),body);
    this.cars.push({path,segment,next,point,to,x,z,heading,velocity:9+rand()*6,cruise:10+rand()*6,group,body,wheels:v.wheels});
  }
  update(dt,player){
    this.time+=dt;const pp=player?.position||[9999,0,9999];
    for(const c of this.cars){
      const dx=c.to[0]-c.x,dz=c.to[1]-c.z,dist=Math.hypot(dx,dz);
      if(dist<4){c.segment=c.next;c.next=(c.next+1)%c.path.length;c.point=lanePoint(c.path[c.segment],c.path[c.next]);c.to=lanePoint(c.path[c.next],c.path[(c.next+1)%c.path.length]);}
      const toX=c.to[0]-c.x,toZ=c.to[1]-c.z,mag=Math.hypot(toX,toZ)||1;
      const dirX=toX/mag,dirZ=toZ/mag;
      let target=c.cruise;
      // Stop behind player or other traffic if they're in the same lane/direction.
      const obstacles=[{x:pp[0],z:pp[2],velocity:0},...this.cars.filter(other=>other!==c)];
      for(const other of obstacles){
        const vx=other.x-c.x,vz=other.z-c.z;
        const along=vx*dirX+vz*dirZ,side=Math.abs(vx*dirZ-vz*dirX);
        if(along>0&&along<16&&side<3.4){target=Math.min(target,Math.max(0,(along-4)*1.3));}
      }
      // Every intersection alternates directional priority.
      const nextDistance=Math.hypot(c.to[0]-c.x,c.to[1]-c.z);
      const horizontal=Math.abs(dirX)>.5;const phase=(Math.floor(this.time/10)%2===0);
      if(nextDistance<14 && nextDistance>3 && horizontal===phase)target=Math.min(target,Math.max(0,(nextDistance-6)*1.6));
      c.velocity=THREE.MathUtils.damp(c.velocity,target,target<c.velocity?3.8:1.1,dt);
      const distance=Math.min(c.velocity*dt,mag);
      c.x+=dirX*distance;c.z+=dirZ*distance;
      const desired=Math.atan2(-dirX,-dirZ),angleDelta=Math.atan2(Math.sin(desired-c.heading),Math.cos(desired-c.heading));
      c.heading+=THREE.MathUtils.clamp(angleDelta,-dt*2.7,dt*2.7);
      const y=terrainHeight(c.x,c.z)+1.0;
      c.body.setNextKinematicTranslation({x:c.x,y,z:c.z});
      c.body.setNextKinematicRotation({x:0,y:Math.sin(c.heading/2),z:0,w:Math.cos(c.heading/2)});
      c.group.position.set(c.x,y,c.z);c.group.rotation.set(0,c.heading,0);
      c.wheels.forEach(w=>{w.spin.rotation.x+=c.velocity*dt/0.55;});
    }
  }
  dispose(){for(const c of this.cars){this.scene.remove(c.group);this.world.removeRigidBody(c.body);}}
}
