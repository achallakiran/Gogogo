import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A single baked, vertex-coloured facade replaces dozens of decorative meshes.
// Inspired by the user's Toofan reference: layered shutters, awnings, corner
// bricks, balconies and roof trim, but with a distinct fictional-city identity.
const facadeMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
const colours=['#23465c','#d65a49','#f5ad54','#2d9188','#f1e6c9','#295771','#7f73a6','#345d4b','#ffdc82'];
function randHash(x){return (Math.sin(x*37.71)*43758.5453)%1;}
export function createVoxelFacade(scene,{x,y,z,w,d,h,seed=0}){
  const positions=[],normals=[],colors=[],indices=[],c=new THREE.Color();
  const faces=[
    [[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],
    [[-1,0,0],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]],
    [[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],
    [[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],
    [[0,0,1],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]],
    [[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]]
  ];
  function block(cx,cy,cz,sx,sy,sz,hex){
    if(sx<=0||sy<=0||sz<=0)return;
    c.set(hex);
    for(const [fi,[n,verts]] of faces.entries()){
      const base=positions.length/3,shade=fi===2?1.15:fi===3?.64:(fi===0||fi===4?.91:.80);
      for(const p of verts){
        positions.push(cx+(p[0]-.5)*sx,cy+(p[1]-.5)*sy,cz+(p[2]-.5)*sz);
        normals.push(...n);colors.push(Math.min(1,c.r*shade),Math.min(1,c.g*shade),Math.min(1,c.b*shade));
      }
      indices.push(base,base+1,base+2,base,base+2,base+3);
    }
  }
  const trim=colours[(seed+4)%colours.length],contrast=colours[(seed+2)%colours.length],dark='#273948',warm='#fff0ba';
  const front=z+d/2+.18,back=z-d/2-.18;
  // Vertical, contrasting architectural columns and layered corner masonry.
  for(const edge of [-1,1]){
    const bx=x+edge*(w/2-.56);
    block(bx,y+h*.52,front,.6,h-.2,.58,trim);
    for(let k=2;k<h-1;k+=3.8)block(bx,y+k,front+.28,1.15,.24,.28,contrast);
  }
  // Horizontally textured floors, sill ledges and blocky inset window surrounds.
  for(let floor=3.6;floor<h-1.5;floor+=4.4){
    block(x,y+floor-1.5,front+.23,w-.6,.25,.47,trim);
    const count=Math.max(1,Math.floor((w-3)/3.6));
    for(let j=0;j<count;j++){
      const wx=x+(j-(count-1)/2)*3.55;
      block(wx,y+floor+.6,front+.16,2.45,2.30,.12,dark);
      block(wx,y+floor+.6,front+.245,1.77,1.64,.10,(j+seed)%5===0?warm:'#75b8c5');
      block(wx,y+floor-.58,front+.45,2.7,.24,.48,'#e8d5ae');
      if((j+seed+Math.floor(floor))%4===0){
        block(wx,y+floor+.2,front+.55,2.65,.18,1.00,trim);
      }
    }
  }
  // Ground-level arcade: shop fascia, pillars and alternating canopy squares.
  block(x,y+3.3,front+.45,w-.75,1.03,.70,contrast);
  const bays=Math.max(2,Math.floor(w/3.1));
  for(let i=0;i<bays;i++){
    const bx=x+(i-(bays-1)/2)*(w-2)/bays;
    block(bx,y+1.46,front+.48,(w-2)/bays-.24,2.45,.17,i%3===0?'#3e556b':'#213c48');
    block(bx,y+3.98,front+1.0,(w-2)/bays-.05,.26,1.45,i%2===0?'#edc463':'#fbefda');
  }
  // Roof parapets break up the uniform rectangular silhouette.
  block(x,y+h+.48,front-.05,w+.5,.65,.75,trim);
  for(let i=0;i<Math.max(3,Math.floor(w/3));i++){
    const bx=x+(i/(Math.max(3,Math.floor(w/3))-1)-.5)*(w-.8);
    block(bx,y+h+.94,front-.12,.72,.5,.77,contrast);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,facadeMaterial);
  mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);
  return mesh;
}

// Batch noninteractive, identical-material scenery into spatial groups.
// Keep building obstruction meshes separate for accurate camera raycasts.
export function batchStaticScenery(scene,excluded=[]){
  const protectedMeshes=new Set(excluded),groups=new Map(),dispose=[];
  scene.updateMatrixWorld(true);
  for(const child of [...scene.children]){
    if(!child.isMesh||child.isInstancedMesh||protectedMeshes.has(child)||!child.material||Array.isArray(child.material)||child.material.transparent)continue;
    const mesh=child,attrs=Object.keys(mesh.geometry.attributes).sort().join(','),indexed=!!mesh.geometry.index;
    const x=mesh.position.x,z=mesh.position.z;
    const cx=Math.floor(x/150),cz=Math.floor(z/150);
    const key=[mesh.material.uuid,attrs,indexed,cx,cz].join(':');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(mesh);
  }
  let merged=0;
  for(const group of groups.values()){
    if(group.length<3)continue;
    const geometryCopies=group.map(mesh=>mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const geometry=mergeGeometries(geometryCopies,false);
    geometryCopies.forEach(g=>g.dispose());
    if(!geometry)continue;
    const mergedMesh=new THREE.Mesh(geometry,group[0].material);
    mergedMesh.receiveShadow=group.some(m=>m.receiveShadow);
    mergedMesh.castShadow=false;
    scene.add(mergedMesh);
    for(const mesh of group){scene.remove(mesh);dispose.push(mesh.geometry);}
    merged++;
  }
  for(const g of new Set(dispose))g.dispose();
  return merged;
}
