import * as THREE from 'three';
import {planRoadRoute,getNextTurn,distance} from './Route.js';
import {terrainHeight} from '../world/World.js';
const indicatorMat=new THREE.MeshBasicMaterial({color:0xf8cc64,transparent:true,opacity:.86,depthWrite:false,side:THREE.DoubleSide});
const sharedGeo=new THREE.BoxGeometry(.56,.045,1);
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Navigator{
 constructor(scene){
  this.scene=scene;this.group=new THREE.Group();scene.add(this.group);
  this.route=[];this.lastPlan=null;this.targetId='';this.lastPosition=null;this.direction=null;
  this.beacon=new THREE.Group();scene.add(this.beacon);
  const beaconRing=new THREE.Mesh(new THREE.TorusGeometry(2.6,.22,6,24),new THREE.MeshBasicMaterial({color:0xffcc68}));
  beaconRing.rotation.x=Math.PI/2;beaconRing.position.y=.28;this.beacon.add(beaconRing);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.65,.95,8,6,1,true),new THREE.MeshBasicMaterial({color:0xffcc68,transparent:true,opacity:.26,depthWrite:false,side:THREE.DoubleSide}));
  pillar.position.y=4;this.beacon.add(pillar);
  this.beacon.visible=false;
 }
 update(player,target,time){
  if(!target){this.direction=null;this.beacon.visible=false;this.group.visible=false;return null;}
  this.group.visible=true;this.beacon.visible=true;
  const p=player.position,position=[p[0],p[2]],dest=target.pos;
  const id=target.kind+':'+dest.join(',');
  if(id!==this.targetId||!this.lastPosition||distance(position,this.lastPosition)>30){
    this.targetId=id;this.lastPosition=[...position];
    this.route=planRoadRoute(position,dest);
    this.rebuild();
  }
  this.beacon.position.set(dest[0],terrainHeight(dest[0],dest[1])+.3+Math.sin(time*1.6)*.22,dest[1]);
  this.beacon.children[0].rotation.z=time*.6;
  this.beacon.children[0].material.color.set(target.kind==='dropoff'?0x5ceade:0xffcc68);
  this.beacon.children[1].material.color.set(target.kind==='dropoff'?0x5ceade:0xffcc68);
  const hint=getNextTurn(position,this.route,player.yaw);
  this.direction=hint;
  return hint;
 }
 rebuild(){
  for(const child of [...this.group.children]){this.group.remove(child);child.geometry?.dispose();}
  if(this.route.length<2)return;
  // Arrows make road navigation discoverable without painting the entire road.
  for(let i=1;i<this.route.length;i++){
    const a=this.route[i-1],b=this.route[i];
    const length=distance(a,b);if(length<1)continue;
    const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
    const count=Math.min(22,Math.floor(length/9));
    for(let n=0;n<count;n++){
      const t=(n+.55)/(count+.3),x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      const obj=new THREE.Mesh(sharedGeo,indicatorMat);
      obj.scale.z=cap(length/count*.55,1.0,3.5);
      obj.position.set(x,terrainHeight(x,z)+.23,z);
      obj.rotation.y=Math.atan2(dx,dz);obj.renderOrder=2;
      this.group.add(obj);
    }
  }
 }
 getRoute(){return this.route;}
}
