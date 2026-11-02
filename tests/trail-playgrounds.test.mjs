import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainHeight,surfaceInfoAt} from '../src/world/SurfaceSystem.js';
import {sceneryPlacementAllowed} from '../src/world/WorldDensity.js';
test('rough terrain sites have physical elevation relief',()=>{
 const hills=[[-311,74],[300,174],[127,-314],[-91,312]];
 for(const [x,z] of hills){
   const center=terrainHeight(x,z),outer=terrainHeight(x+65,z);
   assert.ok(Number.isFinite(center)&&Number.isFinite(outer));
   assert.ok(Math.abs(center-outer)>.5,'Rough district must have noticeable physical relief');
 }
 assert.equal(surfaceInfoAt(0,0).terrainKind,'asphalt');
 assert.equal(surfaceInfoAt(360,-120).terrainKind,'asphalt');
});
test('trail terrain can be placed outside protected parcels',()=>{
 assert.ok(sceneryPlacementAllowed(-311,74,'large'));
});
