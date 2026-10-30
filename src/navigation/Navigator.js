import * as THREE from 'three';
import {planRoadRoute,getNextTurn,distance} from './Route.js';
import {terrainHeight} from '../world/World.js';

// A few small translucent chevrons floating above the road are clearly an
// optional game helper, not permanent painted road markings. One instanced
// mesh means a single draw call even on phones.
const arrowShape=new THREE.Shape();
arrowShape.moveTo(-.32,-1.10);
arrowShape.lineTo(.32,-1.10);
arrowShape.lineTo(.32,.10);
arrowShape.lineTo(.92,.10);
arrowShape.lineTo(0,1.42);
arrowShape.lineTo(-.92,.10);
arrowShape.lineTo(-.32,.10);
arrowShape.closePath();
const arrowGeometry=new THREE.ShapeGeometry(arrowShape);
arrowGeometry.computeVertexNormals();
const arrowMaterial=new THREE.MeshBasicMaterial({
  color:'#62e1f8',transparent:true,opacity:.43,depthWrite:false,
  depthTest:true,side:THREE.DoubleSide
});
const MAX_MARKERS=12;
const Y_AXIS=new THREE.Vector3(0,1,0);
const baseRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
const dummy=new THREE.Object3D();

export class Navigator{
 constructor(scene){
  this.scene=scene;this.group=new THREE.Group();scene.add(this.group);
  this.guidesEnabled=true;
  this.guideMesh=new THREE.InstancedMesh(arrowGeometry,arrowMaterial,MAX_MARKERS);
  this.guideMesh.count=0;this.guideMesh.frustumCulled=false;this.guideMesh.renderOrder=3;
  this.guideMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.group.add(this.guideMesh);
  this.samples=[];this.lastGuidePosition=null;
  this.route=[];this.targetId='';this.lastPosition=null;this.direction=null;
  this.beacon=new THREE.Group();scene.add(this.beacon);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,.22,6,24),new THREE.MeshBasicMaterial({color:0xffcc68}));
  ring.rotation.x=Math.PI/2;ring.position.y=.28;this.beacon.add(ring);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.65,.95,8,6,1,true),new THREE.MeshBasicMaterial({color:0xffcc68,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}));
  pillar.position.y=4;this.beacon.add(pillar);
  this.beacon.visible=false;this.group.visible=false;
 }
 setRoadGuides(enabled){
   this.guidesEnabled=Boolean(enabled);
   this.group.visible=this.guidesEnabled&&this.guideMesh.count>0;
   if(this.guidesEnabled)this.lastGuidePosition=null;
 }
 update(player,target,time){
  if(!target){
    this.direction=null;this.beacon.visible=false;
    this.group.visible=false;this.guideMesh.count=0;
    return null;
  }
  this.beacon.visible=true;
  const p=player.position,position=[p[0],p[2]],dest=target.pos;
  const id=target.kind+':'+dest.join(',');
  if(id!==this.targetId||!this.lastPosition||distance(position,this.lastPosition)>30){
    this.targetId=id;this.lastPosition=[...position];
    this.route=planRoadRoute(position,dest);
    this.rebuild();
  }
  this.beacon.position.set(dest[0],terrainHeight(dest[0],dest[1])+.3+Math.sin(time*1.6)*.22,dest[1]);
  this.beacon.children[0].rotation.z=time*.6;
  const color=target.kind==='dropoff'?0x5ceade:0xffcc68;
  this.beacon.children[0].material.color.set(color);
  this.beacon.children[1].material.color.set(color);
  this.direction=getNextTurn(position,this.route,player.yaw);
  if(this.guidesEnabled && (!this.lastGuidePosition||distance(position,this.lastGuidePosition)>5)){
    this.refreshGuides(position);
    this.lastGuidePosition=[...position];
  }
  this.group.visible=this.guidesEnabled&&this.guideMesh.count>0;
  return this.direction;
 }
 rebuild(){
  // Only keep road-aligned segments. We deliberately skip off-road legs
  // between a street intersection and a passenger/airport doorstep.
  this.samples=[];
  for(let i=1;i<this.route.length;i++){
    const a=this.route[i-1],b=this.route[i],length=distance(a,b);
    if(length<14)continue;
    const alongX=Math.abs(a[1]-b[1])<.001,alongZ=Math.abs(a[0]-b[0])<.001;
    const validRoad=alongX?Math.abs(a[1]/60-Math.round(a[1]/60))<.001:
      alongZ?Math.abs(a[0]/60-Math.round(a[0]/60))<.001:false;
    if(!validRoad)continue;
    const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
    const yaw=Math.atan2(-dx,-dz);
    for(let d=10;d<length-3;d+=16){
      this.samples.push({x:a[0]+dx*d,z:a[1]+dz*d,yaw});
    }
  }
  this.lastGuidePosition=null;
 }
 refreshGuides(position){
  if(!this.samples.length){this.guideMesh.count=0;return;}
  let start=0,best=Infinity;
  for(let i=0;i<this.samples.length;i++){
    const s=this.samples[i],d=Math.hypot(s.x-position[0],s.z-position[1]);
    if(d<best){best=d;start=i;}
  }
  let count=0;
  for(let i=start;i<this.samples.length&&count<MAX_MARKERS;i++){
    const s=this.samples[i],range=Math.hypot(s.x-position[0],s.z-position[1]);
    if(range>165)break;
    dummy.position.set(s.x,terrainHeight(s.x,s.z)+.27,s.z);
    dummy.quaternion.setFromAxisAngle(Y_AXIS,s.yaw).multiply(baseRotation);
    dummy.scale.setScalar(1);dummy.updateMatrix();
    this.guideMesh.setMatrixAt(count++,dummy.matrix);
  }
  this.guideMesh.count=count;
  this.guideMesh.instanceMatrix.needsUpdate=true;
 }
 getRoute(){return this.route;}
}
