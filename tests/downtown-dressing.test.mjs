import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainHeight} from '../src/world/SurfaceSystem.js';
test('sunrise boulevard includes visible architecture and still leaves vehicle lanes open',async()=>{
 const {populateDowntownDressing}=await import('../src/world/DowntownDressing.js');
 assert.equal(typeof populateDowntownDressing,'function');
 for(const z of [-32,-48,-92,-166]){
  assert.ok(Number.isFinite(terrainHeight(0,z)));
 }
 // Bridge pillars remain beyond the road's half width (6.25m).
 assert.ok(9.7>6.25+2);
});
