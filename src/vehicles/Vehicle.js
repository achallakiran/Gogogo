import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from '../world/World.js';

const clamp=THREE.MathUtils.clamp;
const material=(c,opts={})=>new THREE.MeshStandardMaterial({color:c,roughness:.58,metalness:.15,...opts});
const tireMat=material('#161e2b',{roughness:.98});
const wheelHub=material('#e4eaf0',{metalness:.7,roughness:.24});
const glassMat=material('#5c879d',{transparent:true,opacity:.86,metalness:.36,roughness:.17});
const lightMat=material('#ffeac4',{emissive:'#ffc06a',emissiveIntensity:.8});
const tailMat=material('#ff5062',{emissive:'#f91e3a',emissiveIntensity:.6});
function cube(parent,w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,r,h,mat,x,y,z,rotateZ=Math.PI/2){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat);m.position.set(x,y,z);m.rotation.z=rotateZ;m.castShadow=true;parent.add(m);return m;}
export function makeVehicleModel(spec,color){
  const root=new THREE.Group();const chassis=new THREE.Group();root.add(chassis);
  const paint=material(color,{metalness:.25,roughness:.4});
  const dark=material('#243047',{metalness:.12});
  const w=spec.width,l=spec.length,r=spec.wheel;
  const truck=spec.id==='truck',van=spec.id==='van',suv=spec.id==='suv',sports=spec.id==='coupe';
  const floorY=truck?.04:-.09;
  cube(chassis,w,.46,l*.95,paint,0,floorY,0);
  cube(chassis,w*.94,.22,l*.93,material('#15243a'),0,floorY-.28,0);
  const roofY=truck?.90:van?1.10:suv?.90:sports?.44:.71;
  const roofW=w*(truck?.60:.84), roofLength=l*(van?.82:sports?.39:.52);
  cube(chassis,roofW,roofY*1.05,roofLength,paint,0,roofY*.59,l*(van?.0:.08));
  // cabin side windows and windshield; front of car is -Z
  cube(chassis,roofW*.92,roofY*.51,.07,glassMat,0,roofY*.71,l*.08-roofLength*.5-.035);
  cube(chassis,roofW*.92,roofY*.42,.06,glassMat,0,roofY*.69,l*.08+roofLength*.5+.035);
  for(let side of [-1,1]){
    cube(chassis,.07,roofY*.38,roofLength*.72,glassMat,side*(roofW*.5+.04),roofY*.70,l*.08);
    cube(chassis,.095,.18,l*.95,dark,side*(w*.5),-.02,0);
    cube(chassis,.11,.20,.25,dark,side*(w*.51),.4,-l*.29);
  }
  const lampY=floorY+.08;
  for(const side of [-1,1]){
    cube(chassis,.46,.18,.09,lightMat,side*w*.31,lampY,-l*.48-.04);
    cube(chassis,.48,.18,.09,tailMat,side*w*.31,lampY,l*.48+.04);
  }
  cube(chassis,w*.65,.13,.15,dark,0,floorY-.20,-l*.49);
  cube(chassis,w*.65,.13,.15,dark,0,floorY-.20,l*.49);
  if(spec.id==='taxi'){
    cube(chassis,.95,.24,.52,material('#ffe59b',{emissive:'#cca03b',emissiveIntensity:.3}),0,roofY*1.15,l*.08);
  }
  if(truck){cube(chassis,w*.75,.13,l*.40,dark,0,.56,l*.08);cube(chassis,w*.86,.16,.48,dark,0,-.31,-l*.5);}
  if(sports){cube(chassis,w*.92,.09,.36,paint,0,.32,l*.41);}
  const wheels=[];
  for(const axle of [-1,1])for(const side of [-1,1]){
    const holder=new THREE.Group();holder.position.set(side*(w*.5-.06),-.50,axle*(l*.5-r*.85));root.add(holder);
    const spin=new THREE.Group();holder.add(spin);
    cylinder(spin,r,r*.55,tireMat,0,0,0);cylinder(spin,r*.64,r*.59,wheelHub,side*r*.29,0,0);
    const rim=cylinder(spin,r*.28,r*.6,dark,side*r*.31,0,0);rim.castShadow=false;
    wheels.push({holder,spin,axle,side,baseY:-.50});
  }
  return {root,chassis,paint,wheels};
}
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
    this.sync(0);
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
    const yawRate=this.steer*speedFactor*spec.handling*1.22*Math.sign(forwardSpeed||1);
    const av=body.angvel();body.setAngvel({x:av.x*.88,y:yawRate,z:av.z*.88},true);
    this.speed=forwardSpeed;
  }
  sync(dt){
    const p=this.body.translation(),q=this.body.rotation();
    this.model.root.position.set(p.x,p.y,p.z);
    this.model.root.quaternion.set(q.x,q.y,q.z,q.w);
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
    this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.steer=0;this.speed=0;this.sync(.016);
  }
  setColor(hex){this.color=hex;this.model.paint.color.set(hex);}
  dispose(){this.scene.remove(this.model.root);this.model.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.world.removeRigidBody(this.body);}
}
