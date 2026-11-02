import * as THREE from 'three';
// One cheap points buffer. Dust is emitted by REAL wheel locations and tire
// slip; road driving stays clean until a hard turn or braking slide.
const SIZE=140;
export class DrivingFX{
 constructor(scene){
  this.scene=scene;
  this.particles=Array.from({length:SIZE},()=>({life:0,x:0,y:-100,z:0,vx:0,vy:0,vz:0,size:1}));
  this.positions=new Float32Array(SIZE*3);
  this.colors=new Float32Array(SIZE*3);
  this.geo=new THREE.BufferGeometry();
  this.geo.setAttribute('position',new THREE.BufferAttribute(this.positions,3));
  this.geo.setAttribute('color',new THREE.BufferAttribute(this.colors,3));
  this.points=new THREE.Points(this.geo,new THREE.PointsMaterial({
    size:1.5,transparent:true,opacity:.68,vertexColors:true,depthWrite:false,
    sizeAttenuation:true
  }));
  this.points.name='driving-tire-dust';this.points.frustumCulled=false;
  scene.add(this.points);
  this.cursor=0;this.seed=991;this.emission=0;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 emit(vehicle,offRoad){
  const pose=vehicle.model.root,angle=vehicle.yaw,fwdX=-Math.sin(angle),fwdZ=-Math.cos(angle);
  const rightX=-fwdZ,rightZ=fwdX;
  for(const side of [-1,1]){
   const p=this.particles[this.cursor++%SIZE],x=pose.position.x-fwdX*vehicle.spec.length*.37+rightX*side*vehicle.spec.width*.43;
   const z=pose.position.z-fwdZ*vehicle.spec.length*.37+rightZ*side*vehicle.spec.width*.43;
   const wheel=vehicle.model.wheels.find(w=>w.axle===1&&w.side===side);
   const ground=wheel?.contactY??pose.position.y-1;
   p.x=x+(this.random()-.5)*.36;p.y=ground+.15;p.z=z+(this.random()-.5)*.36;
   p.vx=-fwdX*(1.4+this.random()*2)+(this.random()-.5)*1.2;
   p.vy=.55+this.random()*.7;p.vz=-fwdZ*(1.4+this.random()*2)+(this.random()-.5)*1.2;
   p.life=.48+this.random()*.42;
   p.color=offRoad?0:1;p.size=1;
  }
 }
 update(vehicle,dt,active=true){
  if(!vehicle||dt<=0)return;
  const v=vehicle.horizontalSpeed,offRoad=vehicle.surfaceName!=='asphalt';
  const emit=active&&v>5&&(offRoad||vehicle.sliding);
  this.emission+=emit?dt*(offRoad?22:14):0;
  if(!emit)this.emission=Math.min(this.emission,1);
  while(this.emission>=1){this.emit(vehicle,offRoad);this.emission-=1;}
  for(let i=0;i<SIZE;i++){
   const p=this.particles[i],base=i*3;
   if(p.life>0){
    p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy+=dt*.15;
    p.life-=dt;p.size+=dt*.7;
   }
   if(p.life>0){
    this.positions[base]=p.x;this.positions[base+1]=p.y;this.positions[base+2]=p.z;
    const t=Math.max(0,Math.min(1,p.life*1.3)),brown=p.color===0;
    this.colors[base]=(brown?.62:.82)*t;
    this.colors[base+1]=(brown?.51:.83)*t;
    this.colors[base+2]=(brown?.36:.83)*t;
   }else{
    this.positions[base]=this.positions[base+2]=0;this.positions[base+1]=-200;
    this.colors[base]=this.colors[base+1]=this.colors[base+2]=0;
   }
  }
  this.geo.attributes.position.needsUpdate=true;
  this.geo.attributes.color.needsUpdate=true;
 }
}
