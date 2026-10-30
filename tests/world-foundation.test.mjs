import test from 'node:test';
import assert from 'node:assert/strict';
import {FIXED_LANDMARKS,WORLD_MANIFEST_VERSION,landmarkById,
  overlapsProtectedFootprint,stableParcelSeed,validateWorldManifest} from '../src/world/WorldManifest.js';
import {makeTerrainHeightfield,TERRAIN_COLS,TERRAIN_ROWS} from '../src/world/terrainCollider.js';
import {terrainHeight,surfaceInfoAt,createTerrainGeometry} from '../src/world/SurfaceSystem.js';
import {DEFAULT_SAVE,loadSave,STORAGE_KEY} from '../src/core/config.js';

test('all five authored areas retain their v0.2 coordinates',()=>{
 assert.deepEqual(landmarkById('clock-square').position,[-150,150]);
 assert.deepEqual(landmarkById('metro-terminal').position,[150,150]);
 assert.deepEqual(landmarkById('gogogo-welcome-gate').position,[0,-27]);
 assert.deepEqual(landmarkById('sunrise-plaza').position,[30,30]);
 assert.deepEqual(landmarkById('skyport-airport').position,[444,-114]);
 assert.deepEqual(landmarkById('pinecrest-lodge').position,[206,470]);
 assert.equal(FIXED_LANDMARKS.length,6);
 assert.equal(WORLD_MANIFEST_VERSION,1);
 assert.deepEqual(validateWorldManifest(),[]);
});
test('reserved parcels exclude overlap but leave ordinary blocks free',()=>{
 for(const item of FIXED_LANDMARKS){
   assert.equal(overlapsProtectedFootprint(...item.position,1,1),true,item.id);
 }
 assert.equal(overlapsProtectedFootprint(-90,-90,10,10),false);
 assert.equal(stableParcelSeed(2,3),stableParcelSeed(2,3));
 assert.notEqual(stableParcelSeed(2,3),stableParcelSeed(3,2));
});
test('visible terrain vertices and physics heights are generated from identical samples',()=>{
 const sampled=makeTerrainHeightfield(terrainHeight);
 const geo=createTerrainGeometry(sampled);
 const pos=geo.getAttribute('position');
 assert.equal(pos.count,(TERRAIN_COLS+1)*(TERRAIN_ROWS+1));
 for(let row=0;row<=TERRAIN_ROWS;row+=5)
   for(let col=0;col<=TERRAIN_COLS;col+=6){
     const at=row*(TERRAIN_COLS+1)+col;
     const fromCollider=sampled.heights[col*(TERRAIN_ROWS+1)+row];
     assert.ok(Math.abs(pos.getY(at)-fromCollider)<1e-5,`Mismatch cell ${col},${row}`);
   }
 geo.dispose();
});
test('city and airport roads share named surface classification',()=>{
 assert.equal(surfaceInfoAt(0,0).type,'asphalt');
 assert.equal(surfaceInfoAt(360,-120).type,'asphalt');
 assert.equal(surfaceInfoAt(355,-123).type,'asphalt');
 assert.equal(surfaceInfoAt(30,30).type,'terrain');
 assert.ok(Number.isFinite(surfaceInfoAt(460,-150).height));
});
test('saved-game version and storage key remain compatible',()=>{
 assert.equal(STORAGE_KEY,'voxel-city-driver:v1');
 assert.equal(DEFAULT_SAVE().version,1);
 const oldSave={version:1,selected:'taxi',owned:['taxi'],
  cash:1850,earned:3200,trips:9,position:[17,2,-82],heading:1.2,
  settings:{camera:'hood',roadGuides:false}};
 const oldStorage=globalThis.localStorage;
 globalThis.localStorage={getItem:()=>JSON.stringify(oldSave)};
 try{
  const recovered=loadSave();
  assert.equal(recovered.cash,1850);
  assert.equal(recovered.trips,9);
  assert.deepEqual(recovered.position,[17,2,-82]);
  assert.equal(recovered.heading,1.2);
  assert.equal(recovered.settings.camera,'hood');
  assert.equal(recovered.settings.roadGuides,false);
 }finally{
  if(oldStorage===undefined)delete globalThis.localStorage;
  else globalThis.localStorage=oldStorage;
 }
});

test('mountain route is continuous, rising, and leaves landmark plots intact',async()=>{
  const {MOUNTAIN_SAMPLES,MOUNTAIN_CONTROL_POINTS}=await import('../src/world/MountainData.js');
  const {planRoadRoute}=await import('../src/navigation/Route.js');
  assert.ok(MOUNTAIN_SAMPLES.length>100);
  assert.equal(MOUNTAIN_CONTROL_POINTS[0][0],120);
  for(let i=1;i<MOUNTAIN_SAMPLES.length;i++){
    const a=MOUNTAIN_SAMPLES[i-1],b=MOUNTAIN_SAMPLES[i];
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<6,'No road discontinuities');
    assert.ok(Math.abs(a.y-b.y)<2,'No vertical ledges');
    assert.ok(Number.isFinite(terrainHeight(a.x,a.z)));
  }
  assert.ok(MOUNTAIN_SAMPLES.at(-1).y>25);
  const path=planRoadRoute([120,230],[206,460]);
  assert.ok(path.length>=6,'Hill route must use several actual road waypoints');
  assert.ok(path.some(([x,z])=>x===120&&z===272),'Must connect through mountain road entry');
  assert.ok(path.some(p=>p[1]>=400),'Mountain road must connect to city navigation');
});

test('biome colors are deterministic and permanent urban landmarks retain their base color',async()=>{
 const {biomeTypeAt,terrainTintAt,colorizeTerrain,populateBiomeScenery}=await import('../src/world/BiomeScenery.js');
 const {makeTerrainHeightfield}=await import('../src/world/terrainCollider.js');
 const {createTerrainGeometry}=await import('../src/world/SurfaceSystem.js');
 assert.equal(biomeTypeAt(0,0),'city');
 assert.equal(biomeTypeAt(180,380),'alpine');
 assert.equal(biomeTypeAt(-350,380),'valley');
 assert.equal(terrainTintAt(120,300).getHex(),terrainTintAt(120,300).getHex());
 const geo=colorizeTerrain(createTerrainGeometry(makeTerrainHeightfield(terrainHeight)));
 const colors=geo.getAttribute('color');
 assert.equal(colors.count,geo.getAttribute('position').count);
 assert.ok([...colors.array].every(Number.isFinite));
 geo.dispose();
});

test('mountain collider duplicates actual visible terrain triangles without inventing elevations',async()=>{
 const {buildMountainCollisionTriangles}=await import('../src/world/MountainSurfacePatch.js');
 const {makeTerrainHeightfield}=await import('../src/world/terrainCollider.js');
 const {createTerrainGeometry}=await import('../src/world/SurfaceSystem.js');
 const terrain=createTerrainGeometry(makeTerrainHeightfield(terrainHeight));
 const data=buildMountainCollisionTriangles(terrain);
 assert.ok(data.triangles>1000&&data.triangles<terrain.getIndex().count/3);
 assert.ok(data.indices.every(i=>i<terrain.getAttribute('position').count));
 assert.equal(data.positions,terrain.getAttribute('position').array);
 terrain.dispose();
});
