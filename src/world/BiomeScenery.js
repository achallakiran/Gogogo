// Authored biome dressing: one stable seed, several reusable instanced assets,
// and distant mountain layers. All large obstacles near roads own real colliders.
// The permanent city, airport and lodge are left exactly where they are.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {closestMountainPoint} from './MountainData.js';
import {COUNTRY_SAMPLES} from './RegionalRoads.js';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(x)=>{x=clamp(x);return x*x*(3-2*x);};
const hash=(x,z)=>{let h=Math.imul(Math.floor(x*17+10000),374761393)^Math.imul(Math.floor(z*13+10000),668265263);
 h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function countryDistance(x,z){
 let best=Infinity;
 for(const p of COUNTRY_SAMPLES){const d=(x-p.x)**2+(z-p.z)**2;if(d<best)best=d;}
 return Math.sqrt(best);
}
const turfCity=new THREE.Color('#83bd8d'),
 turfForest=new THREE.Color('#548b70'),
 turfMeadow=new THREE.Color('#9fae70'),
 turfRock=new THREE.Color('#a49b85'),
 turfPine=new THREE.Color('#427460');
export function biomeTypeAt(x,z){
 if(z>270&&z<495&&x>45&&x<295)return 'alpine';
 if(x< -254&&x> -480&&z>272&&z<485)return 'valley';
 return 'city';
}
export function terrainTintAt(x,z,height=terrainHeight(x,z)){
 const type=biomeTypeAt(x,z),c=turfCity.clone();
 const n=.5+.5*Math.sin(x*.038+1.4)*Math.cos(z*.046-1.0);
 const grain=hash(Math.round(x/15),Math.round(z/15));
 if(type==='alpine'){
  const slope=Math.min(1,Math.max(0,(height-11)/28));
  c.lerp(turfForest,.55+.30*n).lerp(turfRock,smooth((slope-.32)*1.45)*.68);
  if(n>.73&&height<18)c.lerp(turfPine,.3);
 }else if(type==='valley'){
  c.lerp(turfMeadow,.48+.26*n);
  if(n<.32)c.lerp(turfRock,.21);
 }
 c.multiplyScalar(.92+grain*.14);
 return c;
}
export function colorizeTerrain(geometry){
 const pos=geometry.getAttribute('position'),colors=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){
  const c=terrainTintAt(pos.getX(i),pos.getZ(i),pos.getY(i));
  colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
 }
 geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
 return geometry;
}
function ridge(scene,zBase,heightBase,seed,color){
 const rand=seeded(seed),pts=[],colors=[],indices=[],count=62;
 const rockBase=new THREE.Color(color),c=new THREE.Color();
 for(let i=0;i<=count;i++){
  const x=-550+i*1100/count;
  const peaks=(Math.sin(i*.54+seed)*.24+Math.cos(i*.26+seed*1.6)*.23+
    rand()*.29+.4)*heightBase;
  const high=heightBase+peaks,near=zBase+Math.sin(i*.3+seed)*12;
  for(const level of [0,1]){
   pts.push(x,level?high:-7,near+(level?-8:10));
   c.copy(rockBase).multiplyScalar(level?.73+rand()*.19:.87);
   colors.push(c.r,c.g,c.b);
  }
  if(i<count){
   const a=i*2,b=a+2;
   indices.push(a,a+1,b,b,a+1,b+1);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
 g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:true}));
 scene.add(m);return m;
}
function batch(scene,geometry,color,items,opts={}){
 if(!items.length)return null;
 const mat=new THREE.MeshLambertMaterial({color,vertexColors:false,side:opts.side||THREE.FrontSide});
 const mesh=new THREE.InstancedMesh(geometry,mat,items.length);
 mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=Boolean(opts.ground);
 const o=new THREE.Object3D(),tint=new THREE.Color();
 items.forEach((p,i)=>{
  o.position.set(p.x,p.y+(opts.offset||0)*p.s,p.z);
  o.rotation.set(0,p.a||0,0);
  o.scale.set((p.wx||1)*p.s,(p.hy||1)*p.s,(p.wz||1)*p.s);
  o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
  if(p.tint){tint.set(p.tint);mesh.setColorAt(i,tint);}
 });
 mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);return mesh;
}
export function populateBiomeScenery(scene,physics,RAPIER){
 const rand=seeded(324985);
 const firs=[],broadleaf=[],shrubs=[],meadow=[],boulders=[],rockProps=[],mushrooms=[];
 function addPlants(type,minX,maxX,minZ,maxZ,tries){
  for(let i=0;i<tries;i++){
   const x=minX+(maxX-minX)*rand(),z=minZ+(maxZ-minZ)*rand();
   const isMountain=type==='alpine';
   const roadDist=isMountain?closestMountainPoint(x,z).distance:countryDistance(x,z);
   if(roadDist<9.6)continue;
   if(isMountain&&Math.hypot(x-206,z-470)<29)continue;
   if(!isMountain&&((x+325)/102)**2+((z-335)/51)**2<1.16)continue;
   const y=terrainHeight(x,z),s=.65+rand()*1.55,a=rand()*6.283;
   const r=rand();
   if(r<.35){
    const target=isMountain?firs:broadleaf;
    target.push({x,z,y,s,a,tint:isMountain?(rand()>.5?'#74a88c':'#548f75'):(rand()>.4?'#89ae69':'#cfad63')});
   }else if(r<.67){
    shrubs.push({x,z,y,s:.6*s,a,tint:isMountain?'#588d62':'#9cb475'});
   }else if(r<.85){
    meadow.push({x,z,y,s:.28+.35*rand(),a,tint:rand()>.35?'#dfbb68':'#e9d7ad'});
   }else{
    boulders.push({x,z,y,s:.48+.7*rand(),a,tint:rand()>.5?'#948e82':'#ae9a81'});
   }
   if(rand()<.06)mushrooms.push({x,z,y,s:.34,a,tint:'#fff4dd'});
  }
 }
 addPlants('alpine',50,291,276,498,630);
 addPlants('valley',-477,-255,278,478,520);
 // Large faceted outcrops and erosion ledges are off the road but close enough
 // to give slopes readable depth and shape from a car's chase camera.
 for(let i=0;i<85;i++){
  const x=54+rand()*232,z=300+rand()*196;
  if(closestMountainPoint(x,z).distance<13||Math.hypot(x-206,z-470)<29)continue;
  rockProps.push({x,z,y:terrainHeight(x,z),s:1.65+rand()*3.0,
    wx:1.2+rand()*1.3,hy:.5+rand()*.48,wz:.75+rand()*.6,
    a:rand()*6.283,tint:rand()>.46?'#a49b8e':'#7d8c83'});
 }
 const groundCones=new THREE.ConeGeometry(1.1,3.7,6).translate(0,2,0);
 const groundTrunk=new THREE.CylinderGeometry(.22,.31,2.9,6).translate(0,1.6,0);
 const crown=new THREE.IcosahedronGeometry(2.0,0).translate(0,3.7,0);
 const crownHigh=new THREE.IcosahedronGeometry(1.3,0).translate(.65,5.2,0);
 const bush=new THREE.IcosahedronGeometry(.9,0).translate(0,.7,0);
 const grass=new THREE.ConeGeometry(.50,1.2,3).translate(0,.5,0);
 const rockG=new THREE.DodecahedronGeometry(1,0).translate(0,.46,0);
 const stem=new THREE.CylinderGeometry(.18,.22,.8,5).translate(0,.4,0);
 const meshes={
  firs:batch(scene,groundCones,'#477962',firs),
  trunks:batch(scene,groundTrunk,'#755b45',[...firs,...broadleaf]),
  broadleaf:batch(scene,crown,'#e6e9d5',broadleaf),
  crownHigh:batch(scene,crownHigh,'#e6e9d5',broadleaf),
  shrubs:batch(scene,bush,'#e1e9c2',shrubs),
  meadow:batch(scene,grass,'#ffffff',meadow),
  boulders:batch(scene,rockG,'#ded3bf',boulders),
  cliffs:batch(scene,rockG,'#e0d8c8',rockProps),
  mushrooms:batch(scene,stem,'#f3e3c4',mushrooms)
 };
 const background=[
  ridge(scene,540,27,17,'#7b9b8f'),
  ridge(scene,625,43,31,'#78959c'),
  ridge(scene,720,54,49,'#7890a7')
 ];
 let obstacleCount=0;
 // Do not pretend that large props are traversable. Give nearby trunks and
 // boulders fixed compound physics shapes while keeping tiny grass cosmetic.
 if(physics){
  for(const p of [...firs,...broadleaf]){
   const dist=p.x>0?closestMountainPoint(p.x,p.z).distance:countryDistance(p.x,p.z);
   if(dist>18)continue;
   const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,p.y+1.6*p.s,p.z));
   physics.createCollider(RAPIER.ColliderDesc.cylinder(1.4*p.s,.30*p.s).setFriction(.8),body);
   obstacleCount++;
  }
  for(const p of rockProps){
   const dist=closestMountainPoint(p.x,p.z).distance;
   if(dist>21)continue;
   const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(
    p.x,p.y+.46*p.s*p.hy,p.z));
   physics.createCollider(RAPIER.ColliderDesc.cuboid(
    p.s*p.wx*.8,p.s*p.hy*.43,p.s*p.wz*.72).setFriction(1.1),body);
   obstacleCount++;
  }
 }
 return {meshes,background,obstacleCount,counts:{
  conifers:firs.length,broadleaf:broadleaf.length,shrubs:shrubs.length,
  flowers:meadow.length,boulders:boulders.length,outcrops:rockProps.length}};
}
