import test from 'node:test';
import assert from 'node:assert/strict';
import {COAST_BOUNDS,COAST_ROAD_ANCHORS,COAST_PARCELS,validateCoastLayout} from '../src/world/CoastLayout.js';
import {landmarkById,WORLD_MANIFEST_VERSION} from '../src/world/WorldManifest.js';
import {terrainHeight} from '../src/world/SurfaceSystem.js';
test('coastal plots and road anchors do not move or overlap fixed city landmarks',()=>{
 assert.deepEqual(validateCoastLayout(),[]);
 assert.deepEqual(landmarkById('pinecrest-lodge').position,[206,470]);
 assert.equal(WORLD_MANIFEST_VERSION,1);
 assert.equal(COAST_ROAD_ANCHORS[0][0],-240);
 assert.equal(COAST_ROAD_ANCHORS[0][1],-240);
 assert.equal(COAST_PARCELS.length,3);
});
test('coastal layout stays inside current terrain and is not a physics surface yet',()=>{
 assert.ok(COAST_BOUNDS.minX>=-660&&COAST_BOUNDS.minZ>=-500);
 for(const [x,z] of COAST_ROAD_ANCHORS)assert.ok(Number.isFinite(terrainHeight(x,z)));
});
