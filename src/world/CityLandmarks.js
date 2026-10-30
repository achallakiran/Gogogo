import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {landmarkById} from './WorldManifest.js';

// Three authored focal points and one welcome gate make the world read as
// identifiable neighbourhoods, rather than a repeated grid of towers.
// Each landmark bakes its decorative geometry by material to save draw calls.
const surfaces=new Map();
function material(hex){
  if(!surfaces.has(hex))surfaces.set(hex,new THREE.MeshLambertMaterial({color:hex}));
  return surfaces.get(hex);
}
class Sculpt{
  constructor(){this.groups=new Map();}
  put(g,hex){if(!this.groups.has(hex))this.groups.set(hex,[]);this.groups.get(hex).push(g);return this;}
  box(x,y,z,w,h,d,hex){
    return this.put(new THREE.BoxGeometry(w,h,d).translate(x,y,z),hex);
  }
  column(x,y,z,r,h,hex,sides=8){
    return this.put(new THREE.CylinderGeometry(r,r,h,sides).translate(x,y,z),hex);
  }
  pyramid(x,y,z,r,h,hex,sides=4){
    return this.put(new THREE.ConeGeometry(r,h,sides).translate(x,y,z),hex);
  }
  finish(scene,x,z,height){
    const root=new THREE.Group();root.position.set(x,height,z);scene.add(root);
    for(const [hex,geos] of this.groups){
      const geo=mergeGeometries(geos,false);
      geos.forEach(g=>g.dispose());
      if(!geo)continue;
      const m=new THREE.Mesh(geo,material(hex));
      m.castShadow=false;m.receiveShadow=true;root.add(m);
    }
    return root;
  }
}
function textBoard(label,bg='#224a62',fg='#f8e9cb'){
  const can=document.createElement('canvas');can.width=512;can.height=128;
  const ctx=can.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);
  ctx.strokeStyle='#e7bd7199';ctx.lineWidth=6;ctx.strokeRect(5,5,502,118);
  ctx.fillStyle=fg;ctx.font='900 44px system-ui, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,65,475);
  const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide});
}
function sign(root,label,px,py,pz,w=9,ry=0){
  const obj=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.25),textBoard(label));
  obj.position.set(px,py,pz);obj.rotation.y=ry;root.add(obj);return obj;
}
function clockFace(){
  const can=document.createElement('canvas');can.width=256;can.height=256;
  const ctx=can.getContext('2d');
  ctx.beginPath();ctx.arc(128,128,122,0,Math.PI*2);ctx.fillStyle='#f0dcb4';ctx.fill();
  ctx.lineWidth=12;ctx.strokeStyle='#3d5158';ctx.stroke();
  ctx.strokeStyle='#2d424a';ctx.lineWidth=5;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6-Math.PI/2;
    ctx.beginPath();ctx.moveTo(128+Math.cos(a)*97,128+Math.sin(a)*97);
    ctx.lineTo(128+Math.cos(a)*113,128+Math.sin(a)*113);ctx.stroke();
  }
  ctx.lineWidth=10;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(128,70);ctx.stroke();
  ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(178,145);ctx.stroke();
  const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide});
}
function clockSquare(scene,heightAt){
  const [x,z]=landmarkById('clock-square').position,y=heightAt(x,z),s=new Sculpt();
  s.box(0,.35,0,17,.7,17,'#bfb6a6');
  for(const corner of [-1,1])for(const edge of [-1,1]){
    s.box(corner*7.8,.95,edge*7.8,1,1,1,'#d9c49e');
  }
  s.box(0,3.8,0,9,7,9,'#c38b63');
  for(let j=0;j<4;j++)s.box(0,1.0+j*2.1,0,10,.27,10,'#edcb9a');
  s.box(0,10.5,0,7.6,8.8,7.6,'#e7b880');
  s.box(0,15.1,0,10,1.1,10,'#5d7881');
  s.box(0,17.35,0,7.1,3.8,7.1,'#3c6678');
  s.box(0,20,0,8,1,8,'#e9c47b');
  s.pyramid(0,23.4,0,6.1,6,'#4f7785');
  s.column(0,27.2,0,.35,3,'#dcb06e',7);
  for(const side of [-1,1]){
    for(const v of [-2,2]){
      s.box(v,6,side*4.55,1.2,2.4,.25,'#577682');
      s.box(side*4.55,6,v,.25,2.4,1.2,'#577682');
      s.box(v,12.6,side*3.9,1.25,2,.18,'#577682');
      s.box(side*3.9,12.6,v,.18,2,1.25,'#577682');
    }
  }
  const root=s.finish(scene,x,z,y),face=clockFace();
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const m=new THREE.Mesh(new THREE.CircleGeometry(1.65,24),face);
    m.position.set(Math.sin(a)*3.9,17.4,Math.cos(a)*3.9);m.rotation.y=a;root.add(m);
  }
  sign(root,'CLOCK SQUARE',0,2.3,5.2,8);
}
function metroPlaza(scene,heightAt){
  const [x,z]=landmarkById('metro-terminal').position,y=heightAt(x,z),s=new Sculpt();
  s.box(0,.2,0,37,.38,24,'#d8d5bd');
  s.box(0,.8,0,34,.7,20,'#4f7b82');
  for(let i=-4;i<=4;i++){
    const px=i*3.5;
    s.column(px,4.2,7.5,.36,7.2,'#3c5560',6);
    s.column(px,4.2,-7.5,.36,7.2,'#3c5560',6);
    s.box(px,8.5,0,2.6,.32,17,i%2===0?'#edb75e':'#7dc5ba');
  }
  s.box(0,9.25,0,35,1,18,'#34687b');
  s.box(0,10,0,37,.45,19,'#efdbb4');
  for(const px of [-10,0,10]){
    s.box(px,11,0,5,.6,20,'#60adbc');
  }
  s.box(-12,2.0,0,4,3.3,4,'#db9e63');
  s.box(12,2.0,0,4,3.3,4,'#db9e63');
  s.box(0,2.0,-8,14,2,1,'#295773');
  const root=s.finish(scene,x,z,y);
  sign(root,'METRO TERMINAL',0,6.7,-9.6,15);
  sign(root,'CITY LINE',0,6.7,9.6,12,Math.PI);
}
function welcomeGate(scene,heightAt){
  const [x,z]=landmarkById('gogogo-welcome-gate').position,y=heightAt(x,z),s=new Sculpt();
  s.box(-9.0,4.1,0,1.0,8.2,1.2,'#355d70');
  s.box(9.0,4.1,0,1.0,8.2,1.2,'#355d70');
  for(let i=-7;i<=7;i+=2)s.box(i,8.1,0,2.1,.35,1.4,i%4===0?'#f2b95d':'#6cbdac');
  s.box(0,9,0,19,2.4,1.0,'#244c64');
  for(let i=-6;i<=6;i+=2)s.box(i,10.45,0,.9,.4,1.6,'#e7ca82');
  const root=s.finish(scene,x,z,y);
  sign(root,'WELCOME TO GOGOGO',0,9.1,.62,16);
}
function plazaArt(scene,heightAt){
  const [x,z]=landmarkById('sunrise-plaza').position,y=heightAt(x,z),s=new Sculpt();
  // Frame the existing fountain with non-driveable decorative arches.
  for(const edge of [-1,1]){
    const px=edge*15;
    s.box(px,2.8,-14,.85,5.6,1.2,'#f2c47f');
    s.box(px,5.8,-14,2.3,.5,2.4,'#a96561');
    s.box(px*.65,.5,15,3,1,3,'#e6ba7d');
  }
  s.box(0,6,-14,32,1.0,2.0,'#a96561');
  for(let j=-15;j<=15;j+=3)s.box(j,6.8,-14,1.1,.6,2.0,j%2===0?'#f3d17e':'#d08a64');
  const root=s.finish(scene,x,z,y);
  sign(root,'SUNRISE PLAZA',0,6.1,-12.8,16);
}
export function populateLandmarks(scene,heightAt){
  clockSquare(scene,heightAt);
  metroPlaza(scene,heightAt);
  welcomeGate(scene,heightAt);
  plazaArt(scene,heightAt);
  return 4;
}
