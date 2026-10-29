import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTerrainHeightfield} from '../src/world/terrainCollider.js';

test('terrain collider heights are finite, correctly sized, and sample center', () => {
  const data = makeTerrainHeightfield((x,z)=>x*.001 + z*.002);
  assert.equal(data.heights.length, (data.nrows+1)*(data.ncols+1));
  assert.ok(data.heights.every(Number.isFinite));
  const center = Math.round(data.ncols/2)*(data.nrows+1)+Math.round(data.nrows/2);
  assert.ok(Math.abs(data.heights[center]) < .02);
});

test('terrain heightfield has no invalid sample values at varying elevations', () => {
  const d=makeTerrainHeightfield((x,z)=>Math.sin(x*.014)*2 + Math.cos(z*.01)*3);
  assert.equal(d.nrows,74);
  assert.equal(d.ncols,90);
  assert.ok(d.heights.every(Number.isFinite));
  assert.ok(Math.max(...d.heights)-Math.min(...d.heights)>4);
});
