// High-contrast, authored streetscape in the first district a player sees.
// Entirely native geometry/paint; works with GitHub Pages and standalone HTML.
// Street lanes remain clear. Only substantial roadside props own rigid colliders.
import * as THREE from 'three';
import {terrainHeight} from './SurfaceSystem.js';
const mat=c=>new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide});
const COLORS=['#f78b74','#f8c75c','#4cc6c0','#88b8ff','#eaa2d6','#c9d37d'];
const sceneMat={posts:mat('#234d60'),roof:mat('#ffcb70'),glass:mat('#8cdef1'),dark:mat('#254150')};
function cube(parent,x,y,z,w,h,d,color){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),color);
 o.position.set(x,y,z);o.receiveShadow=true;parent.add(o);return o;
}
function textSign(text){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
 const ctx=canvas.getContext('2d');
 ctx.fillStyle='#163653';ctx.fillRect(0,0,512,128);
 ctx.fillStyle='#46c7c4';ctx.fillRect(6,6,500,7);ctx.fillRect(6,115,500,7);
 ctx.fillStyle='#fff5d6';ctx.font='900 40px system-ui,sans-serif';
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText(text,256,67,475);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
}
function solidPost(world,RAPIER,x,y,z,height=6,r=.24){
 if(!world)return;
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y+height/2,z));
 world.createCollider(RAPIER.ColliderDesc.cuboid(r,height/2,r).setFriction(1.1),body);
}
export function populateDowntownDressing(scene,world,RAPIER){
 const root=new THREE.Group();root.name='downtown-bright-streetscape';scene.add(root);
 const foliage=[],pots=[],canopies=[],trim=[],marketStalls=[],signs=[];
 const canopyMaterials=COLORS.map(mat);
 // Strong near-camera skyline silhouettes and vertical color rhythm on -Z boulevard.
 for(let index=0;index<19;index++){
  const z=-20-index*12.1;
  for(const side of [-1,1]){
   const x=side*(10.3+(index%3)*.65),y=terrainHeight(x,z);
   const o=new THREE.Group();o.position.set(x,y,z);root.add(o);
   const trunk=cube(o,0,2.3,0,.42,4.6,.42,sceneMat.posts);
   const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(2.45,1),mat(index%4===0?'#73c7a0':'#69b88b'));
   crown.position.y=5.5;crown.scale.set(1.1,.8,1.05);o.add(crown);foliage.push(crown);
   const p=cube(o,side*1.1,.42,0,2.0,.82,1.45,mat('#d7bba0'));pots.push(p);
   for(let k=-1;k<=1;k++){
    const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.4,0),canopyMaterials[(index+k+6)%COLORS.length]);
    flower.position.set(side*1.1+k*.5,.98,.17*(k%2));o.add(flower);
   }
   // Stalls/canopies stand behind the tree line rather than across the road.
   if(index%3===0){
    const sx=side*4.2;
    cube(o,sx,1.25,0,3.7,2.5,2.3,sceneMat.dark);
    const awning=cube(o,sx,2.9,-.3,4.65,.27,2.9,canopyMaterials[(index/3+(side===1?2:0))%COLORS.length]);
    awning.rotation.z=side*.08;canopies.push(awning);
    cube(o,sx,3.08,-1.85,4.65,.25,.25,mat('#fff1c8'));
    for(const dz of [-.8,.75]){
     cube(o,sx,1.35,dz,2.8,.22,.24,mat('#d5ad72'));
    }
    marketStalls.push(o);
   }
   // Posts/planters can be hit when a vehicle leaves the road.
   if(index%3===0)solidPost(world,RAPIER,x,y,z,4.6,.26);
  }
 }
 // Over-road festival pennants create visible landmarks at the FIRST turn.
 for(const [j,z] of [-32,-92,-152,-212].entries()){
  const y=terrainHeight(0,z)+7.8;
  const cable=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,22.0,5),mat('#42556b'));
  cable.position.set(0,y,z);cable.rotation.z=Math.PI/2;root.add(cable);
  for(let i=0;i<16;i++){
   const x=-10+i*1.33;
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute([x,y,z,x+1.05,y,z,x+.52,y-.95,z+.15],3));
   g.computeVertexNormals();
   root.add(new THREE.Mesh(g,canopyMaterials[(i+j*3)%COLORS.length]));
  }
 }
 for(const [k,z,label] of [[0,-48,'SUNRISE BOULEVARD'],[1,-166,'CITY MARKET WAY']]){
  const y=terrainHeight(0,z),h=8.6;
  for(const x of [-9.7,9.7]){
   cube(root,x,y+h/2,z,.36,h,.36,sceneMat.posts);
   solidPost(world,RAPIER,x,y,z,h,.19);
   const bulb=new THREE.Mesh(new THREE.IcosahedronGeometry(.40,0),mat('#ffdb91'));
   bulb.position.set(x,y+h-.9,z);root.add(bulb);
  }
  cube(root,0,y+h-.2,z,19.5,.43,.45,sceneMat.posts);
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(13.2,2.45),textSign(label));
  banner.position.set(0,y+h-1.7,z+.05);root.add(banner);signs.push(banner);
 }
 // Distinctive blue-and-yellow roadside transit shelters and benches.
 for(const [side,z] of [[1,-74],[-1,-140],[1,-215]]){
  const x=side*14.7,y=terrainHeight(x,z);
  const shelter=new THREE.Group();shelter.position.set(x,y,z);root.add(shelter);
  for(const dx of [-3,3])for(const dz of [-1.8,1.8])
   cube(shelter,dx,1.85,dz,.20,3.7,.20,sceneMat.posts);
  cube(shelter,0,3.9,0,7.4,.27,5.2,sceneMat.roof);
  cube(shelter,0,1.4,-2.3,6.8,2.8,.12,sceneMat.glass);
  cube(shelter,0,.83,0,5,.25,1.2,mat('#edb27a'));
  cube(shelter,0,.43,0,4.3,.85,.26,mat('#476a80'));
 }
 return {root,foliageCount:foliage.length,planterCount:pots.length,
  canopyCount:canopies.length,stallCount:marketStalls.length,
  signCount:signs.length,archCount:2};
}
