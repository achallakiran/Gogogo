import * as THREE from 'three';
import {createVoxelVehicleModel} from './VoxelVehicleModel.js';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from '../world/World.js';
import {steeringYawRate} from './Steering.js';

const clamp=THREE.MathUtils.clamp;
const material=(c,opts={})=>new THREE.MeshStandardMaterial({color:c,roughness:.58,metalness:.15,...opts});
const tireMat=material('#161e2b',{roughness:.98});
const wheelHub=material('#e4eaf0',{metalness:.7,roughness:.24});
const glassMat=material('#5c879d',{transparent:true,opacity:.86,metalness:.36,roughness:.17});
const lightMat=material('#ffeac4',{emissive:'#ffc06a',emissiveIntensity:.8});
const tailMat=material('#ff5062',{emissive:'#f91e3a',emissiveIntensity:.6});
function cube(parent,w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,r,h,mat,x,y,z,rotateZ=Math.PI/2){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.position.set(x,y,z);m.rotation.z=rotateZ;m.castShadow=true;parent.add(m);return m;}
export function makeVehicleModel(spec,color){return createVoxelVehicleModel(spec,color);}
export class Vehicle{
  constructor(scene,world,spec,color,at=[0,2,0],heading=0){
    this.scene=scene;this.world=world;this.spec=spec;this.color=color;this.heading=heading;this.steer=0;this.speed=0;this.model=makeVehicleModel(spec,color);scene.add(this.model.root);
    const q={x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)};
    this.body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(at[0],at[1],at[2]).setRotation(q).setLinearDamping(.17).setAngularDamping(2.3).setCanSleep(false));
    const chassisCollider=RAPIER.ColliderDesc.cuboid(spec.width*.46,.28,spec.length*.44).setDensity(.6).setFriction(1.2).setRestitution(.04);
    world.createCollider(chassisCollider,this.body);
    for(const side of [-1,1])for(const axle of [-1,1]){
      world.createCollider(RAPIER.ColliderDesc.ball(spec.wheel*.86).setTranslation(side*(spec.width*.5-.06),-.5,axle*(spec.length*.5-spec.wheel*.85)).setFriction(1.75).setRestitution(.04).setDensity(.25),this.body);
    }
    this.posePrev=null;this.poseCurr=null;this.capturePhysicsPose(true);this.sync(0,1);
  }
  capturePhysicsPose(reset=false){
    const p=this.body.translation(),r=this.body.rotation();
    const pose={position:new THREE.Vector3(p.x,p.y,p.z),rotation:new THREE.Quaternion(r.x,r.y,r.z,r.w)};
    if(reset||!this.poseCurr){this.posePrev=pose;this.poseCurr=pose;}
    else{this.posePrev=this.poseCurr;this.poseCurr=pose;}
  }
  get position(){const p=this.body.translation();return [p.x,p.y,p.z];}
  get horizontalSpeed(){const v=this.body.linvel();return Math.hypot(v.x,v.z);}
  get direction(){const q=this.body.rotation();const d=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));d.y=0;return d.lengthSq()>.0001?d.normalize():new THREE.Vector3(0,0,-1);}
  get yaw(){const d=this.direction;return Math.atan2(-d.x,-d.z);}
  drive(input,dt,settings){
    const body=this.body,vel=body.linvel(),spec=this.spec;
    const fwd=this.direction,right=new THREE.Vector3(-fwd.z,0,fwd.x);
    const forwardSpeed=vel.x*fwd.x+vel.z*fwd.z;
    const lateralSpeed=vel.x*right.x+vel.z*right.z;
    const mass=body.mass();
    const steerTarget=clamp((Number(input.right)-Number(input.left))*(.55+settings.sensitivity*.9),-1,1);
    this.steer=THREE.MathUtils.damp(this.steer,steerTarget,9,dt);
    // Forces are impulses integrated by Rapier's fixed physics step.
    let accel=0;
    if(input.gas) accel=spec.accel*(Math.max(0,1-this.horizontalSpeed/(spec.topSpeed*1.12)));
    if(input.brake)accel=forwardSpeed>1?-spec.brake:-spec.accel*.44;
    if(!input.gas&&!input.brake)accel=-forwardSpeed*.48;
    const horizontalDrag=.004*this.horizontalSpeed*this.horizontalSpeed;
    accel-=Math.sign(forwardSpeed)*horizontalDrag;
    if(forwardSpeed>spec.topSpeed&&accel>0)accel=0;
    body.applyImpulse({x:fwd.x*accel*dt*mass,y:0,z:fwd.z*accel*dt*mass},true);
    // Lateral tire traction: surfaces and vehicle type influence skids.
    const pos=body.translation();const offRoad=!([-240,-180,-120,-60,0,60,120,180,240].some(x=>Math.abs(pos.x-x)<8) || [-240,-180,-120,-60,0,60,120,180,240].some(z=>Math.abs(pos.z-z)<8));
    const gripFactor=offRoad ? (spec.id==='truck'?.90:.45) : 1;
    const grip=clamp(spec.grip*gripFactor*dt,0,.96);
    body.applyImpulse({x:-right.x*lateralSpeed*grip*mass,y:0,z:-right.z*lateralSpeed*grip*mass},true);
    const speedFactor=clamp(Math.abs(forwardSpeed)/13,0,1);
    const yawRate=steeringYawRate(this.steer,speedFactor,spec.handling,forwardSpeed);
    const av=body.angvel();body.setAngvel({x:av.x*.88,y:yawRate,z:av.z*.88},true);
    this.speed=forwardSpeed;
  }
  sync(dt,alpha=1){
    const curr=this.poseCurr,prev=this.posePrev||curr;
    const pose=curr||{position:new THREE.Vector3(...this.position),rotation:new THREE.Quaternion()};
    this.model.root.position.copy(prev?prev.position:pose.position).lerp(pose.position,THREE.MathUtils.clamp(alpha,0,1));
    this.model.root.quaternion.copy(prev?prev.rotation:pose.rotation).slerp(pose.rotation,THREE.MathUtils.clamp(alpha,0,1));
    const p=this.model.root.position;
    const visualLean=clamp(-this.steer*this.speed*.010,-.20,.20);
    this.model.chassis.rotation.z=THREE.MathUtils.damp(this.model.chassis.rotation.z,visualLean,5,Math.max(dt,.016));
    this.model.chassis.rotation.x=THREE.MathUtils.damp(this.model.chassis.rotation.x,clamp(-this.speed*.0014,-.06,.06),3,Math.max(dt,.016));
    for(const w of this.model.wheels){
      w.holder.rotation.y=w.axle<0?this.steer*.38:0;
      const surface=terrainHeight(p.x+(w.side*this.spec.width*.5),p.z+(w.axle*this.spec.length*.35));
      const compressed=clamp((surface+this.spec.wheel+ .48 - p.y)*.15,-this.spec.suspension,this.spec.suspension);
      w.holder.position.y=THREE.MathUtils.damp(w.holder.position.y,w.baseY+compressed,9,Math.max(dt,.016));
      w.spin.rotation.x+=this.speed*Math.max(dt,.016)/this.spec.wheel;
    }
  }
  reset(at=[0,2,0],heading=0){
    this.body.setTranslation({x:at[0],y:Math.max(terrainHeight(at[0],at[2])+2,at[1]),z:at[2]},true);
    this.body.setRotation({x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)},true);
    this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.steer=0;this.speed=0;this.capturePhysicsPose(true);this.sync(.016,1);
  }
  setColor(hex){this.color=hex;this.model.paint.color.set(hex);}
  dispose(){this.scene.remove(this.model.root);this.model.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.world.removeRigidBody(this.body);}
}
