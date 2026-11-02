import * as THREE from 'three';
import {planRoadRoute,getNextTurn,distance} from './Route.js';
import {terrainHeight} from '../world/World.js';
import {MOUNTAIN_SAMPLES} from '../world/MountainData.js';
import {routeLookahead,angleToWaypoint,smoothGuideAngle} from './Guidance.js';

// Subtle, floating breadcrumb pads replace duplicated road-painted chevrons.
// Existing minimap and turn arrow remain available when guides are disabled.
const arrowGeometry=new THREE.PlaneGeometry(.36,1.25);
arrowGeometry.computeVertexNormals();
const arrowMaterial=new THREE.MeshBasicMaterial({
  color:'#66e9df',transparent:true,opacity:.32,depthWrite:false,
  depthTest:true,side:THREE.DoubleSide
});
const MAX_MARKERS=12;
const Y_AXIS=new THREE.Vector3(0,1,0);
const baseRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
const dummy=new THREE.Object3D();

// Arrow shape is directly constructed in the XZ plane. Its TIP has local Z < 0,
// the same direction as vehicle forward, so geometry cannot be reversed.
function createHoverArrow(){
 const shape=new THREE.BufferGeometry();
 const polygon=[[0,-1.8],[-.94,-.18],[-.32,-.18],[-.32,1.12],[.32,1.12],[.32,-.18],[.94,-.18]];
 const triangles=[0,1,2,0,2,5,0,5,6,2,3,4,2,4,5];
 const points=[];
 for(const i of triangles){const [x,z]=polygon[i];points.push(x,0,z);}
 shape.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
 shape.computeVertexNormals();
 const fill=new THREE.MeshBasicMaterial({color:'#ffdc8c',transparent:true,opacity:.60,
  depthTest:false,depthWrite:false,side:THREE.DoubleSide});
 const edge=new THREE.LineBasicMaterial({color:'#f6ffe9',transparent:true,opacity:.85,
  depthTest:false,depthWrite:false});
 const outlinePoints=[];
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length];
  outlinePoints.push(a[0],.02,a[1],b[0],.02,b[1]);
 }
 const outlineGeo=new THREE.BufferGeometry();
 outlineGeo.setAttribute('position',new THREE.Float32BufferAttribute(outlinePoints,3));
 const group=new THREE.Group(),arrow=new THREE.Mesh(shape,fill);
 arrow.renderOrder=18;
 const outline=new THREE.LineSegments(outlineGeo,edge);outline.renderOrder=19;
 // Lift the tip above the horizontal plane so this reads as a hologram
 // OVER the roof, not another 2D arrow painted on the tarmac.
 const tilted=new THREE.Group();tilted.rotation.x=.54;tilted.add(arrow,outline);
 group.add(tilted);
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.62,.05,6,28),
   new THREE.MeshBasicMaterial({color:'#97f2db',transparent:true,opacity:.42,depthTest:false,depthWrite:false}));
 halo.rotation.x=Math.PI/2;halo.position.y=-.65;halo.renderOrder=17;group.add(halo);
 const tether=new THREE.Mesh(new THREE.CylinderGeometry(.022,.045,1.1,6),
   new THREE.MeshBasicMaterial({color:'#c9fff1',transparent:true,opacity:.23,depthTest:false,depthWrite:false}));
 tether.position.y=-1.45;tether.renderOrder=17;group.add(tether);
 group.userData.tilted=tilted;group.userData.halo=halo;
 group.userData.fill=fill;group.userData.edge=edge;group.userData.tipLocal=[0,0,-1.8];
 group.name='floating-car-navigation-arrow';group.visible=false;
 return group;
}

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
  this.hoverArrow=createHoverArrow();scene.add(this.hoverArrow);
  this.smoothedHeading=NaN;
 }
 setRoadGuides(enabled){
   this.guidesEnabled=Boolean(enabled);
   // Do NOT re-enable the old painted road markers.
   this.group.visible=false;
   this.guideMesh.count=0;
   this.hoverArrow.visible=this.guidesEnabled&&Boolean(this.direction)&&this.direction.direction!=='ARRIVED';
 }
 update(player,target,time,dt=1/60){
  if(!target){
    this.direction=null;this.smoothedHeading=NaN;this.beacon.visible=false;
    this.group.visible=false;this.guideMesh.count=0;
    this.hoverArrow.visible=false;
    return null;
  }
  this.beacon.visible=true;
  const p=player.model.root.position,position=[p.x,p.z],dest=target.pos;
  const id=target.kind+':'+dest.join(',');
  if(id!==this.targetId||!this.route.length){
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
  // Place the arrow above the vehicle roof, not on the road.
  // Its facing follows the NEXT waypoint instead of just pointing at the airport.
  const next=routeLookahead(this.route,position,24)||dest;
  const heading=angleToWaypoint(position,next);
  // Shortest angular arc with rate limit: no snapping at intersections.
  this.smoothedHeading=smoothGuideAngle(this.smoothedHeading,heading,dt);
  this.hoverArrow.position.set(p.x,p.y+3.75+Math.sin(time*2.6)*.16,p.z);
  this.hoverArrow.rotation.set(0,this.smoothedHeading,0);
  const accent=target.kind==='dropoff'?'#77f3e1':'#ffdd92';
  this.hoverArrow.userData.fill.color.set(accent);
  this.hoverArrow.visible=this.guidesEnabled&&this.direction?.direction!=='ARRIVED';
  this.guideMesh.count=0;
  this.group.visible=false;
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
  // When heading up to the lodge, show chevrons that follow the curved
  // roadway rather than pretending the mountain is a city grid.
  const lodgeTarget=this.route.some(p=>p[1]>420&&p[0]>95&&p[0]<225);
  if(lodgeTarget){
    let descending=this.route.length>2&&this.route[0][1]>this.route[this.route.length-1][1];
    const samples=descending?[...MOUNTAIN_SAMPLES].reverse():MOUNTAIN_SAMPLES;
    for(let i=4;i<samples.length-4;i+=7){
      const a=samples[i],b=samples[Math.min(i+2,samples.length-1)];
      const yaw=Math.atan2(-(b.x-a.x),-(b.z-a.z));
      this.samples.push({x:a.x,z:a.z,yaw});
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
    dummy.position.set(s.x,terrainHeight(s.x,s.z)+.21,s.z);
    dummy.quaternion.setFromAxisAngle(Y_AXIS,s.yaw).multiply(baseRotation);
    dummy.scale.setScalar(1);dummy.updateMatrix();
    this.guideMesh.setMatrixAt(count++,dummy.matrix);
  }
  this.guideMesh.count=count;
  this.guideMesh.instanceMatrix.needsUpdate=true;
 }
 getRoute(){return this.route;}
}
