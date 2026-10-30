import * as THREE from 'three';
// Detailed colourable voxel bodies: hidden-face culling, one paint material, one detail material.
// Unlike per-cube meshes, each car uses only a few GPU draw calls.
const detailMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
const FACE=[
 {d:[1,0,0],c:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
 {d:[-1,0,0],c:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
 {d:[0,1,0],c:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
 {d:[0,-1,0],c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
 {d:[0,0,1],c:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
 {d:[0,0,-1],c:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
];
const key=(x,y,z)=>x+','+y+','+z;
class Vox {
 constructor(){this.map=new Map();}
 set(x,y,z,color){this.map.set(key(x,y,z),{x,y,z,color});}
 box(x0,y0,z0,x1,y1,z1,color){for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)this.set(x,y,z,color);}
 meshes(scale,paint){
  const groups={paint:{p:[],n:[],c:[],i:[]},detail:{p:[],n:[],c:[],i:[]}};
  const colour=new THREE.Color();
  for(const v of this.map.values()){
   const g=v.color==='paint'?groups.paint:groups.detail;
   if(v.color!=='paint')colour.set(v.color);
   for(let f=0;f<6;f++){
    const face=FACE[f],d=face.d;
    if(this.map.has(key(v.x+d[0],v.y+d[1],v.z+d[2])))continue;
    const begin=g.p.length/3,shade=[.88,.77,1,.60,.90,.82][f];
    for(const c of face.c){
      g.p.push((v.x+c[0]-.5)*scale,(v.y+c[1]-.5)*scale,(v.z+c[2]-.5)*scale);
      g.n.push(...d);
      if(v.color!=='paint')g.c.push(Math.min(1,colour.r*shade),Math.min(1,colour.g*shade),Math.min(1,colour.b*shade));
    }
    g.i.push(begin,begin+1,begin+2,begin,begin+2,begin+3);
   }
  }
  const meshes=[];
  for(const [k,g] of Object.entries(groups)){
   if(!g.i.length)continue;
   const geo=new THREE.BufferGeometry();
   geo.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));
   geo.setAttribute('normal',new THREE.Float32BufferAttribute(g.n,3));
   if(k==='detail')geo.setAttribute('color',new THREE.Float32BufferAttribute(g.c,3));
   geo.setIndex(g.i);
   const obj=new THREE.Mesh(geo,k==='paint'?paint:detailMaterial);obj.castShadow=true;obj.receiveShadow=true;meshes.push(obj);
  }
  return meshes;
 }
}
function body(spec){
 const v=new Vox(),unit=.17,w=Math.round(spec.width/(2*unit)),l=Math.round(spec.length/(2*unit));
 const truck=spec.id==='truck',van=spec.id==='van',sports=spec.id==='coupe',suv=spec.id==='suv';
 const roof=van?10:truck?8:suv?9:sports?5:7;
 v.box(-w,-2,-l,w,0,l,'paint');
 v.box(-w+1,1,-l+1,w-1,1,l-1,'paint');
 const cw=w-(sports?2:1),cf=van?-l+1:truck?-l+3:sports?-3:-l+5,cb=van?l-1:truck?1:sports?6:l-3;
 v.box(-cw,2,cf,cw,roof,cb,'paint');
 v.box(-cw-1,roof+1,cf+1,cw+1,roof+1,cb-1,'paint');
 for(let y=3;y<roof;y++)for(let x=-cw+2;x<=cw-2;x++){
   v.set(x,y,cf,'#8bc9d5');v.set(x,y,cb,'#639dae');
 }
 for(const side of [-1,1]){
  for(let z=cf+2;z<=cb-2;z++)for(let y=3;y<roof;y++)if((z-cf)%7!==0)v.set(side*cw,y,z,'#7db9c4');
  v.box(side*(w+1),-2,-l+2,side*(w+1),-2,l-2,'#27323b');
  for(const zc of [-Math.round(l*.62),Math.round(l*.62)])
   for(let zz=zc-3;zz<=zc+3;zz++)for(let y=-2;y<=Math.max(-2,1-Math.ceil(Math.abs(zz-zc)*.55));y++)v.set(side*w,y,zz,'#252b32');
  v.box(side*(cw+1),2,0,side*(cw+1),2,2,'#e8cf90');
  v.box(side*(cw+2),3,-Math.round(l*.27),side*(cw+2),3,-Math.round(l*.27)+2,'#283e46');
 }
 v.box(-w+2,-1,-l-1,w-2,0,-l-1,'#26343a');
 v.box(-w+2,-1,l+1,w-2,0,l+1,'#32434a');
 v.box(-Math.max(2,w-3),0,-l-2,Math.max(2,w-3),0,-l-2,'#b4c5c7');
 v.box(-Math.max(2,w-3),0,l+2,Math.max(2,w-3),0,l+2,'#e0ddca');
 for(const side of [-1,1]){
  v.box(side*(w-2),1,-l-1,side*(w-1),2,-l-1,'#fff5bd');
  v.box(side*(w-2),1,l+1,side*(w-1),2,l+1,'#ea5246');
 }
 if(spec.id==='taxi'){
  v.box(-3,roof+2,-1,3,roof+3,2,'#fff0c0');
  v.box(-2,roof+3,-2,2,roof+3,-2,'#243c4a');
 }else if(truck){
  v.box(-cw+1,roof+2,-1,cw-1,roof+2,1,'#303a42');
  v.box(-w,-1,l-2,w,1,l-2,'#3d4b50');
 }else if(sports)v.box(-w+1,3,l-3,w-1,3,l-3,'#26343b');
 else if(van)v.box(-cw+1,roof+2,-l+3,cw-1,roof+2,-l+4,'#e7d9b5');
 return {v,unit};
}
function wheel(radius){
 const v=new Vox(),unit=radius/4.7;
 for(let x=-2;x<=2;x++)for(let y=-5;y<=5;y++)for(let z=-5;z<=5;z++){
   const r=Math.hypot(y,z);if(r>4.8)continue;
   let c=r>3.4?'#24272b':'#b7bcc1';
   if(r<1.3)c='#44494d';
   if(Math.abs(x)<2)c=r>3.4?'#252729':'#41464d';
   if(r>3.5&&(y+z)%2===0)c='#313337';
   v.set(x,y,z,c);
 }
 return {v,unit};
}
export function createVoxelVehicleModel(spec,paintColour){
 const root=new THREE.Group(),chassis=new THREE.Group();root.add(chassis);
 const paint=new THREE.MeshLambertMaterial({color:paintColour});
 const shape=body(spec);
 for(const m of shape.v.meshes(shape.unit,paint))chassis.add(m);
 const wheels=[];
 for(const axle of [-1,1])for(const side of [-1,1]){
   const holder=new THREE.Group();holder.position.set(side*(spec.width*.5-.06),-.50,axle*(spec.length*.5-spec.wheel*.85));root.add(holder);
   const spin=new THREE.Group();holder.add(spin);const shape=wheel(spec.wheel);
   for(const m of shape.v.meshes(shape.unit,paint))spin.add(m);
   wheels.push({holder,spin,axle,side,baseY:-.50});
 }
 return {root,chassis,paint,wheels};
}
