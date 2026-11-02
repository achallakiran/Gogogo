// Authored irregular asphalt plates with REAL mesh colliders, not merely decals.
// The original base road remains underneath as a safety net; craters are deep
// relative to the raised plate, but never tunnel through the foundation.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
export const ROAD_WEAR_SITES=Object.freeze([
 {x:0,z:-27,seed:.4},{x:0,z:-87,seed:1.9},{x:0,z:-148,seed:3.7},
 {x:60,z:-30,seed:.8},{x:-60,z:-91,seed:2.4},{x:120,z:51,seed:4.8},
 {x:-120,z:113,seed:5.2}
].map(Object.freeze));
export const WIDTH=10.9,LENGTH=14.6;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export function roadWearProfile(site,x,z){
 const dx=(x-site.x)/(WIDTH*.5),dz=(z-site.z)/(LENGTH*.5);
 const fade=smooth((1-Math.abs(dx))*3)*smooth((1-Math.abs(dz))*3);
 const angle=Math.atan2(z-site.z,x-site.x);
 const irregular=1+.16*Math.sin(angle*5+site.seed)+.09*Math.cos(angle*9-site.seed);
 const crater=Math.hypot((x-site.x-.70)/1.58,(z-site.z+.45)/2.05)/irregular;
 const pit=1-smooth(crater);
 const ripples=.075*(.5+.5*Math.sin(x*1.55+z*.83+site.seed));
 const plateau=fade*(.235+.08*Math.cos(z*.42+site.seed)+ripples);
 return {rise:Math.max(0,plateau*(1-.88*pit)),pit,fade};
}
export function roadWearHeight(site,x,z){
 return terrainHeight(x,z)+.115+roadWearProfile(site,x,z).rise;
}
function oneSite(site,scene,world,RAPIER){
 const n=27,m=40,positions=[],colors=[],indices=[];
 const asphalt=new THREE.Color('#4f555a'),fresh=new THREE.Color('#73726d'),
   loose=new THREE.Color('#86735e'),dark=new THREE.Color('#3b3937');
 const c=new THREE.Color();
 for(let j=0;j<=m;j++)for(let i=0;i<=n;i++){
  const x=site.x-WIDTH/2+WIDTH*i/n,z=site.z-LENGTH/2+LENGTH*j/m;
  const profile=roadWearProfile(site,x,z);
  positions.push(x,roadWearHeight(site,x,z),z);
  c.copy(asphalt);
  c.lerp(fresh,profile.fade*.40);
  c.lerp(loose,profile.fade*profile.pit*.73);
  const grain=.5+.5*Math.sin(i*19.8+j*31.2+site.seed*7);
  c.lerp(dark,profile.fade*grain*.19);
  colors.push(c.r,c.g,c.b);
  if(i<n&&j<m){
   const a=j*(n+1)+i,b=a+1,d=a+n+1,e=d+1;
   indices.push(a,d,b,b,d,e);
  }
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({
  vertexColors:true,side:THREE.DoubleSide
 }));
 mesh.name='physical-urban-asphalt-wear';mesh.receiveShadow=true;scene.add(mesh);
 if(world){
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const collider=RAPIER.ColliderDesc.trimesh(
    new Float32Array(positions),new Uint32Array(indices)
  ).setFriction(1.4).setRestitution(0);
  world.createCollider(collider,body);
 }
 return mesh;
}
export function populateUrbanRoadWear(scene,world,RAPIER){
 const patches=ROAD_WEAR_SITES.map(site=>oneSite(site,scene,world,RAPIER));
 // The narrow dirt/gravel road shoulder gets scattered small real 3D stones.
 const count=440,obj=new THREE.Object3D(),rand=(()=>{let s=58123;return ()=>{
  s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};})();
 const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.18,0),
  new THREE.MeshLambertMaterial({color:'#a8a095'}),count);
 for(let i=0;i<count;i++){
  const z=-251+rand()*246,x=(rand()>.5?1:-1)*(6.6+rand()*2.5);
  obj.position.set(x,terrainHeight(x,z)+.13,z);
  obj.rotation.set(rand(),rand()*6.28,rand());
  const scale=.4+rand()*1.5;obj.scale.set(scale,.45*scale,scale);obj.updateMatrix();
  stones.setMatrixAt(i,obj.matrix);
 }
 stones.instanceMatrix.needsUpdate=true;stones.frustumCulled=false;
 stones.name='city-gravel-shoulders';scene.add(stones);
 return {patches,patchCount:patches.length,stoneCount:count};
}
