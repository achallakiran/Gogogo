// Authored collision-backed roadside boundaries. Segment gaps preserve junctions,
// mission access and off-road exploration while preventing trivial cross-country cuts.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {COAST_SAMPLES} from './CoastalRoad.js';
import {COUNTRY_SAMPLES} from './RegionalRoads.js';
import {overlapsProtectedFootprint} from './WorldManifest.js';

export const ROAD_EDGE_PROFILES=Object.freeze({
 coast:Object.freeze({offset:9.8,spacing:12,barrierLength:6.5,kind:'guardrail'}),
 country:Object.freeze({offset:8.5,spacing:13,barrierLength:7,kind:'fence'}),
 city:Object.freeze({offset:10.7,spacing:20,barrierLength:9,kind:'wall'})
});
const GRID=[-240,-180,-120,-60,0,60,120,180,240];
const lerp=(a,b,t)=>a+(b-a)*t;
function nearJunction(x,z){return GRID.some(a=>Math.abs(x-a)<17)&&GRID.some(a=>Math.abs(z-a)<17);}
function safe(x,z,kind){
 if(overlapsProtectedFootprint(x,z,kind==='city'?14:7,kind==='city'?5:4,5))return false;
 if(kind==='city'&&nearJunction(x,z))return false;
 // Airport approach, city boundary connectors, and the country/coast joins stay clear.
 if(kind==='city'&&x>250&&z>-160&&z<-80)return false;
 if(kind==='country'&&Math.hypot(x+240,z-240)<28)return false;
 if(kind==='coast'&&Math.hypot(x+240,z+240)<28)return false;
 return true;
}
export function roadsideSegments(){
 const segments=[];
 function add(x,z,angle,length,height,kind){
  if(!safe(x,z,kind))return;
  segments.push({x,z,y:terrainHeight(x,z),angle,length,height,kind});
 }
 function follow(points,kind){
  const profile=ROAD_EDGE_PROFILES[kind];
  let carried=0;
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);
   if(dist<.0001)continue;
   const tx=dx/dist,tz=dz/dist,nx=-tz,nz=tx;
   let next=profile.spacing-carried;
   while(next<=dist){
    const t=next/dist,cx=lerp(a.x,b.x,t),cz=lerp(a.z,b.z,t);
    // Alternating gaps make barriers readable and allow safe pull-offs.
    for(const side of [-1,1]){
     const x=cx+nx*profile.offset*side,z=cz+nz*profile.offset*side;
     const slot=Math.round((cx*3+cz*5+side*17)/profile.spacing);
     if(Math.abs(slot)%5===0)continue;
     add(x,z,Math.atan2(-tz,tx),profile.barrierLength,kind==='coast'?1.1:1.65,kind);
    }
    next+=profile.spacing;
   }
   carried=(carried+dist)%profile.spacing;
  }
 }
 follow(COAST_SAMPLES,'coast');
 follow(COUNTRY_SAMPLES,'country');
 // Sparse perimeter walls on city avenues, avoiding intersections and
 // established building parcels; not a continuous enclosure.
 for(const z of [-240,-120,0,120,240]){
  for(let x=-210;x<=210;x+=30){
   if(Math.abs(x)<28||Math.abs(x-120)<28||Math.abs(x+120)<28)continue;
   for(const side of [-1,1])add(x,z+side*ROAD_EDGE_PROFILES.city.offset,0,ROAD_EDGE_PROFILES.city.barrierLength,1.55,'city');
  }
 }
 return segments;
}
export function populateRoadsideBoundaries(scene,physics,RAPIER){
 const segments=roadsideSegments(),materials={
  guardrail:new THREE.MeshLambertMaterial({color:'#d9d9cf'}),
  fence:new THREE.MeshLambertMaterial({color:'#9c8261'}),
  wall:new THREE.MeshLambertMaterial({color:'#b7a28e'})
 };
 const meshes={},counts={},obj=new THREE.Object3D();
 for(const kind of ['guardrail','fence','wall']){
  const entries=segments.filter(s=>({guardrail:'coast',fence:'country',wall:'city'})[kind]===s.kind);
  counts[kind]=entries.length;
  if(!entries.length)continue;
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),materials[kind],entries.length);
  entries.forEach((p,i)=>{
   const h=p.height,thickness=kind==='guardrail'?.23:kind==='fence'?.18:.42;
   obj.position.set(p.x,p.y+h/2+.15,p.z);
   obj.rotation.set(0,p.angle,0);
   obj.scale.set(p.length,h,thickness);
   obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);
   if(physics){
    const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,p.y+h/2+.15,p.z).setRotation({x:0,y:Math.sin(p.angle/2),z:0,w:Math.cos(p.angle/2)}));
    physics.createCollider(RAPIER.ColliderDesc.cuboid(p.length/2,h/2,thickness/2).setFriction(.85).setRestitution(.04),body);
   }
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);meshes[kind]=mesh;
 }
 return {meshes,counts,colliderCount:physics?segments.length:0};
}
