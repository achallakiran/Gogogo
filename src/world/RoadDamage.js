// One fixed, carefully authored road-quality test section. The same triangles
// are rendered and used as a static Rapier collider; no painted fake holes.
import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from './SurfaceSystem.js';

export const DAMAGE_SECTION=Object.freeze({x:60,z:90,width:12.3,length:38});
export const POTHOLES=Object.freeze([
  {x:58.4,z:82.6,rx:1.55,rz:2.25,depth:.235,seed:.45},
  {x:62.0,z:92.5,rx:1.75,rz:2.45,depth:.255,seed:1.4},
  {x:59.2,z:101.3,rx:1.35,rz:1.85,depth:.220,seed:2.3}
].map(x=>Object.freeze(x)));
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export function craterAt(x,z){
 let depth=0,rim=0;
 for(const p of POTHOLES){
  const a=Math.atan2((z-p.z)/p.rz,(x-p.x)/p.rx);
  const irregularity=1+.15*Math.sin(3*a+p.seed)+.085*Math.sin(7*a-p.seed*2)+.065*Math.cos(11*a+p.seed);
  const d=Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)/irregularity;
  if(d<1){depth+=p.depth*(1-smooth(d));rim=Math.max(rim,smooth((1-d)/.28));}
  else if(d<1.35)rim=Math.max(rim,.6*(1-smooth((d-1)/.35)));
 }
 return {depth,rim};
}
export function roadDamageHeight(x,z){
 const s=DAMAGE_SECTION;
 const dx=s.width/2-Math.abs(x-s.x),dz=s.length/2-Math.abs(z-s.z);
 const fade=smooth(dx/1.9)*smooth(dz/6.4);
 const {depth}=craterAt(x,z);
 // The pre-existing lower terrain serves as a safety net. At the pothole
 // bottom, the mesh remains above it; edges meet the old road at +0.045.
 return terrainHeight(x,z)+.045+fade*(.285-depth);
}
export function roadDamageGeometry(cols=36,rows=116){
 const s=DAMAGE_SECTION;
 const pos=[],indices=[],col=[],uv=[],rand=()=>0;
 const asphalt=new THREE.Color('#434b52'),old=new THREE.Color('#756d60'),soil=new THREE.Color('#796047'),patch=new THREE.Color('#606a71');
 const c=new THREE.Color();
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const x=s.x-s.width/2+s.width*i/cols,z=s.z-s.length/2+s.length*j/rows;
   pos.push(x,roadDamageHeight(x,z),z);uv.push(x*.11,z*.11);
   const v=craterAt(x,z);c.copy(asphalt);
   if(z>96&&x<60)c.lerp(patch,.25);
   c.lerp(old,clamp(v.rim*.55+.035*Math.sin(i*11+j*23)));
   c.lerp(soil,clamp(v.depth/.25*.8));
   col.push(c.r,c.g,c.b);
   if(i<cols&&j<rows){
     const a=j*(cols+1)+i,b=a+1,d=a+cols+1,e=d+1;
     indices.push(a,d,b,b,d,e);
   }
 }
 return {positions:new Float32Array(pos),indices:new Uint32Array(indices),
  colors:new Float32Array(col),uv:new Float32Array(uv),cols,rows};
}
function decorations(scene){
 let seed=41799;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const stones=[];
 for(let i=0;i<450;i++){
  const x=48+rand()*24,z=67+rand()*46;
  const rim=craterAt(x,z).rim,edge=Math.abs(x-60);
  if(edge<5.7&&rim<.15)continue;
  const y=edge<=6.15?roadDamageHeight(x,z):terrainHeight(x,z);
  stones.push({x,z,y,angle:rand()*Math.PI*2,r:.045+rand()*.105,color:rand()});
 }
 const rock=new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(1,0),
  new THREE.MeshLambertMaterial({color:'#baab8d',vertexColors:false}),
  stones.length
 );
 rock.frustumCulled=false;
 const d=new THREE.Object3D(),c=new THREE.Color();
 stones.forEach((s,i)=>{
  d.position.set(s.x,s.y+.025,s.z);
  d.rotation.set(.12,s.angle,.37);d.scale.set(s.r*1.6,s.r*.65,s.r);d.updateMatrix();
  rock.setMatrixAt(i,d.matrix);
  rock.setColorAt(i,c.set(s.color>.5?'#b6a895':'#8f8170'));
 });
 rock.instanceMatrix.needsUpdate=true;scene.add(rock);
 const cracks=[];
 for(const p of POTHOLES)for(let k=0;k<8;k++){
   const a=k*Math.PI/4+p.seed;
   let prev=null;
   for(let n=0;n<7;n++){
     const t=1.12+n*.13,theta=a+.026*Math.sin(n*4+k);
     const x=p.x+Math.cos(theta)*p.rx*t,z=p.z+Math.sin(theta)*p.rz*t;
     if(Math.abs(x-60)>5.85||z<72||z>108)break;
     const now=[x,roadDamageHeight(x,z)+.013,z];
     if(prev)cracks.push(...prev,...now);
     prev=now;
   }
 }
 const lines=new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(cracks,3)),
  new THREE.LineBasicMaterial({color:'#293139',opacity:.83,transparent:true})
 );
 scene.add(lines);
 return {stones:stones.length,rock,lines};
}
export function populateRoadDamage(scene,world){
 const data=roadDamageGeometry();
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
 g.setAttribute('color',new THREE.BufferAttribute(data.colors,3));
 g.setAttribute('uv',new THREE.BufferAttribute(data.uv,2));
 g.setIndex(new THREE.BufferAttribute(data.indices,1));
 g.computeVertexNormals();
 const surface=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 surface.receiveShadow=true;scene.add(surface);
 let rigidBody=null,collider=null;
 if(world){
   rigidBody=world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
   collider=world.createCollider(RAPIER.ColliderDesc.trimesh(data.positions,data.indices)
     .setFriction(1.35).setRestitution(0),rigidBody);
 }
 const deco=decorations(scene);
 return {surface,rigidBody,collider,potholes:POTHOLES,potholeCount:POTHOLES.length,
  stoneCount:deco.stones,section:DAMAGE_SECTION};
}
