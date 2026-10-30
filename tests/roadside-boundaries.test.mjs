import test from 'node:test';
import assert from 'node:assert/strict';
import {roadsideSegments,ROAD_EDGE_PROFILES} from '../src/world/RoadsideBoundaries.js';
import {overlapsProtectedFootprint} from '../src/world/WorldManifest.js';
test('roadside boundaries cover coastal, country and city regions',()=>{
 const segments=roadsideSegments();
 for(const kind of ['coast','country','city'])assert.ok(segments.some(s=>s.kind===kind),kind);
 assert.ok(segments.every(s=>[s.x,s.y,s.z,s.angle,s.length,s.height].every(Number.isFinite)));
});
test('boundaries respect protected landmarks and keep open gaps',()=>{
 const segments=roadsideSegments();
 for(const s of segments)assert.equal(overlapsProtectedFootprint(s.x,s.z,s.kind==='city'?14:7,s.kind==='city'?5:4,5),false);
 assert.ok(ROAD_EDGE_PROFILES.coast.offset>8);
 assert.ok(segments.length<500);
});
