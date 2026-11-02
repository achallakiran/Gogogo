// Five authored, collision-backed rough-terrain areas outside city streets.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {sceneryPlacementAllowed} from './WorldDensity.js';
const ZONES=Object.freeze([
  {x:-311,z:74,kind:'boulder field'},{x:-310,z:-161,kind:'rocky ravine'},
  {x:300,z:174,kind:'stony ascent'},{x:127,z:-314,kind:'southern scrub'},
  {x:-91,z:312,kind:'woodland trail'}
]);
const rand=(()=>{let seed=921574;return()=>{
 seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};})();
export function populateTrailPlaygrounds(scene,world,RAPIER){
 const stones=[],scrub=[],stumps=[],logs=[];
 for(const zone of ZONES){
   for(let i=0;i<56;i++){
     const angle=rand()*Math.PI*2,r=9+Math.sqrt(rand())*42;
     const x=zone.x+Math.cos(angle)*r,z=zone.z+Math.sin(angle)*r;
     if(!sceneryPlacementAllowed(x,z,'large'))continue;
     const y=terrainHeight(x,z),size=.65+rand()*1.9,rotation=rand()*Math.PI*2;
     if(i%4===0)stones.push({x,y:y+size*.48,z,size,rotation});
     else if(i%3===0)stumps.push({x,y:y+.75,z,size:.6+rand()*.65,rotation});
     else scrub.push({x,y:y+.5,z,size:.55+rand()*1.2,rotation});
   }
   for(let j=0;j<4;j++){
     const angle=(j+.35)*Math.PI*.5,x=zone.x+Math.sin(angle)*25,z=zone.z+Math.cos(angle)*25;
     if(sceneryPlacementAllowed(x,z,'large'))logs.push({x,y:terrainHeight(x,z)+.5,z,size:1,rotation:angle});
   }
 }
 const entries=[
  ['stones',stones,new THREE.DodecahedronGeometry(1,1),'#938f83'],
  ['scrub',scrub,new THREE.IcosahedronGeometry(1,0),'#64835b'],
  ['stumps',stumps,new THREE.CylinderGeometry(.65,.84,1.5,6),'#775847'],
  ['logs',logs,new THREE.CylinderGeometry(.44,.58,5.6,7),'#80624a']];
 const meshes={},o=new THREE.Object3D();
 for(const [kind,items,geometry,color] of entries){
   if(!items.length)continue;
   const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({color}),items.length);
   for(const [i,p] of items.entries()){
     o.position.set(p.x,p.y,p.z);
     o.rotation.set(kind==='logs'?Math.PI/2:0,p.rotation,0);
     o.scale.setScalar(p.size);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
     if(world&&(kind==='stones'||kind==='logs')){
       const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,p.y,p.z));
       const radius=kind==='logs'?2.6:p.size*.86,halfHeight=kind==='logs'?.56:p.size*.65;
       world.createCollider(RAPIER.ColliderDesc.cuboid(radius,halfHeight,radius).setFriction(1.1),body);
     }
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
   mesh.receiveShadow=true;scene.add(mesh);meshes[kind]=mesh;
 }
 return {zones:ZONES,meshes,colliderCount:stones.length+logs.length,
   counts:{stones:stones.length,scrub:scrub.length,stumps:stumps.length,logs:logs.length}};
}
