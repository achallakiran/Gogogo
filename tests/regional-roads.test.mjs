import test from 'node:test';
import assert from 'node:assert/strict';
import {REGIONAL_ROADS,COUNTRY_ROUTE_POINTS,regionalRoadGeometry} from '../src/world/RegionalRoads.js';
import {suspensionAcceleration} from '../src/vehicles/Suspension.js';
import {terrainHeight} from '../src/world/SurfaceSystem.js';

test('two alpine road sections and one countryside route have stable coordinates',()=>{
 assert.deepEqual(REGIONAL_ROADS.map(x=>x.id),['alpine-worn','alpine-eroded','valley-track']);
 assert.deepEqual(COUNTRY_ROUTE_POINTS[0],[-240,240]);
 assert.deepEqual(COUNTRY_ROUTE_POINTS.at(-1),[-387,368]);
 assert.equal(REGIONAL_ROADS.reduce((n,r)=>n+r.potholes.length,0),7);
});
test('regional road triangles are deterministic, upward facing and stay above terrain',()=>{
 for(const section of REGIONAL_ROADS){
  const d=regionalRoadGeometry(section),next=regionalRoadGeometry(section);
  assert.deepEqual(d.positions,next.positions);
  assert.deepEqual(d.indices,next.indices);
  assert.ok(d.indices.length>100);
  assert.ok(d.positions.every(Number.isFinite));
  assert.ok(d.holes.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
  for(let i=0;i<d.positions.length;i+=3){
   const x=d.positions[i],y=d.positions[i+1],z=d.positions[i+2];
   assert.ok(y>terrainHeight(x,z)-.001,'Road should not hide below the terrain');
  }
  const a=d.indices[0]*3,b=d.indices[1]*3,c=d.indices[2]*3;
  const ux=d.positions[b]-d.positions[a],uz=d.positions[b+2]-d.positions[a+2];
  const vx=d.positions[c]-d.positions[a],vz=d.positions[c+2]-d.positions[a+2];
  assert.ok(uz*vx-ux*vz>0,'Triangles should face upward');
 }
});
test('spring assist is compressive and damped instead of launching vehicles',()=>{
 assert.equal(suspensionAcceleration(1.55,0),0);
 assert.ok(suspensionAcceleration(1.2,0)>0);
 assert.ok(suspensionAcceleration(1.2,2)<suspensionAcceleration(1.2,0));
 assert.ok(suspensionAcceleration(1.2,-2)>suspensionAcceleration(1.2,0));
 assert.ok(suspensionAcceleration(.1,-50)<=5);
 assert.equal(suspensionAcceleration(NaN,0),0);
});
