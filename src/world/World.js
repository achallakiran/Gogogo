import * as THREE from 'three';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {AIRPORT,PICKUPS} from '../core/config.js';
import {attachTerrainCollider,TERRAIN_WIDTH,TERRAIN_DEPTH} from './terrainCollider.js';
import {createVoxelFacade,batchStaticScenery} from './Visuals.js';
import {populateStreetLife} from './StreetLife.js';
import {populateLandmarks} from './CityLandmarks.js';
import {terrainHeight,surfaceInfoAt,createTerrainGeometry,GRID_LINES} from './SurfaceSystem.js';
import {FIXED_LANDMARKS,overlapsProtectedFootprint} from './WorldManifest.js';
import {attachLandmarkColliders} from './LandmarkColliders.js';
import {makeTerrainHeightfield} from './terrainCollider.js';
import {populateMountainDistrict} from './MountainDistrict.js';
import {populateRoadDamage} from './RoadDamage.js';
import {populateRegionalRoads} from './RegionalRoads.js';
import {colorizeTerrain,populateBiomeScenery} from './BiomeScenery.js';
import {attachMountainCollisionPatch} from './MountainSurfacePatch.js';
export {terrainHeight} from './SurfaceSystem.js';

const materialCache=new Map();
const MAT = (color, opts={})=>{
  const key=JSON.stringify([color,opts]);let mat=materialCache.get(key);
  if(!mat){
    // MeshLambertMaterial has no roughness or metalness; forwarding those
    // keys produced console warnings for nearly every building.
    const {roughness,metalness,...lambertOptions}=opts;
    mat=new THREE.MeshLambertMaterial({color,...lambertOptions});
    materialCache.set(key,mat);
  }
  return mat;
};
function asphaltTexture(){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#485057';ctx.fillRect(0,0,128,128);
  let seed=2371;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Organic grain and chipped asphalt. Texture is tiled in world-space, so
  // there is no seam or sliding effect as the vehicle moves.
  for(let i=0;i<2600;i++){
    const v=45+Math.floor(rand()*52),alpha=.08+rand()*.28;
    ctx.fillStyle=`rgba(${v},${v+1},${v+2},${alpha})`;
    ctx.fillRect(Math.floor(rand()*128),Math.floor(rand()*128),1+rand()*2,1+rand()*2);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
}
const roadMat=new THREE.MeshLambertMaterial({color:'#ffffff',map:asphaltTexture()});
const roadAlt=MAT('#58636b'), curbMat=MAT('#e9dcd0'), grass=MAT('#83bd8d');
const white=MAT('#f5e8bd',{emissive:'#56482e',emissiveIntensity:.22});
const dark=MAT('#182a3d');
const windowMats=[MAT('#a9edff',{emissive:'#25699d',emissiveIntensity:.42,roughness:.25,metalness:.35}),MAT('#ffdf99',{emissive:'#a86225',emissiveIntensity:.44,roughness:.3})];
const accent=['#fbc9a8','#86bdc6','#d7c1e5','#fed59b','#b5dbb5','#a7add0','#ffd9d0','#97cfda'];
const storeNames=['MOONBEAN COFFEE','TINY MARKET','PIXEL PIZZA','BLOOM & CO','CITY BOOKS','NOVA TECH','LITTLE DONUTS','SKYLINE SHOP'];
const S=THREE.MathUtils;
function rng(seed=1234){let a=seed|0;return ()=>{a=(a*1664525+1013904223)|0;return (a>>>0)/4294967296;};}
function box(parent, x,y,z, w,h,d, mat, cast=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=cast && w>1 && h>.3 && d>.3;m.receiveShadow=true;parent.add(m);return m;}
function cyl(parent,x,y,z,r1,r2,height,mat,segments=6){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,height,segments),mat);m.position.set(x,y,z);m.castShadow=height>2 && r1>1;parent.add(m);return m;}
function labelTexture(text,fg='#ffffff',bg='#263a56'){
  const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 48px system-ui,sans-serif';ctx.fillText(text.slice(0,19),256,64,480);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function sign(parent,text,x,y,z,width=10,bg='#25364c',rotate=0){const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.25), new THREE.MeshBasicMaterial({map:labelTexture(text,'#ffffff',bg),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotate;parent.add(m);return m;}
function colliderBox(physics,x,y,z,w,h,d){if(!physics)return;const rb=physics.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x,y,z));physics.createCollider(RAPIER.ColliderDesc.cuboid(w/2,h/2,d/2),rb);}

