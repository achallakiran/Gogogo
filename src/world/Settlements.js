// Deliberate land-use clusters fill empty corridors with identifiable destinations.
// Buildings are solid; small details are instanced to avoid one draw call per prop.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {COAST_SAMPLES} from './CoastalRoad.js';
import {COUNTRY_SAMPLES} from './RegionalRoads.js';
import {MOUNTAIN_SAMPLES} from './MountainData.js';
import {FIXED_LANDMARKS} from './WorldManifest.js';
const GRID=[-240,-180,-120,-60,0,60,120,180,240];
export const SETTLEMENT_ZONES=Object.freeze([
 {id:'west-hamlet',kind:'village',bounds:[-510,-375,-210,100],seed:101,plots:54},
 {id:'south-workshops',kind:'industrial',bounds:[-210,200,-455,-305],seed:202,plots:55},
 {id:'east-suburb',kind:'suburb',bounds:[305,385,90,320],seed:303,plots:35},
 {id:'north-farms',kind:'farm',bounds:[-195,35,300,460],seed:404,plots:45},
 {id:'coastal-village',kind:'beach',bounds:[-605,-375,-450,-260],seed:505,plots:42}
].map(z=>Object.freeze({...z,bounds:Object.freeze(z.bounds)})));
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function distanceTo(points,x,z){let min=Infinity;for(let i=0;i<points.length;i+=2){const p=points[i],dx=p.x-x,dz=p.z-z;min=Math.min(min,dx*dx+dz*dz);}return Math.sqrt(min);}
export function parcelClear(x,z,w,d){
 if(x-w/2 < -650||x+w/2>650||z-d/2 < -490||z+d/2>490)return false;
 if(FIXED_LANDMARKS.some(p=>Math.abs(x-p.position[0])<(w+p.footprint[0])/2+13&&Math.abs(z-p.position[1])<(d+p.footprint[1])/2+13))return false;
 if(Math.abs(x)<282&&Math.abs(z)<282&&GRID.some(v=>Math.abs(x-v)<w/2+12||Math.abs(z-v)<d/2+12))return false;
 if(x>340&&z>-295&&z<75)return false; // airport runway and approach
 if(distanceTo(COAST_SAMPLES,x,z)<Math.max(w,d)/2+14)return false;
 if(distanceTo(COUNTRY_SAMPLES,x,z)<Math.max(w,d)/2+13)return false;
 if(x>40&&x<295&&z>260&&distanceTo(MOUNTAIN_SAMPLES,x,z)<Math.max(w,d)/2+15)return false;
 // Keep the northern lake and authored coastal landmarks open.
 if(((x+325)/111)**2+((z-335)/67)**2<1.25)return false;
 for(const [px,pz,fw,fd] of [[-553,-362,19,19],[-519,-309,23,45],[-459,-374,44,28]])
  if(Math.abs(x-px)<(w+fw)/2+12&&Math.abs(z-pz)<(d+fd)/2+12)return false;
 return true;
}
export function generateSettlementPlots(){
 const plots=[];
 for(const zone of SETTLEMENT_ZONES){
  const rand=random(zone.seed),[minX,maxX,minZ,maxZ]=zone.bounds;
  for(let i=0;i<zone.plots;i++){
   const x=minX+8+rand()*(maxX-minX-16),z=minZ+8+rand()*(maxZ-minZ-16);
   const w=zone.kind==='industrial'?10+rand()*8:6+rand()*7;
   const d=zone.kind==='industrial'?11+rand()*7:7+rand()*8;
   if(!parcelClear(x,z,w,d))continue;
   if(plots.some(p=>Math.abs(p.x-x)<(p.w+w)/2+5&&Math.abs(p.z-z)<(p.d+d)/2+5))continue;
   const h=zone.kind==='industrial'?5+rand()*4:zone.kind==='suburb'?7+rand()*5:3.5+rand()*4;
   plots.push({x,z,w,d,h,kind:zone.kind,zone:zone.id,shade:Math.floor(rand()*4)});
  }
 }
 return plots;
}
export function populateSettlements(scene,physics,RAPIER){
 const plots=generateSettlementPlots();
 const wallMaterials=['#e8c9a4','#e2bfae','#a9c9b6','#b6c6d4'].map(color=>new THREE.MeshLambertMaterial({color}));
 const roofMaterials=['#9a6452','#9d7861','#617c87','#aa8a60'].map(color=>new THREE.MeshLambertMaterial({color}));
 const detailsMat=new THREE.MeshLambertMaterial({color:'#6b8267'});
 const groups=[0,1,2,3].map(()=>({walls:[],roofs:[]}));const boxes=[],trees=[];
 for(const p of plots){
  const y=terrainHeight(p.x,p.z),wall={x:p.x,y:y+p.h/2,z:p.z,w:p.w,h:p.h,d:p.d};
  const roof={x:p.x,y:y+p.h+.55,z:p.z,w:p.w+1.1,h:1.1,d:p.d+1.1};
  groups[p.shade].walls.push(wall);groups[p.shade].roofs.push(roof);
  if(physics){
   const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wall.x,wall.y,wall.z));
   physics.createCollider(RAPIER.ColliderDesc.cuboid(p.w/2,p.h/2,p.d/2).setFriction(.85),body);
  }
  if(p.kind==='farm'){
   for(const sign of [-1,1])trees.push({x:p.x+sign*(p.w/2+4),z:p.z+3});
  }
  boxes.push(p);
 }
 const dummy=new THREE.Object3D(),meshes=[];
 function draw(items,material){
  if(!items.length)return;
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,items.length);
  items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);meshes.push(mesh);
 }
 groups.forEach((g,i)=>{draw(g.walls,wallMaterials[i]);draw(g.roofs,roofMaterials[i]);});
 if(trees.length){
  const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2,0),detailsMat,trees.length);
  trees.forEach((p,i)=>{dummy.position.set(p.x,terrainHeight(p.x,p.z)+4,p.z);dummy.scale.set(1,1,1);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});
  leaves.instanceMatrix.needsUpdate=true;leaves.frustumCulled=false;scene.add(leaves);meshes.push(leaves);
 }
 const counts=Object.fromEntries(SETTLEMENT_ZONES.map(z=>[z.id,plots.filter(p=>p.zone===z.id).length]));
 return {meshes,plots:plots.length,colliderCount:physics?plots.length:0,counts};
}
