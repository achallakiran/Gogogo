// Lightweight authored airport activity and atmospheric scenery.
import * as THREE from 'three';
const mat=c=>new THREE.MeshLambertMaterial({color:c});
function block(group,w,h,d,color,x=0,y=0,z=0){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
 mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function airliner(){
 const root=new THREE.Group();
 block(root,3.6,3.5,24,'#f2f5ee');
 block(root,27,.7,4.8,'#9bd8de',0,-.55,0);
 block(root,10,.55,3,'#cbe1e9',0,.4,9);
 block(root,3,.4,6,'#c0dfeb',0,3.2,10);
 block(root,3,.7,4,'#517c96',0,1.2,-9);
 for(const x of [-7.3,7.3])block(root,2.5,2.5,4.2,'#526b78',x,-2.2,-1);
 return root;
}
export function populateAirportAtmosphere(scene){
 const clouds=[],birds=[],planes=[];
 const cloudMat=new THREE.MeshLambertMaterial({color:'#f7f5e9',transparent:true,opacity:.88,depthWrite:false});
 const cloudGeometry=new THREE.IcosahedronGeometry(1,1);
 const cloudMesh=new THREE.InstancedMesh(cloudGeometry,cloudMat,88);
 const o=new THREE.Object3D();
 for(let i=0;i<88;i++){
  const patch=Math.floor(i/4),k=i%4;
  const a=patch*2.39996,rad=115+(patch%6)*58;
  const x=Math.cos(a)*rad+k*4,z=Math.sin(a)*rad+(k%2)*3;
  const y=88+(patch%5)*19+(k%3)*2;
  o.position.set(x,y,z);o.scale.set(11+(k%3)*4,3.6+(k%2)*2,6.5+(patch%3));o.updateMatrix();cloudMesh.setMatrixAt(i,o.matrix);
 }
 cloudMesh.frustumCulled=false;cloudMesh.instanceMatrix.needsUpdate=true;
 scene.add(cloudMesh);clouds.push(cloudMesh);
 const sunGlow=new THREE.Mesh(new THREE.SphereGeometry(26,16,12),new THREE.MeshBasicMaterial({color:'#ffe9a5',transparent:true,opacity:.36,depthWrite:false}));
 sunGlow.position.set(-550,620,-680);scene.add(sunGlow);
 const birdMaterial=new THREE.LineBasicMaterial({color:'#4c6470',transparent:true,opacity:.72});
 for(let i=0;i<15;i++){
  const geometry=new THREE.BufferGeometry().setFromPoints([
   new THREE.Vector3(-1.4,0,0),new THREE.Vector3(0,-.35,0),new THREE.Vector3(1.4,0,0)]);
  const line=new THREE.Line(geometry,birdMaterial);
  const coastal=i%2===0;
  line.position.set(coastal?-485+i*5:115+i*8,19+(i%5)*3,coastal?-390+i*7:350+i*6);
  line.rotation.y=i*.62;scene.add(line);birds.push({line,x:line.position.x,z:line.position.z,phase:i*1.1});
 }
 for(let i=0;i<2;i++){
  const root=airliner();scene.add(root);planes.push({root,phase:i*.50,kind:i?'departure':'arrival'});
 }
 function update(time){
  for(const b of birds){
   b.line.position.x=b.x+Math.sin(time*.22+b.phase)*18;
   b.line.position.z=b.z+Math.cos(time*.19+b.phase)*11;
   const a=b.line.geometry.getAttribute('position');
   a.setY(0,Math.sin(time*4+b.phase)*.35);
   a.setY(2,Math.sin(time*4+b.phase)*.35);a.needsUpdate=true;
  }
  for(const p of planes){
   const t=((time/90+p.phase)%1+1)%1;
   // One descends toward the runway; another climbs away from its far end.
   const z=p.kind==='arrival'?-480+t*680:250-t*680;
   const progress=p.kind==='arrival'?Math.min(1,t/.52):Math.min(1,t/.52);
   const y=p.kind==='arrival'?Math.max(3.2,95-progress*92):3.2+progress*92;
   p.root.position.set(492,y,z);
   p.root.rotation.set(p.kind==='arrival'?-.09:.09,p.kind==='arrival'?Math.PI:0,0);
   p.root.visible=t<.92;
  }
 }
 update(0);
 return {clouds:clouds.length,cloudPuffs:88,birds:birds.length,planes:planes.length,update};
}
