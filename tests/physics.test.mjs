import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTerrainHeightfield,TERRAIN_WIDTH,TERRAIN_DEPTH,TERRAIN_COLS,TERRAIN_ROWS} from '../src/world/terrainCollider.js';

test('terrain collider heights are finite, correctly sized, and sample center', () => {
  const data = makeTerrainHeightfield((x,z)=>x*.001 + z*.002);
  assert.equal(data.heights.length, (data.nrows+1)*(data.ncols+1));
  assert.ok(data.heights.every(Number.isFinite));
  const center = Math.round(data.ncols/2)*(data.nrows+1)+Math.round(data.nrows/2);
  assert.ok(Math.abs(data.heights[center]) < .02);
});

test('terrain heightfield has no invalid sample values at varying elevations', () => {
  const d=makeTerrainHeightfield((x,z)=>Math.sin(x*.014)*2 + Math.cos(z*.01)*3);
  assert.equal(d.nrows,TERRAIN_ROWS);
  assert.equal(d.ncols,TERRAIN_COLS);
  assert.ok(d.heights.every(Number.isFinite));
  assert.ok(Math.max(...d.heights)-Math.min(...d.heights)>4);
});

test('airport runway, apron, approach and airport taxi road fit inside the real physics floor',()=>{
  assert.ok(TERRAIN_WIDTH/2>516+100);
  assert.ok(TERRAIN_DEPTH/2>243+100);
  const d=makeTerrainHeightfield(()=>0);
  assert.deepEqual(d.scale,{x:TERRAIN_WIDTH,y:1,z:TERRAIN_DEPTH});
  for(const [x,z] of [[0,0],[492,-117],[444,-220],[370,-125],[417,-55],[516,-240],[560,-100]]){
    assert.ok(Math.abs(x)<d.scale.x/2&&Math.abs(z)<d.scale.z/2,`Ground must cover ${x},${z}`);
  }
});
