import * as THREE from 'three';

// Baked vertex-coloured voxel scenery with hidden-face culling, based on the
// user's Toofan reference. These geometry templates are shared between clones.
const k=(x,y,z)=>x+','+y+','+z;
const FACES=[
 {d:[1,0,0],corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
 {d:[-1,0,0],corners:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
 {d:[0,1,0],corners:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
 {d:[0,-1,0],corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
 {d:[0,0,1],corners:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
 {d:[0,0,-1],corners:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
];
const mat=new THREE.MeshLambertMaterial({vertexColors:true});
class Voxel {
 constructor(){this.grid=new Map();}
 set(x,y,z,c){this.grid.set(k(x,y,z),{x,y,z,c});return this;}
 box(x0,y0,z0,x1,y1,z1,c){
   for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)this.set(x,y,z,c);
   return this;
 }
 sphere(cx,cy,cz,r,c){
   for(let x=cx-r;x<=cx+r;x++)for(let y=cy-r;y<=cy+r;y++)for(let z=cz-r;z<=cz+r;z++){
    if(Math.hypot(x-cx,y-cy,z-cz)<r+.15)this.set(x,y,z,c);
   }return this;
 }
 bake(unit,ox=0,oy=0,oz=0){
   const p=[],norm=[],col=[],idx=[],c=new THREE.Color();
   for(const v of this.grid.values()){
     c.set(v.c);
     for(let i=0;i<6;i++){
       const f=FACES[i],d=f.d;if(this.grid.has(k(v.x+d[0],v.y+d[1],v.z+d[2])))continue;
       const base=p.length/3,light=[.89,.77,1.14,.65,.93,.79][i];
       for(const cr of f.corners){
         p.push((v.x+cr[0]+ox)*unit,(v.y+cr[1]+oy)*unit,(v.z+cr[2]+oz)*unit);
         norm.push(...d);col.push(Math.min(1,c.r*light),Math.min(1,c.g*light),Math.min(1,c.b*light));
       }
       idx.push(base,base+1,base+2,base,base+2,base+3);
     }
   }
   const g=new THREE.BufferGeometry();
   g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
   g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
   g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
   g.setIndex(idx);g.computeBoundingSphere();return g;
 }
}
const skins=['#b87e55','#aa613e','#e7af86','#895233','#ca906a'];
const clothes=['#2a83af','#e38b51','#d75162','#785cac','#329671','#ecbc55'];
const dark='#24343e';
const cached=new Map();
const template=(name,build)=>{
 if(cached.has(name))return cached.get(name);
 const m=new THREE.Mesh(build(),mat);m.castShadow=false;m.receiveShadow=true;
 cached.set(name,m);return m;
};
export function makeVoxelPedestrian(variant=0){
 const index=Math.abs(Math.floor(variant)),skin=skins[index%skins.length],shirt=clothes[index%clothes.length];
 const hair=['#171d27','#46342a','#201917','#573c29'][index%4];
 return template('ped-'+index%12,()=>{
   const v=new Voxel(),p='#37455d',shoe='#23292f';
   v.box(-2,0,-1,-1,2,1,shoe).box(1,0,-1,2,2,1,shoe);
   v.box(-2,3,-1,-1,7,1,p).box(1,3,-1,2,7,1,p);
   v.box(-3,8,-2,3,15,2,shirt);
   v.box(-5,9,-1,-4,15,1,skin).box(4,9,-1,5,15,1,skin);
   v.box(-4,8,-1,-3,9,1,shirt).box(3,8,-1,4,9,1,shirt);
   v.box(-2,16,-1,2,16,1,skin);
   v.box(-3,17,-2,3,23,2,skin).box(-3,23,-2,3,24,2,hair);
   v.box(-3,21,-2,3,22,-2,hair);
   v.set(-2,20,3,'#20272f').set(2,20,3,'#20272f');
   v.box(-1,18,3,1,18,3,'#844e40');
   if(index%3===0)v.box(-3,13,-3,3,14,-3,'#e8ca79');
   if(index%4===0)v.box(4,8,-3,6,14,2,'#bd805b'); // messenger bag
   return v.bake(.079);
 }).clone();
}
function marketStall(variant=0){
 const colors=['#ec725e','#eebc58','#47a8a0','#8e78c7'];
 const v=new Voxel(),paint=colors[variant%4],roof='#f5ead0';
 v.box(-7,0,-4,7,2,4,'#c29b77');
 v.box(-6,3,-3,6,7,3,'#665345');
 v.box(-7,8,-5,7,8,5,paint);
 for(let x=-7;x<=7;x++)v.box(x,9,-5,x,9,5,x%4<2?roof:paint);
 for(const x of [-7,7])for(const z of [-5,5])v.box(x,0,z,x,8,z,'#574534');
 for(let x=-4;x<=4;x+=3)for(let z=-2;z<=2;z+=2){
   v.box(x,3,z,x+2,3,z+1,variant%2===0?'#72ab54':'#d58d4b');
   v.set(x+1,4,z,variant%2===0?'#f1cd5e':'#e45655');
 }
 v.box(-8,0,-6,-7,2,6,'#8a6952').box(7,0,-6,8,2,6,'#8a6952');
 return v.bake(.17);
}
function parkBench(){
 const v=new Voxel();
 v.box(-7,3,-2,7,4,1,'#c9945c').box(-7,6,-3,7,9,-2,'#b88355');
 for(const x of [-6,6])v.box(x,0,-2,x,3,1,'#263b3e');
 return v.bake(.14);
}
function shrub(variant){
 const v=new Voxel();
 v.box(-4,0,-4,4,3,4,'#c4a285');
 v.box(-3,3,-3,3,4,3,'#614c3c');
 v.sphere(0,7,0,5,['#43865a','#58a86b','#6eac66'][variant%3]);
 if(variant%2===0)for(let p=-2;p<=2;p+=2)v.set(p,10,2,'#f4c768');
 return v.bake(.16);
}
function awning(variant){
 const v=new Voxel(),col=['#eb825e','#5dbaaa','#f0b55b','#a18ed7'][variant%4];
 for(let x=-12;x<=12;x++){
   const color=Math.floor((x+12)/3)%2?col:'#f9ead2';
   v.box(x,14,-6,x,14,4,color);
   v.box(x,13,4,x,13,5,color);
 }
 for(const x of [-11,11])v.box(x,0,3,x,13,3,'#3a4a4f');
 return v.bake(.14);
}
function add(scene,proto,x,z,height,heading=0,scale=1){
 const m=proto.clone();m.position.set(x,height,z);m.rotation.y=heading;m.scale.setScalar(scale);
 scene.add(m);return m;
}
function pseudo(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// Populate the margins of real streets, keeping each vehicle travel lane clear.
export function populateStreetLife(scene,heightAt){
 const rand=pseudo(100909),stalls=[0,1,2,3].map(i=>template('stall'+i,()=>marketStall(i)));
 const benches=[template('bench',parkBench)];
 const shrubs=[0,1,2].map(i=>template('shrub'+i,()=>shrub(i)));
 const awnings=[0,1,2,3].map(i=>template('awning'+i,()=>awning(i)));
 let people=0,kiosks=0,furniture=0;
 const walkers=[];
 const recordPerson=(id,x,z,heading=0,scale=1)=>walkers.push({variant:id%12,x,z,homeX:x,homeZ:z,heading,scale,jump:0,velX:0,velZ:0,cooldown:0});
 for(let i=-4;i<=3;i++)for(let j=-4;j<=3;j++){
   const cx=i*60+30,cz=j*60+30,central=Math.abs(cx)<165&&Math.abs(cz)<165;
   // The block margins are sidewalk space, deliberately outside the 15.5m roadway.
   for(const [dx,dz] of [[-20,-20],[20,-20],[-20,20],[20,20]]){
     const x=cx+dx+(rand()-.5)*2,z=cz+dz+(rand()-.5)*2;
     if(central||rand()<.55){
       recordPerson(Math.floor(rand()*12),x,z,rand()*6.28,.87+rand()*.17);people++;
     }
   }
   if(central){
     for(let v=0;v<2;v++){
       const x=cx+(v?21:-21),z=cz+(rand()-.5)*28;
       add(scene,shrubs[(i-j+25+v)%3],x,z,heightAt(x,z),rand()*6.28);furniture++;
     }
     // Small commercial kiosks and awnings establish local identity without
     // replacing the existing navigable road network.
     if((i+j)%3===0){
       const x=cx+(rand()-.5)*12,z=cz+16;
       add(scene,stalls[(i+j+32)%4],x,z,heightAt(x,z),0);kiosks++;
       recordPerson((i-j+24)%12,x+3,z+2.6,Math.PI);people++;
     }
     if((i-j)%4===0){
       const x=cx+3,z=cz-18;
       add(scene,awnings[(i-j+32)%4],x,z,heightAt(x,z),Math.PI);furniture++;
     }
     if(rand()<.6){
       const x=cx-13,z=cz-18;
       add(scene,benches[0],x,z,heightAt(x,z),rand()*6.28);furniture++;
     }
   }
 }
 // Twelve palette-specific variants, 1 draw call each. Animation updates
 // instance matrices rather than hundreds of separate Three.js scene nodes.
 const groups=[];
 for(let variant=0;variant<12;variant++){
   const members=walkers.filter(w=>w.variant===variant);
   if(!members.length)continue;
   const source=makeVoxelPedestrian(variant);
   const mesh=new THREE.InstancedMesh(source.geometry,mat,members.length);
   mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
   mesh.frustumCulled=false;mesh.castShadow=false;
   mesh.receiveShadow=true;scene.add(mesh);
   groups.push({mesh,members});
 }
 const tmp=new THREE.Object3D();
 function update(player,dt,time){
   if(!player)return;
   const car=player.position,carSpeed=player.horizontalSpeed;
   for(const group of groups){
     for(let i=0;i<group.members.length;i++){
       const p=group.members[i],dx=p.x-car[0],dz=p.z-car[2],dist2=dx*dx+dz*dz;
       p.cooldown=Math.max(0,p.cooldown-dt);
       if(dist2<90&&carSpeed>1.6&&p.cooldown===0){
         const len=Math.sqrt(dist2)||1;
         p.velX=(dx/len||1)*8.5;p.velZ=(dz/len||.3)*8.5;
         p.jump=.0001;p.cooldown=2.7;
         p.heading=Math.atan2(p.velX,p.velZ);
       }
       let hop=0,tilt=0;
       if(p.jump>0){
         p.jump+=dt;
         const phase=Math.min(1,p.jump/.82);
         hop=Math.sin(Math.PI*phase)*2.65;
         tilt=Math.sin(Math.PI*phase)*.35;
         p.x+=p.velX*dt*(1-phase*.55);
         p.z+=p.velZ*dt*(1-phase*.55);
         if(phase>=1)p.jump=0;
       }else if(p.cooldown===0 && dist2>225){
         // Slow recovery towards a home location when the car leaves.
         p.x+=(p.homeX-p.x)*Math.min(dt*.4,1);
         p.z+=(p.homeZ-p.z)*Math.min(dt*.4,1);
       }
       tmp.position.set(p.x,heightAt(p.x,p.z)+hop,p.z);
       tmp.rotation.set(0,p.heading,tilt);
       tmp.scale.setScalar(p.scale);
       tmp.updateMatrix();group.mesh.setMatrixAt(i,tmp.matrix);
     }
     group.mesh.instanceMatrix.needsUpdate=true;
   }
 }
 update(null,0,0);
 // Set the initial instance transforms before the first playing frame.
 for(const group of groups)for(let i=0;i<group.members.length;i++){
   const p=group.members[i];
   tmp.position.set(p.x,heightAt(p.x,p.z),p.z);
   tmp.rotation.set(0,p.heading,0);tmp.scale.setScalar(p.scale);
   tmp.updateMatrix();group.mesh.setMatrixAt(i,tmp.matrix);
   group.mesh.instanceMatrix.needsUpdate=true;
 }
 return {people,kiosks,furniture,update,pedestrians:walkers};
}