function terrain(scene,physics){
  const sampleGrid=makeTerrainHeightfield(terrainHeight);
  const g=colorizeTerrain(createTerrainGeometry(sampleGrid));
  const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:'#ffffff',vertexColors:true}));
  m.receiveShadow=true;scene.add(m);
  if(physics)attachTerrainCollider(physics,RAPIER,terrainHeight,sampleGrid);
  return attachMountainCollisionPatch(physics,RAPIER,g);
}
// Keep adjacent street strips out of overlapping intersection polygons.
export function roadSegments(crossings,start,end,halfGap){
  const out=[];let cursor=start;
  for(const x of crossings){
    if(x+halfGap<=start||x-halfGap>=end)continue;
    if(x-halfGap>cursor)out.push([cursor,Math.min(end,x-halfGap)]);
    cursor=Math.max(cursor,x+halfGap);
  }
  if(cursor<end)out.push([cursor,end]);
  return out.filter(([a,b])=>b-a>.05);
}
function strip(scene,orientation,center,start,end,width,material,layer=.105){
  const n=Math.ceil((end-start)/3),v=[],indices=[],uv=[];
  for(let i=0;i<=n;i++){
    const a=start+(end-start)*i/n;
    for(const b of [-width/2,width/2]){
      const x=orientation==='x'?a:center+b,z=orientation==='x'?center+b:a;
      v.push(x,terrainHeight(x,z)+layer,z);uv.push(x*.13,z*.13);
    }
  }
  for(let i=0;i<n;i++){const t=i*2;if(orientation==='x')indices.push(t,t+1,t+2,t+1,t+3,t+2);else indices.push(t,t+2,t+1,t+1,t+2,t+3);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,material);m.receiveShadow=true;scene.add(m);
}
function buildRoads(scene){
  const xlines=GRID_LINES;
  const zlines=GRID_LINES;
  // North-south roads own intersection patches; east-west strips stop at
  // their edges. This removes the coplanar surfaces that visibly flicker.
  for(const x of xlines){
    strip(scene,'z',x,-273,273,15.5,curbMat,.055);
    strip(scene,'z',x,-272,272,12.5,roadMat,.087);
  }
  for(const z of zlines){
    const end=z===-120?405:272;
    for(const [start,stop] of roadSegments(xlines,-272,end,7.75)){
      strip(scene,'x',z,start,stop,15.5,curbMat,.055);
    }
    for(const [start,stop] of roadSegments(xlines,-271,end,6.25)){
      strip(scene,'x',z,start,stop,12.5,(z===-120&&start>=246)?roadAlt:roadMat,.087);
    }
  }
  for(const x of [-240,-180,-120,-60,0,60,120,180,240]){
    for(let z=-258;z<=258;z+=9){if(zlines.some(c=>Math.abs(c-z)<13))continue;box(scene,x,terrainHeight(x,z)+.116,z,.24,.012,4.2,white,false);}
  }
  for(const z of zlines){for(let x=-257;x<=(z===-120?390:258);x+=9){if(xlines.some(c=>Math.abs(c-x)<13))continue;box(scene,x,terrainHeight(x,z)+.116,z,4.2,.012,.24,white,false);}}
  // pedestrian zebra crossings around the central plaza
  for(const [x,z] of [[0,0],[60,-60],[-60,60],[180,-120],[-120,-120]]){
    for(let i=0;i<6;i++){box(scene,x-5+i*2,terrainHeight(x-5+i*2,z+10)+.117,z+10,1.05,.015,3.2,white,false);}
  }
  // Street traffic lights on concrete islands
  const pole=MAT('#27374c'),red=MAT('#eb6664',{emissive:'#9f1f1d',emissiveIntensity:.3}),green=MAT('#67e1a1',{emissive:'#178c4b',emissiveIntensity:.2});
  for(const x of [-180,-60,60,180])for(const z of [-180,-60,60,180]){
    cyl(scene,x+8,2.3,z+8,.15,.19,4.6,pole,6);box(scene,x+8,4.6,z+8,.72,1.45,.75,pole);
    box(scene,x+8,5.02,z+8.4,.38,.38,.1,red,false);box(scene,x+8,4.45,z+8.4,.38,.38,.1,green,false);
  }
}
function tree(parent,x,z,r=1){const y=terrainHeight(x,z);cyl(parent,x,y+1.55,z,.24,.33,3.1,MAT('#835d49'),5);const colors=['#54aa79','#64bf8b','#479c75','#8bd4a2'];const c=colors[Math.floor(Math.abs(x*z)%colors.length)];const leaves=MAT(c);cyl(parent,x,y+3.35,z,1.65,2.15,2.65,leaves,6);cyl(parent,x,y+4.7,z,1.1,1.65,2.15,leaves,6);}
function building(scene,physics,x,z,w,d,h,color,rand,windowPositions,occluders){
  const y=terrainHeight(x,z);const material=MAT(color,{roughness:.72,metalness:.05});
  occluders.push(box(scene,x,y+h/2,z,w,h,d,material));
  createVoxelFacade(scene,{x,y,z,w,d,h,seed:Math.floor(Math.abs(x*3+z*7))%100});
  // Skirting and rooftop
  box(scene,x,y+.55,z,w+.4,1.1,d+.4,MAT('#c3ad9a'));
  box(scene,x,y+h+.25,z,w+.8,.5,d+.8,MAT('#edf1f0'));
  if(h>15){for(let j=0;j<Math.floor(h/5);j++){
    const wy=y+3+j*4.2;if(wy>y+h-1)break;
    for(let u=-Math.floor((w-3)/4)/2;u<=Math.floor((w-3)/4)/2;u++){
      windowPositions.push([x+u*3.7,wy,z+d/2+.09,0,rand()>.26]);
      windowPositions.push([x+u*3.7,wy,z-d/2-.09,Math.PI,rand()>.26]);
    }
  }} else {
    for(let j=2.8;j<h-1;j+=4){windowPositions.push([x, y+j,z+d/2+.1,0,rand()>.35]);}
  }
  if(rand()<.36){box(scene,x,y+h+.55,z,Math.min(w-3,5),.6,Math.min(d-3,5),MAT('#a2adbd'));}
  colliderBox(physics,x,y+h/2,z,w,h,d);
  if(h<16 && rand()<.67)sign(scene,storeNames[Math.floor(rand()*storeNames.length)],x,y+3.8,z+d/2+.24,Math.min(w*.85,13),'#344760');
}
function buildings(scene,physics){
  const rand=rng(1111),wins=[],occluders=[];
  for(let i=-4;i<=3;i++)for(let j=-4;j<=3;j++){
    const cx=i*60+30,cz=j*60+30;
    // commercial plaza and two park blocks
    if((i===0 && j===0)||(i===-3&&j===2)||(i===2&&j===2)){
      box(scene,cx,.12,cz,46,.18,46,MAT('#d7dfd0'),false);
      for(let k=0;k<7;k++)tree(scene,cx-19+rand()*39,cz-19+rand()*38,1);
      if(i===0 && j===0){cyl(scene,cx,.55,cz,7,7,.8,MAT('#b8d5dc'),12);cyl(scene,cx,.75,cz,5,5,.2,MAT('#56bdce',{metalness:.1}),12);}
      continue;
    }
    const downtown=Math.max(0,1-Math.hypot(cx,cz)/320);const cityCenter=(Math.abs(cx)<135&&Math.abs(cz)<135);
    const count=cityCenter?2+Math.floor(rand()*2):2+Math.floor(rand()*2);
    for(let k=0;k<count;k++){
      const w=12+rand()*12,d=12+rand()*12;
      const ox=((k%2)-.5)*23+(rand()-.5)*4;
      const oz=((Math.floor(k/2)%2)-.5)*23+(rand()-.5)*4;
      const h=8+rand()*16+(cityCenter?downtown*40*rand():0);
      const bx=cx+ox,bz=cz+oz;
      // Reserved landmark parcels override ordinary procedural buildings.
      if(overlapsProtectedFootprint(bx,bz,w,d,.2))continue;
      building(scene,physics,bx,bz,w,d,h,accent[Math.floor(rand()*accent.length)],rand,wins,occluders);
    }
    for(let t=0;t<3;t++)tree(scene,cx-24+rand()*48,cz-24+rand()*48);
  }
  // GPU instanced windows: same geometry and materials
  for(let variant=0;variant<2;variant++){
    const data=wins.filter(p=>p[5] === !!variant);if(!data.length)continue;
    const mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.2,1.6),windowMats[variant],data.length);
    const dummy=new THREE.Object3D();
    data.forEach((p,i)=>{dummy.position.set(p[0],p[1],p[2]);dummy.rotation.set(0,p[3],0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  }
  // Decorative lamp posts on major avenues
  const lampMat=MAT('#364d61');
  for(let z=-260;z<260;z+=30)for(const x of [-188,-68,52,172]){
    const y=terrainHeight(x,z);cyl(scene,x,y+2.7,z,.10,.13,5.4,lampMat,6);
    box(scene,x+.7,y+5.5,z,1.5,.2,.22,lampMat);box(scene,x+1.3,y+5.35,z,.5,.10,.45,white,false);
  }
  return occluders;
}
function airport(scene,physics){
  const terminal=MAT('#dce9ef'),glass=MAT('#5d93b9',{metalness:.28,roughness:.22}),runway=MAT('#27384b');
  // airport apron / runway north-south; access road on west
  box(scene,444,.016,-114,143,.035,255,MAT('#8497a2'),false);
  box(scene,492,.05,-117,36,.05,250,runway,false);
  for(let z=-220;z<0;z+=22)box(scene,492,.09,z,1,.01,10,white,false);
  // terminal is to EAST of dropoff so player can drive to terminal without crashing
  box(scene,417,7.5,-55,45,15,70,terminal);
  box(scene,394,8.7,-55,1,14.0,63,glass,false);
  box(scene,418,15.8,-55,49,1.3,76,MAT('#ffffff'));
  box(scene,394,1.7,-55,5,3.4,65,MAT('#eec983'));
  sign(scene,'SKYPORT INTERNATIONAL',393.2,12,-55,36,'#244b77',-Math.PI/2);
  colliderBox(physics,417,8,-55,45,16,70);
  // control tower
  cyl(scene,461,15,-4,4.0,5,30,terminal,8);cyl(scene,461,33,-4,7,5,7,glass,8);
  cyl(scene,461,37,-4,7.9,7.9,.6,MAT('#ecf3f7'),8);
  // aircraft models on tarmac
  for(const [x,z,rot] of [[447,-154,0],[447,-224,.1]]){
    const p=new THREE.Group();p.position.set(x,2.5,z);p.rotation.y=rot;scene.add(p);
    box(p,0,0,0,3.5,3.2,29,MAT('#f9f9fe'));box(p,0,-.5,0,27,.6,5,MAT('#cfe8f2'));
    box(p,0,3,12,3,.4,8,MAT('#58b9dc'));box(p,0,4.5,13.9,3,4,.35,MAT('#3fa0c0'));
    box(p,0,-.6,-12,2,.5,5,MAT('#e9f0f6'));
    for(const side of [-1,1]){const eng=cyl(p,side*7,-2,-2,1.5,1.4,3.6,MAT('#52697c'),8);eng.rotation.x=Math.PI/2;}
  }
  // terminal overpass and destination dropoff marker
  box(scene,370,.13,-125,35,.22,22,MAT('#7c94a0'),false);
  sign(scene,'AIRPORT DROP-OFF',363,7,-133,15,'#176b74');
  // runway approach lights
  for(let z=-226;z<5;z+=21)for(const x of [476,508]){cyl(scene,x,.36,z,.3,.3,.65,MAT('#e6ecf7',{emissive:'#68cfef',emissiveIntensity:.8}),6);}
}
function details(scene){
  const rand=rng(23091);const rock=MAT('#9a9e9a'),flower=MAT('#e6c6e0');
  for(let i=0;i<160;i++){
    const x=-330+rand()*680,z=-325+rand()*650;
    const onRoad=[-240,-180,-120,-60,0,60,120,180,240].some(v=>Math.abs(x-v)<10||Math.abs(z-v)<10);
    if(onRoad || (Math.abs(x)<268&&Math.abs(z)<270))continue;
    const y=terrainHeight(x,z);const size=.5+rand()*1.6;
    const rockMesh=new THREE.Mesh(new THREE.DodecahedronGeometry(size,0),rand()<.3?flower:rock);rockMesh.position.set(x,y+size*.4,z);rockMesh.rotation.set(rand(),rand(),rand());rockMesh.castShadow=true;scene.add(rockMesh);
  }
  // a glistening lake in the northern outskirts
  const lake=new THREE.Mesh(new THREE.CircleGeometry(60,48),MAT('#51bbd2',{metalness:.22,roughness:.18,transparent:true,opacity:.86}));lake.rotation.x=-Math.PI/2;lake.scale.set(1.65,.8,1);lake.position.set(-325,-1.3,335);scene.add(lake);
}
export function createWorld(scene,physics){
  const skyCanvas=document.createElement('canvas');skyCanvas.width=4;skyCanvas.height=256;
  const sc=skyCanvas.getContext('2d'),sky=sc.createLinearGradient(0,0,0,256);
  sky.addColorStop(0,'#70b7cc');sky.addColorStop(.45,'#a6d4d0');sky.addColorStop(.8,'#f3cc9b');sky.addColorStop(1,'#f5d8b5');
  sc.fillStyle=sky;sc.fillRect(0,0,4,256);
  scene.background=new THREE.CanvasTexture(skyCanvas);scene.fog=new THREE.FogExp2('#e9c9a7',.0012);
  const hemi=new THREE.HemisphereLight('#d8f2ff','#739a78',1.25);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#ffecc3',1.6);sun.position.set(-75,150,60);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-210;sun.shadow.camera.right=210;sun.shadow.camera.top=210;sun.shadow.camera.bottom=-210;sun.shadow.camera.far=410;
  sun.shadow.bias=-.0006;scene.add(sun);scene.add(sun.target);
  const skyG=new THREE.SphereGeometry(210,12,8);const skyM=MAT('#fff0b9',{emissive:'#f5db90',emissiveIntensity:.7});const sunBall=new THREE.Mesh(skyG,skyM);sunBall.position.set(-550,620,-680);scene.add(sunBall);
  const terrainPatch=terrain(scene,physics);buildRoads(scene);
  const occluders=buildings(scene,physics);
  airport(scene,physics);details(scene);
  const streetLife=populateStreetLife(scene,terrainHeight);
  const landmarkCount=populateLandmarks(scene,terrainHeight);
  const landmarkColliders=attachLandmarkColliders(physics,RAPIER,terrainHeight);
  const mountain=populateMountainDistrict(scene,physics);
  const roadDamage=populateRoadDamage(scene,physics,RAPIER);
  const regionalRoads=populateRegionalRoads(scene,physics,RAPIER);
  const biomes=populateBiomeScenery(scene,physics,RAPIER);
  const batches=batchStaticScenery(scene,occluders);
  return {sun,hemi,occluders,batches,streetLife,landmarkCount,landmarkColliders,mountain,roadDamage,regionalRoads,biomes,terrainPatch,
    worldManifestVersion:1,permanentLandmarkIds:FIXED_LANDMARKS.map(x=>x.id)};
}
