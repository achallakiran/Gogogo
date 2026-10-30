// Deterministic, instanced scenery for previously empty outskirts and Coral Bay.
// Solid roadside objects have matching Rapier collision; grass is cosmetic.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {COAST_SAMPLES} from './CoastalRoad.js';
import {COAST_PARCELS} from './CoastLayout.js';
import {COUNTRY_SAMPLES} from './RegionalRoads.js';
import {FIXED_LANDMARKS} from './WorldManifest.js';
const rng=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const rand=rng(731908);
function distanceTo(points,x,z){let d=Infinity;for(const p of points){const dx=p.x-x,dz=p.z-z;d=Math.min(d,dx*dx+dz*dz);}return Math.sqrt(d);}
function clearParcel(x,z,padding=0){return COAST_PARCELS.every(p=>Math.abs(x-p.position[0])>p.footprint[0]/2+padding||Math.abs(z-p.position[1])>p.footprint[1]/2+padding);}
function clearLandmarks(x,z,padding=0){return FIXED_LANDMARKS.every(p=>Math.abs(x-p.position[0])>p.footprint[0]/2+padding||Math.abs(z-p.position[1])>p.footprint[1]/2+padding);}
export function sceneryPlacementAllowed(x,z,kind='large'){
 if(!clearParcel(x,z,kind==='large'?8:2)||!clearLandmarks(x,z,kind==='large'?10:3))return false;
 if(distanceTo(COAST_SAMPLES,x,z)<(kind==='large'?9:7))return false;
 if(distanceTo(COUNTRY_SAMPLES,x,z)<(kind==='large'?9:7))return false;
 // Preserve the existing city grid and airport roads.
 if(Math.abs(x)<277&&Math.abs(z)<277){
  if([-240,-180,-120,-60,0,60,120,180,240].some(v=>Math.abs(x-v)<10||Math.abs(z-v)<10))return false;
 }
 return true;
}
function instances(scene,geometry,color,items){
 if(!items.length)return null;
 const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({color}),items.length);
 const obj=new THREE.Object3D();
 items.forEach((p,i)=>{obj.position.set(p.x,p.y,p.z);obj.rotation.set(0,p.rot||0,0);obj.scale.setScalar(p.scale||1);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);});
 mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function collider(physics,RAPIER,p,radius,height){
 if(!physics)return;
 const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,p.y+height/2,p.z));
 physics.createCollider(RAPIER.ColliderDesc.cuboid(radius,height/2,radius).setFriction(1),body);
}
export function populateWorldDensity(scene,physics,RAPIER){
 const palms=[],trunks=[],crowns=[],rocks=[],bushes=[],grass=[],huts=[],roofs=[],posts=[];
 let obstacleCount=0;
 // Populate the road approach and seaside district, not just a distant decorative strip.
 for(let i=0;i<470;i++){
  const x=-610+rand()*385,z=-457+rand()*225;
  const large=sceneryPlacementAllowed(x,z,'large');
  if(!sceneryPlacementAllowed(x,z,'small'))continue;
  const y=terrainHeight(x,z),scale=.65+rand()*1.1;
  const choice=rand();
  if(choice<.22&&large){
   const p={x,y,z,scale,rot:rand()*6.28};palms.push(p);
   trunks.push({...p,y:y+2.4*scale});crowns.push({...p,y:y+5.5*scale});
   if(distanceTo(COAST_SAMPLES,x,z)<23){collider(physics,RAPIER,p,.45*scale,4.8*scale);obstacleCount++;}
  }else if(choice<.40&&large){
   const p={x,y:y+.65*scale,z,scale,rot:rand()*6.28};rocks.push(p);
   if(distanceTo(COAST_SAMPLES,x,z)<22){collider(physics,RAPIER,{x,y,z},.85*scale,1.3*scale);obstacleCount++;}
  }else if(choice<.74){bushes.push({x,y:y+.6*scale,z,scale,rot:rand()*6.28});}
  else grass.push({x,y:y+.35*scale,z,scale,rot:rand()*6.28});
 }
 // Roads through the outskirts need a visible lived-in edge.
 for(let i=0;i<650;i++){
  const x=-530+rand()*1100,z=-475+rand()*935;
  if(Math.abs(x)<275&&Math.abs(z)<275)continue;
  if(x>340&&z>-290&&z<70)continue;
  if(!sceneryPlacementAllowed(x,z,'small'))continue;
  const y=terrainHeight(x,z),scale=.55+rand()*1.25;
  if(rand()<.30)rocks.push({x,y:y+.65*scale,z,scale,rot:rand()*6.28});
  else if(rand()<.65)bushes.push({x,y:y+.6*scale,z,scale,rot:rand()*6.28});
  else grass.push({x,y:y+.35*scale,z,scale,rot:rand()*6.28});
 }
 // A small authored seaside market cluster; keep the reserved pier and lighthouse open.
 for(let i=0;i<10;i++){
  const x=-475+(i%5)*10,z=-392+Math.floor(i/5)*12;
  if(!clearParcel(x,z,1)||!sceneryPlacementAllowed(x,z,'large'))continue;
  const y=terrainHeight(x,z);
  huts.push({x,y:y+2.3,z,scale:1,rot:0});
  roofs.push({x,y:y+4.9,z,scale:1,rot:0});
  collider(physics,RAPIER,{x,y,z},3.4,4.6);obstacleCount++;
 }
 // Lamps guide the curved coastal road at night and communicate its silhouette.
 for(let i=10;i<COAST_SAMPLES.length-10;i+=10){
  const p=COAST_SAMPLES[i],a=COAST_SAMPLES[i-1],b=COAST_SAMPLES[i+1];
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  const side=i%20===0?1:-1,x=p.x-side*dz/l*8,z=p.z+side*dx/l*8;
  if(!clearParcel(x,z,3))continue;
  posts.push({x,y:terrainHeight(x,z)+2.9,z,scale:1});
 }
 const meshes={
  palmTrunks:instances(scene,new THREE.CylinderGeometry(.26,.42,4.8,5),'#84694c',trunks),
  palmCrowns:instances(scene,new THREE.IcosahedronGeometry(2.7,0),'#5a9c72',crowns),
  rocks:instances(scene,new THREE.DodecahedronGeometry(1.15,0),'#a49b86',rocks),
  bushes:instances(scene,new THREE.IcosahedronGeometry(1.15,0),'#7aa66c',bushes),
  grass:instances(scene,new THREE.ConeGeometry(.65,.8,4),'#b5b67c',grass),
  huts:instances(scene,new THREE.BoxGeometry(7,4.6,7),'#e1b58a',huts),
  roofs:instances(scene,new THREE.ConeGeometry(5.4,2,4),'#ad715d',roofs),
  lamps:instances(scene,new THREE.CylinderGeometry(.12,.18,5.8,5),'#4d6268',posts)
 };
 return {meshes,obstacleCount,counts:{palms:palms.length,rocks:rocks.length,bushes:bushes.length,grass:grass.length,huts:huts.length,lamps:posts.length}};
}
