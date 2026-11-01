import * as THREE from 'three';
import {createVoxelVehicleModel} from './VoxelVehicleModel.js';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight,surfaceInfoAt} from '../world/SurfaceSystem.js';
import {steeringYawRate} from './Steering.js';
import {longitudinalAcceleration} from './DrivingDynamics.js';
import {suspensionAcceleration} from './Suspension.js';
import {terrainDriveProfile} from './DrivingFeel.js';

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
    this.scene=scene;this.world=world;this.spec=spec;this.color=color;this.heading=heading;this.steer=0;this.speed=0;this.throttle=0;this.yawVelocity=0;this.model=makeVehicleModel(spec,color);scene.add(this.model.root);
    const q={x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)};
    this.body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(at[0],at[1],at[2]).setRotation(q).setLinearDamping(.22).setAngularDamping(3.8).setCanSleep(false).setCcdEnabled(true));
    const chassisCollider=RAPIER.ColliderDesc.cuboid(spec.width*.46,.28,spec.length*.44).setDensity(.6).setFriction(1.2).setRestitution(0);
    this.chassisCollider=world.createCollider(chassisCollider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),this.body);
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
  // Four physically distinct spring-damper impulses support the chassis at
  // wheel locations while the existing round tire colliders preserve the
  // proven no-launch contact behaviour. Forces are deliberately bounded.
  applyWheelSuspension(dt){
    const body=this.body,base=body.translation(),rotation=body.rotation();
    const q=new THREE.Quaternion(rotation.x,rotation.y,rotation.z,rotation.w);
    const vel=body.linvel(),ang=body.angvel(),mass=body.mass();
    const wheelMass=mass/4;
    let grounded=0;
    for(const w of this.model.wheels){
      const local=new THREE.Vector3(
        w.side*(this.spec.width*.5-.06),.31,
        w.axle*(this.spec.length*.5-this.spec.wheel*.85)
      ).applyQuaternion(q);
      const x=base.x+local.x,y=base.y+local.y,z=base.z+local.z;
      const ray=new RAPIER.Ray({x,y,z},{x:0,y:-1,z:0});
      const hit=this.world.castRay(ray,1.63,true,
        undefined,undefined,undefined,body);
      if(!hit){w.springLength=1.63;w.supported=false;continue;}
      grounded++;
      const point={x,y,z},distance=hit.timeOfImpact;
      // Angular velocity at this wheel contact (v + omega cross r).
      const vy=vel.y+ang.z*local.x-ang.x*local.z;
      const accel=suspensionAcceleration(distance,vy,1.40,18,3.8,5);
      if(accel>0)body.applyImpulseAtPoint(
        {x:0,y:wheelMass*accel*dt,z:0},point,true);
      w.springLength=distance;w.supported=true;
    }
    this.springContactCount=grounded;
  }
  drive(input,dt,settings){
    const body=this.body,vel=body.linvel(),spec=this.spec;
    this.applyWheelSuspension(dt);
    const fwd=this.direction,right=new THREE.Vector3(-fwd.z,0,fwd.x);
    const forwardSpeed=vel.x*fwd.x+vel.z*fwd.z;
    const lateralSpeed=vel.x*right.x+vel.z*right.z;
    const mass=body.mass();
    const pos=body.translation();
    const surface=terrainDriveProfile(surfaceInfoAt(pos.x,pos.z),spec);
    const steerTarget=clamp((Number(input.right)-Number(input.left))*(.55+settings.sensitivity*.9),-1,1);
    this.steer=THREE.MathUtils.damp(this.steer,steerTarget,4.4,dt);
    // Engine power rises gradually: all vehicle classes retain real inertia.
    this.throttle=THREE.MathUtils.damp(this.throttle,input.gas?1:0,3.2,dt);
    const driveInput={gas:!!input.gas,brake:!!input.brake};
    let accel=longitudinalAcceleration(driveInput,forwardSpeed,spec);
    if(input.gas&&!input.brake)accel*=.30+.70*this.throttle;
    const speedLimit=spec.topSpeed*surface.speedRatio;
    if(forwardSpeed>speedLimit&&accel>0)accel=0;
    // Ground resistance makes cross-country shortcuts slower and rougher,
    // without creating an invisible world boundary or scripted teleport.
    const rolling=surface.rolling*Math.sign(forwardSpeed);
    const horizontalDrag=.003*this.horizontalSpeed*this.horizontalSpeed*Math.sign(forwardSpeed);
    accel-=rolling+horizontalDrag;
    this.braking=!!input.brake&&forwardSpeed>1.2;
    this.reversing=forwardSpeed<-.7;
    body.applyImpulse({x:fwd.x*accel*dt*mass,y:0,z:fwd.z*accel*dt*mass},true);
    // Real tire impulse, with worse lateral grip on dirt, rock and mud.
    const grip=clamp(spec.grip*surface.traction*dt,0,.96);
    body.applyImpulse({x:-right.x*lateralSpeed*grip*mass,y:0,z:-right.z*lateralSpeed*grip*mass},true);
    const speedFactor=clamp(Math.abs(forwardSpeed)/8,0,1);
    const steeringScale=surface.traction*clamp(1-Math.abs(forwardSpeed)/Math.max(spec.topSpeed,1)*.34,.55,1);
    const targetYaw=steeringYawRate(this.steer,speedFactor,spec.handling*steeringScale,forwardSpeed);
    this.yawVelocity=THREE.MathUtils.damp(this.yawVelocity,targetYaw,4.8,dt);
    // Retain the normal yaw steering but damp angular energy generated by
    // sphere-wheel/curb contacts. The old .88 multiplier allowed large
    // pitching impulses to grow into unintended wheelies and launches.
    const av=body.angvel(),q=body.rotation();
    const up=new THREE.Vector3(0,1,0).applyQuaternion(
      new THREE.Quaternion(q.x,q.y,q.z,q.w));
    const upright=new THREE.Vector3().crossVectors(up,new THREE.Vector3(0,1,0));
    const grounded=pos.y<=surfaceInfoAt(pos.x,pos.z).height+3.1;
    const spring=grounded?6.2:1.25;
    const pitch=clamp(av.x*.62+upright.x*spring,-.64,.64);
    const roll=clamp(av.z*.62+upright.z*spring,-.64,.64);
    body.setAngvel({x:pitch,y:this.yawVelocity,z:roll},true);
    // Contact impulses should compress a toy-car suspension, not launch
    // the entire vehicle several storeys above the road. Preserve descent.
    const rising=body.linvel();
    if(grounded&&rising.y>4.2)
      body.setLinvel({x:rising.x,y:4.2,z:rising.z},true);
    this.speed=forwardSpeed;
  }
  stabilizeAfterStep(){
    const p=this.body.translation(),ground=surfaceInfoAt(p.x,p.z).height;
    if(p.y<ground+3.1){
      const v=this.body.linvel();
      if(v.y>4.2)this.body.setLinvel({x:v.x,y:4.2,z:v.z},true);
    }
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
    // A wheel's world position depends on vehicle heading. Sample actual
    // physics contact (including repaired asphalt), not unrotated terrain.
    for(const w of this.model.wheels){
      w.holder.rotation.y=w.axle<0?this.steer*.38:0;
      const local=new THREE.Vector3(
        w.side*(this.spec.width*.5-.06),0,
        w.axle*(this.spec.length*.5-this.spec.wheel*.85)
      ).applyQuaternion(this.model.root.quaternion);
      const wx=p.x+local.x,wz=p.z+local.z,rayY=p.y+local.y+1.1;
      const hit=this.world.castRay(new RAPIER.Ray(
        {x:wx,y:rayY,z:wz},{x:0,y:-1,z:0}),4,true,
        undefined,undefined,undefined,this.body);
      const floor=hit?rayY-hit.timeOfImpact:terrainHeight(wx,wz);
      // Strictly visual spring travel, deliberately cannot launch the chassis.
      const desired=clamp(floor+this.spec.wheel*.86-p.y-w.baseY,
        -this.spec.suspension,this.spec.suspension);
      w.holder.position.y=THREE.MathUtils.damp(w.holder.position.y,
        w.baseY+desired,11,Math.max(dt,.016));
      w.travel=w.holder.position.y-w.baseY;
      w.contactY=floor;
      w.spin.rotation.x+=this.speed*Math.max(dt,.016)/this.spec.wheel;
    }
  }
  reset(at=[0,2,0],heading=0){
    this.body.setTranslation({x:at[0],y:Math.max(terrainHeight(at[0],at[2])+2,at[1]),z:at[2]},true);
    this.body.setRotation({x:0,y:Math.sin(heading/2),z:0,w:Math.cos(heading/2)},true);
    this.body.setLinvel({x:0,y:0,z:0},true);this.body.setAngvel({x:0,y:0,z:0},true);this.steer=0;this.speed=0;this.throttle=0;this.yawVelocity=0;this.springContactCount=0;
    for(const w of this.model.wheels){w.springLength=1.63;w.supported=false;}
    this.capturePhysicsPose(true);this.sync(.016,1);
  }
  setColor(hex){this.color=hex;this.model.paint.color.set(hex);}
  dispose(){this.scene.remove(this.model.root);this.model.root.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.world.removeRigidBody(this.body);}
}
