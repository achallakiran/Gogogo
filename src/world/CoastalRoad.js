import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
import {COAST_ROAD_ANCHORS} from './CoastLayout.js';
const spline=new THREE.CatmullRomCurve3(COAST_ROAD_ANCHORS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
export const COAST_SAMPLES=Object.freeze(spline.getPoints(104).map(p=>Object.freeze({x:p.x,z:p.z})));
export function coastalRoadGeometry(){
 const rows=COAST_SAMPLES.length-1,cols=14,halfWidth=5.8,positions=[],colors=[],indices=[];
 const asphalt=new THREE.Color('#77746d'),shoulder=new THREE.Color('#a9987c');
 for(let i=0;i<=rows;i++){
  const p=COAST_SAMPLES[i],prev=COAST_SAMPLES[Math.max(0,i-1)],next=COAST_SAMPLES[Math.min(rows,i+1)];
  const dx=next.x-prev.x,dz=next.z-prev.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
  for(let j=0;j<=cols;j++){
   const lateral=(j/cols*2-1)*halfWidth,x=p.x+nx*lateral,z=p.z+nz*lateral;
   const fade=Math.min(1,i/8,(rows-i)/8),edge=Math.max(0,1-Math.abs(lateral)/halfWidth);
   const y=terrainHeight(x,z)+.075+fade*edge*.14;
   positions.push(x,y,z);
   const c=asphalt.clone().lerp(shoulder,Math.pow(1-edge,3)*.85);
   colors.push(c.r,c.g,c.b);
   if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+1,c=a+cols+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
 }
 return {positions:new Float32Array(positions),colors:new Float32Array(colors),indices:new Uint32Array(indices),rows,cols};
}
export function populateCoastalRoad(scene,physics,RAPIER){
 const data=coastalRoadGeometry(),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
 geometry.setAttribute('color',new THREE.BufferAttribute(data.colors,3));
 geometry.setIndex(new THREE.BufferAttribute(data.indices,1));geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 mesh.receiveShadow=true;scene.add(mesh);
 let collider=null;
 if(physics){
  const body=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  collider=physics.createCollider(RAPIER.ColliderDesc.trimesh(data.positions,data.indices).setFriction(1.18),body);
 }
 return {mesh,collider,sampleCount:COAST_SAMPLES.length,triangleCount:data.indices.length/3};
}
