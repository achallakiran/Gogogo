import test from 'node:test';
import assert from 'node:assert/strict';
import {POTHOLES,DAMAGE_SECTION,craterAt,roadDamageHeight,roadDamageGeometry} from '../src/world/RoadDamage.js';
import {terrainHeight} from '../src/world/SurfaceSystem.js';
test('irregular potholes visibly and physically sit below road rim',()=>{
 assert.equal(POTHOLES.length,3);
 for(const hole of POTHOLES){
  const low=roadDamageHeight(hole.x,hole.z);
  const rim=roadDamageHeight(hole.x+hole.rx*1.7,hole.z);
  assert.ok(rim-low>.10,'must have measurable real depth');
  assert.ok(low>terrainHeight(hole.x,hole.z),'bottom must remain supported');
  const radial=[0,1,2,3,4,5,6,7].map(i=>{
   const a=i*Math.PI/4;let lowR=0,highR=1.6;
   for(let n=0;n<20;n++){
    const mid=(lowR+highR)/2;
    if(craterAt(hole.x+hole.rx*Math.cos(a)*mid,hole.z+hole.rz*Math.sin(a)*mid).depth>.01)lowR=mid;
    else highR=mid;
   }
   return lowR;
  });
  assert.ok(Math.max(...radial)-Math.min(...radial)>.10,'outline cannot be circular');
 }
});
test('safe blended asphalt transitions with no sharp launch lip',()=>{
 const {x,z,width,length}=DAMAGE_SECTION;
 for(const edgeZ of [z-length/2,z+length/2]){
  for(let i=0;i<=20;i++){
   const atX=x-width/2+width*i/20;
   assert.ok(Math.abs(roadDamageHeight(atX,edgeZ)-terrainHeight(atX,edgeZ)-.103)<.00001);
  }
 }
 let slope=0;
 for(let zz=z-length/2;zz<z+length/2-.25;zz+=.25){
  slope=Math.max(slope,Math.abs(roadDamageHeight(x,zz+.25)-roadDamageHeight(x,zz))/.25);
 }
 assert.ok(slope<.36,'No launch ramp: '+slope);
});
test('one deterministic triangle set supplies both render and collider',()=>{
 const a=roadDamageGeometry(),b=roadDamageGeometry();
 assert.deepEqual(a.positions,b.positions);
 assert.deepEqual(a.indices,b.indices);
 assert.equal(a.indices.length,a.cols*a.rows*6);
 assert.ok(a.positions.every(Number.isFinite));
 assert.ok(a.indices.every(i=>i<a.positions.length/3));
 const [i,j,k]=a.indices;
 const ux=a.positions[j*3]-a.positions[i*3],uz=a.positions[j*3+2]-a.positions[i*3+2];
 const vx=a.positions[k*3]-a.positions[i*3],vz=a.positions[k*3+2]-a.positions[i*3+2];
 assert.ok(uz*vx-ux*vz>0,'triangle front face points upward');
});

test('damaged-road edge stays just above ordinary asphalt and below lane markings',()=>{
 const h=roadDamageHeight(DAMAGE_SECTION.x,DAMAGE_SECTION.z-DAMAGE_SECTION.length/2);
 const base=terrainHeight(DAMAGE_SECTION.x,DAMAGE_SECTION.z-DAMAGE_SECTION.length/2);
 assert.ok(h-base>.087&&h-base<.116);
});
