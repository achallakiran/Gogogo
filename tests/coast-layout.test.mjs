import test from 'node:test';
import assert from 'node:assert/strict';
import {COAST_BOUNDS,COAST_ROAD_ANCHORS,COAST_PARCELS,validateCoastLayout} from '../src/world/CoastLayout.js';
import {landmarkById,WORLD_MANIFEST_VERSION} from '../src/world/WorldManifest.js';
import {coastalRoadGeometry,COAST_SAMPLES} from '../src/world/CoastalRoad.js';
import {planRoadRoute} from '../src/navigation/Route.js';
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

test('coastal road connects to the city and back',()=>{
 const goal=COAST_SAMPLES.at(-1);
 const route=planRoadRoute([0,0],[goal.x,goal.z]);
 assert.ok(route.length>10);
 assert.ok(route.some(p=>p[0]===-240&&p[1]===-240));
 assert.ok(route.some(p=>p[0]<-380&&p[1]<-290));
 assert.ok(planRoadRoute([goal.x,goal.z],[0,0]).length>10);
});
test('coastal road has finite shared geometry for render and physics',()=>{
 const data=coastalRoadGeometry();
 assert.equal(data.indices.length,data.rows*data.cols*6);
 assert.ok(data.positions.every(Number.isFinite));
});
