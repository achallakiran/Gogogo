// Deterministic authored regional road surfaces. Every raised, cracked,
// irregularly depressed section uses IDENTICAL Three.js and Rapier triangles.
// World terrain always provides a safety floor, not a replacement visual road.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {MOUNTAIN_SAMPLES} from './MountainData.js';

export const COUNTRY_ROUTE_POINTS=Object.freeze([
 [-240,240],[-256,264],[-287,286],[-326,301],[-356,330],[-387,368]
].map(p=>Object.freeze(p)));
const curve=new THREE.CatmullRomCurve3(
 COUNTRY_ROUTE_POINTS.map(p=>new THREE.Vector3(p[0],0,p[1])),false,'centripetal');
export const COUNTRY_SAMPLES=Object.freeze(curve.getPoints(96).map(p=>
 Object.freeze({x:p.x,z:p.z})));
const regions=[
 {id:'alpine-worn',type:'mountain',points:MOUNTAIN_SAMPLES.slice(40,67),halfWidth:4.85,
  potholes:[{t:.37,lateral:-.95,rx:1.45,rz:1.95,depth:.19,seed:.6},{t:.75,lateral:1.3,rx:1.2,rz:1.45,depth:.13,seed:2.4}]},
 {id:'alpine-eroded',type:'mountain',points:MOUNTAIN_SAMPLES.slice(100,125),halfWidth:4.85,
  potholes:[{t:.38,lateral:1.05,rx:1.6,rz:1.8,depth:.20,seed:1.8},{t:.72,lateral:-1.0,rx:1.3,rz:1.5,depth:.14,seed:3.2}]},
 {id:'valley-track',type:'country',points:COUNTRY_SAMPLES,halfWidth:4.2,
  potholes:[{t:.27,lateral:-.7,rx:1.25,rz:2.25,depth:.19,seed:1.3},{t:.54,lateral:1.0,rx:1.7,rz:2.0,depth:.22,seed:4.8},{t:.79,lateral:-.9,rx:1.4,rz:1.75,depth:.20,seed:2.9}]}
];
export const REGIONAL_ROADS=Object.freeze(regions.map(r=>Object.freeze({
 ...r,points:Object.freeze(r.points),potholes:Object.freeze(r.potholes.map(p=>Object.freeze(p)))
})));
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function pointAt(region,t){
 const p=region.points,k=clamp(t,0,.999999)*(p.length-1),j=Math.floor(k),a=p[j],b=p[j+1],f=k-j;
 const x=a.x+(b.x-a.x)*f,z=a.z+(b.z-a.z)*f;
 const before=p[Math.max(0,j-1)],after=p[Math.min(p.length-1,j+2)];
 let dx=after.x-before.x,dz=after.z-before.z;
 const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;
 return {x,z,nx:-dz,nz:dx};
}
function irregularDepth(region,t,lateral){
 let dip=0,rim=0;
 for(const h of region.potholes){
  const u=(lateral-h.lateral)/h.rx,v=((t-h.t)*region.length)/h.rz;
  const angle=Math.atan2(v,u);
  const shape=1+.15*Math.sin(3*angle+h.seed)+.09*Math.sin(7*angle-h.seed);
  const r=Math.hypot(u,v)/shape;
  if(r<1){dip+=h.depth*(1-smooth(r));rim=Math.max(rim,1-smooth(r));}
  else if(r<1.35)rim=Math.max(rim,(1-smooth((r-1)/.35))*.5);
 }
 return {dip,rim};
}
export function regionalRoadGeometry(region,columns=22){
 const points=region.points,rows=points.length-1;
 const distance=[0];
 for(let i=1;i<points.length;i++)
  distance.push(distance.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 region={...region,length:distance.at(-1)};
 const positions=[],colors=[],indices=[];
 const asphalt=new THREE.Color(region.type==='country'?'#74634e':'#495157');
 const old=new THREE.Color(region.type==='country'?'#a68b67':'#857565');
 const soil=new THREE.Color('#6e5e4f');
 const current=new THREE.Color();
 const holes=[];
 for(const h of region.potholes){
  const p=pointAt(region,h.t);
  holes.push({id:region.id,x:p.x+p.nx*h.lateral,z:p.z+p.nz*h.lateral,depth:h.depth,t:h.t});
 }
 for(let i=0;i<=rows;i++){
  const pt=points[i],prev=points[Math.max(i-1,0)],next=points[Math.min(i+1,rows)];
  const dX=next.x-prev.x,dZ=next.z-prev.z,length=Math.hypot(dX,dZ)||1;
  const nx=-dZ/length,nz=dX/length,t=i/rows;
  for(let j=0;j<=columns;j++){
   const lateral=(j/columns*2-1)*region.halfWidth;
   const x=pt.x+nx*lateral,z=pt.z+nz*lateral;
   // Slope-safe transition with gradual elevation; a retained ground
   // heightfield never sticks through a pothole's bottom.
   const edge=smooth((region.halfWidth-Math.abs(lateral))/1.15);
   const ends=smooth(Math.min(t,1-t)*9);
   const fade=edge*ends;
   const damage=irregularDepth(region,t,lateral);
   const shoulder=region.type==='country'?.035:.105;
   const elevation=shoulder+fade*(.25-damage.dip);
   const y=terrainHeight(x,z)+elevation;
   positions.push(x,y,z);
   current.copy(asphalt).lerp(old,clamp(.08+.65*damage.rim+
     .035*Math.sin(i*4.7+j*2.3)));
   current.lerp(soil,clamp(damage.dip/.24*.75));
   if(Math.abs(lateral)>region.halfWidth-.7)current.lerp(old,.5);
   colors.push(current.r,current.g,current.b);
   if(i<rows&&j<columns){
    const a=i*(columns+1)+j,b=a+1,c=a+columns+1,d=c+1;
    // Winding oriented to produce an upward-facing road.
    indices.push(a,b,c,b,d,c);
   }
  }
 }
 return {id:region.id,positions:new Float32Array(positions),
   indices:new Uint32Array(indices),colors:new Float32Array(colors),
   columns,rows,holes,length:region.length};
}
function makeRoad(scene,physics,RAPIER,region){
 const geoData=regionalRoadGeometry(region);
 const geo=new THREE.BufferGeometry();
 geo.setAttribute('position',new THREE.BufferAttribute(geoData.positions,3));
 geo.setAttribute('color',new THREE.BufferAttribute(geoData.colors,3));
 geo.setIndex(new THREE.BufferAttribute(geoData.indices,1));geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 mesh.receiveShadow=true;scene.add(mesh);
 let body=null,collider=null;
 if(physics){
  body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  collider=physics.createCollider(RAPIER.ColliderDesc.trimesh(
   geoData.positions,geoData.indices).setFriction(region.type==='country'?1.05:1.25).setRestitution(0),body);
 }
 return {mesh,body,collider,...geoData};
}
function roadsideDetails(scene){
 let seed=98765;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const stones=[],plants=[];
 const trail=REGIONAL_ROADS[2];
 for(let i=0;i<220;i++){
  const t=.05+rand()*.91,p=pointAt(trail,t),side=rand()>.5?1:-1;
  const x=p.x+p.nx*side*(trail.halfWidth+1.3+rand()*3.8);
  const z=p.z+p.nz*side*(trail.halfWidth+1.3+rand()*3.8);
  if(rand()<.38)stones.push({x,z,s:.32+rand()*.65});
  else plants.push({x,z,s:.5+rand()*1.2});
 }
 const dummy=new THREE.Object3D();
 function batch(samples,geometry,color){
  const inst=new THREE.InstancedMesh(geometry,new THREE.MeshLambertMaterial({color}),samples.length);
  inst.frustumCulled=false;
  samples.forEach((s,i)=>{
   dummy.position.set(s.x,terrainHeight(s.x,s.z)+(.7*s.s),s.z);
   dummy.rotation.set(0,(i*2.47)%(Math.PI*2),0);
   dummy.scale.setScalar(s.s);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
  });
  inst.instanceMatrix.needsUpdate=true;scene.add(inst);
  return inst;
 }
 const shrubs=batch(plants,new THREE.ConeGeometry(.9,1.7,5),0x759a5d);
 const rocks=batch(stones,new THREE.DodecahedronGeometry(.7,0),0x948f7e);
 return {shrubs,rocks,plantCount:plants.length,rockCount:stones.length};
}
export function populateRegionalRoads(scene,physics,RAPIER){
 const roads=REGIONAL_ROADS.map(r=>makeRoad(scene,physics,RAPIER,r));
 const details=roadsideDetails(scene);
 return {roads,details,holeCount:roads.reduce((sum,r)=>sum+r.holes.length,0)};
}
