import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {terrainHeight} from './SurfaceSystem.js';
import {MOUNTAIN_SAMPLES,closestMountainPoint,MOUNTAIN_FINISH,MOUNTAIN_ROAD_HALF_WIDTH} from './MountainData.js';
import {landmarkById} from './WorldManifest.js';

function terrainRibbon(scene,halfWidth,raise,color){
  const verts=[],uv=[],indices=[];
  let distance=0;
  for(let i=0;i<MOUNTAIN_SAMPLES.length;i++){
    const p=MOUNTAIN_SAMPLES[i],prev=MOUNTAIN_SAMPLES[Math.max(0,i-1)],next=MOUNTAIN_SAMPLES[Math.min(MOUNTAIN_SAMPLES.length-1,i+1)];
    if(i)distance+=Math.hypot(p.x-prev.x,p.z-prev.z);
    const dx=next.x-prev.x,dz=next.z-prev.z,len=Math.hypot(dx,dz)||1;
    const nx=-dz/len,nz=dx/len;
    for(const side of [-1,1]){
      const x=p.x+nx*halfWidth*side,z=p.z+nz*halfWidth*side;
      verts.push(x,terrainHeight(x,z)+raise,z);
      uv.push(distance*.19,side<0?0:1);
    }
    if(i){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  const mat=new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide});
  const obj=new THREE.Mesh(geo,mat);obj.receiveShadow=true;scene.add(obj);
  return obj;
}
const random=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function lodge(scene){
 const [x,z]=landmarkById('pinecrest-lodge').position,y=terrainHeight(x,z);
 const building=new THREE.Group();building.position.set(x,y,z);scene.add(building);
 const palette={
  stone:new THREE.MeshLambertMaterial({color:0x988d79}),
  wall:new THREE.MeshLambertMaterial({color:0xd9b889}),
  roof:new THREE.MeshLambertMaterial({color:0x477584}),
  trim:new THREE.MeshLambertMaterial({color:0x684b3c}),
  glass:new THREE.MeshLambertMaterial({color:0x87cbdc}),
  warm:new THREE.MeshBasicMaterial({color:0xf4d88b})
 };
 function box(w,h,d,px,py,pz,mat){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(px,py,pz);m.receiveShadow=true;building.add(m);return m;
 }
 box(21,.8,17,0,.1,0,palette.stone);
 box(16,7.4,12,0,4,0,palette.wall);
 box(18.5,1,15,0,8.6,0,palette.roof);
 const rooftop=new THREE.Mesh(new THREE.ConeGeometry(12.2,6,4),palette.roof);
 rooftop.rotation.y=Math.PI/4;rooftop.position.y=11.3;
 rooftop.scale.z=.73;building.add(rooftop);
 for(const sx of [-1,1])for(const zz of [-3.2,3.2]){
  box(3.0,2.3,.2,sx*8.12,5,zz,palette.glass);
  box(.22,2.7,.4,sx*8.3,5,zz,palette.trim);
 }
 for(const sx of [-6,-2,2,6]){
  box(2.1,2.0,.12,sx,4.6,-6.15,palette.glass);
  box(2.1,.3,.3,sx,5.9,-6.25,palette.trim);
 }
 box(4,4,.3,0,2,-6.24,palette.trim);
 box(3.1,3,.35,0,2,-6.5,palette.glass);
 box(10,.5,3.2,0,6.7,-7.2,palette.roof);
 box(1.4,5,.8,-8,3,-6,palette.stone);
 box(1.4,5,.8,8,3,-6,palette.stone);
 const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;
 const ctx=signCanvas.getContext('2d');ctx.fillStyle='#345761';ctx.fillRect(0,0,512,128);
 ctx.fillStyle='#f7e8b6';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='bold 46px system-ui';ctx.fillText('PINECREST LODGE',256,63);
 const tex=new THREE.CanvasTexture(signCanvas);tex.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(12,3),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));
 sign.position.set(0,7,-9);sign.rotation.y=Math.PI;building.add(sign);
 return building;
}
function decorateRidge(scene,physics){
 const rand=random(846273);
 const trees=[],rocks=[];
 for(let i=0;i<260;i++){
   const x=54+rand()*230,z=280+rand()*210;
   const near=closestMountainPoint(x,z).distance;
   if(near<10||Math.hypot(x-MOUNTAIN_FINISH[0],z-MOUNTAIN_FINISH[1])<23)continue;
   const y=terrainHeight(x,z),scale=.7+rand()*1.1;
   if(rand()<.75)trees.push({x,y,z,scale,angle:rand()*6.283});
   else rocks.push({x,y,z,scale,angle:rand()*6.283});
 }
 const dummy=new THREE.Object3D();
 function instance(geo,color,items){
   if(!items.length)return null;
   const mesh=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color}),items.length);
   mesh.receiveShadow=true;mesh.castShadow=false;mesh.frustumCulled=false;
   items.forEach((p,i)=>{
     dummy.position.set(p.x,p.y,p.z);
     dummy.rotation.set(0,p.angle,0);
     dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
   });
   mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);return mesh;
 }
 const forest=instance(new THREE.ConeGeometry(2.4,8.2,5).translate(0,5.2,0),0x448774,trees);
 const trunks=instance(new THREE.CylinderGeometry(.29,.45,4,5).translate(0,2,0),0x755338,trees);
 const boulders=instance(new THREE.DodecahedronGeometry(2.3,0),0x918d82,rocks);
 return {forest,trunks,boulders,treeCount:trees.length,rockCount:rocks.length};
}
function guardrails(scene,physics){
 const mats=[new THREE.MeshLambertMaterial({color:0xeac88e}),new THREE.MeshLambertMaterial({color:0x4c6670})];
 const posts=[],beams=[],colliderBodies=[];
 for(let side of [-1,1]){
   for(let i=3;i<MOUNTAIN_SAMPLES.length-4;i+=5){
     const a=MOUNTAIN_SAMPLES[i],b=MOUNTAIN_SAMPLES[Math.min(i+5,MOUNTAIN_SAMPLES.length-1)];
     const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
     const width=6.75,px=a.x+nx*side*width,pz=a.z+nz*side*width;
     const qx=b.x+nx*side*width,qz=b.z+nz*side*width;
     const cy=(terrainHeight(px,pz)+terrainHeight(qx,qz))/2+1.42;
     const len=Math.hypot(qx-px,qz-pz);
     const dir=Math.atan2(-(qz-pz),qx-px);
     const beam=new THREE.Mesh(new THREE.BoxGeometry(len,.42,.26),mats[0]);
     beam.position.set((px+qx)/2,cy,(pz+qz)/2);beam.rotation.y=dir;
     beam.receiveShadow=true;scene.add(beam);beams.push(beam);
     const post=new THREE.Mesh(new THREE.BoxGeometry(.35,2.1,.4),mats[1]);
     post.position.set(px,terrainHeight(px,pz)+1.08,pz);scene.add(post);posts.push(post);
     if(physics){
       const rb=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation((px+qx)/2,cy,(pz+qz)/2)
         .setRotation({x:0,y:Math.sin(dir/2),z:0,w:Math.cos(dir/2)}));
       physics.createCollider(RAPIER.ColliderDesc.cuboid(len/2,.45,.28).setFriction(1.25),rb);
       colliderBodies.push(rb);
     }
   }
 }
 return {count:beams.length,colliderBodies,posts};
}
export function populateMountainDistrict(scene,physics){
 // A short structural transition under the city-to-hill seam protects the
 // junction from Rapier heightfield edge misses and stays coplanar with the
 // existing city asphalt (unlike raised ramps that launch the vehicle).
 let transitionBody=null;
 if(physics){
   const y=terrainHeight(120,268);
   transitionBody=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed()
     .setTranslation(120,y-.05,268));
   physics.createCollider(RAPIER.ColliderDesc.cuboid(5.35,.085,12.3).setFriction(1.3),transitionBody);
 }

 // Road visuals are thin decorative ribbons draped on the SAME terrain
 // height function as the physics heightfield. No floating runway-like slab.
 const shoulder=terrainRibbon(scene,7.4,.051,0xaa8d6a);
 const asphalt=terrainRibbon(scene,MOUNTAIN_ROAD_HALF_WIDTH,.077,0x4b555c);
 const rand=random(101);
 const lines=[];
 for(let i=3;i<MOUNTAIN_SAMPLES.length-3;i+=7){
   const a=MOUNTAIN_SAMPLES[i],b=MOUNTAIN_SAMPLES[i+3];
   const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
   if(!len)continue;
   const line=new THREE.Mesh(new THREE.BoxGeometry(.22,.012,3.6),
      new THREE.MeshBasicMaterial({color:0xeedca4}));
   line.rotation.y=Math.atan2(-dx,-dz);
   line.position.set(a.x,terrainHeight(a.x,a.z)+.106,a.z);
   scene.add(line);lines.push(line);
 }
 const rails=guardrails(scene,physics);
 const detail=decorateRidge(scene,physics);
 const cabin=lodge(scene);
 return {road:asphalt,shoulder,railCount:rails.count,
  barrierBodies:rails.colliderBodies,transitionBody,length:MOUNTAIN_SAMPLES.length,
  trees:detail.treeCount,rocks:detail.rockCount,cabin,samples:MOUNTAIN_SAMPLES};
}
