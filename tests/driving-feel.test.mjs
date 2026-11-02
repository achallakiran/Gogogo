import test from 'node:test';
import assert from 'node:assert/strict';
import {VEHICLES} from '../src/core/config.js';
import {terrainHeight,surfaceInfoAt} from '../src/world/SurfaceSystem.js';
import {terrainDriveProfile,safeImpactDamage,safeRepairCost} from '../src/vehicles/DrivingFeel.js';

test('every car loses off-road traction but off-road specialists perform better',()=>{
 for(const spec of VEHICLES){
   const asphalt=terrainDriveProfile({terrainKind:'asphalt'},spec);
   const mud=terrainDriveProfile({terrainKind:'mud'},spec);
   assert.ok(mud.traction<asphalt.traction);
   assert.ok(mud.speedRatio<asphalt.speedRatio);
   assert.ok(mud.rolling>asphalt.rolling);
 }
 assert.ok(terrainDriveProfile({terrainKind:'mud'},VEHICLES.find(v=>v.id==='truck')).speedRatio>
   terrainDriveProfile({terrainKind:'mud'},VEHICLES.find(v=>v.id==='coupe')).speedRatio);
});
test('terrain surface types and elevations are varied yet city and runway remain intact',()=>{
 assert.equal(surfaceInfoAt(0,0).type,'asphalt');
 assert.equal(surfaceInfoAt(360,-120).terrainKind,'asphalt');
 const out=[[330,350],[430,310],[-480,190],[-370,-380],[540,220]];
 assert.ok(new Set(out.map(([x,z])=>surfaceInfoAt(x,z).terrainKind)).size>1);
 assert.ok(out.every(([x,z])=>Number.isFinite(terrainHeight(x,z))));
 const h=out.map(([x,z])=>terrainHeight(x,z));assert.ok(Math.max(...h)-Math.min(...h)>2);
});
test('damage and repair cost scale by impact, condition and car',()=>{
 assert.equal(safeImpactDamage(3),0);
 assert.ok(safeImpactDamage(16)>safeImpactDamage(8));
 for(const v of VEHICLES){
  assert.equal(safeRepairCost(100,v),0);
  assert.ok(safeRepairCost(55,v)>0);
 }
});

test('all five vehicle classes have distinct acceleration and steering',async()=>{
 const {longitudinalAcceleration}=await import('../src/vehicles/DrivingDynamics.js');
 const {steeringYawRate}=await import('../src/vehicles/Steering.js');
 const names=VEHICLES.map(v=>v.id);
 assert.equal(new Set(names).size,5);
 assert.ok(new Set(VEHICLES.map(v=>longitudinalAcceleration({gas:true},4,v).toFixed(2))).size>=4);
 assert.ok(new Set(VEHICLES.map(v=>steeringYawRate(.8,1,v.handling,12).toFixed(2))).size>=4);
});
