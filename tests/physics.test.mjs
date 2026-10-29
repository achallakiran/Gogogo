import test from 'node:test';
import assert from 'node:assert/strict';
import * as RAPIER from '@dimforge/rapier3d-compat';
import {makeTerrainHeightfield, attachTerrainCollider} from '../src/world/terrainCollider.js';

test('terrain collider heights are finite, correctly sized, and sample center', () => {
  const data = makeTerrainHeightfield((x,z)=>x*.001 + z*.002);
  assert.equal(data.heights.length, (data.nrows+1)*(data.ncols+1));
  assert.ok(data.heights.every(Number.isFinite));
  const center = Math.round(data.ncols/2)*(data.nrows+1)+Math.round(data.nrows/2);
  assert.ok(Math.abs(data.heights[center]) < .02);
});

test('real Rapier WASM creates and simulates the heightfield without a trap', async () => {
  await RAPIER.init();
  const world = new RAPIER.World({x:0,y:-9.81,z:0});
  attachTerrainCollider(world,RAPIER,(x,z)=>Math.sin(x*.01)*.1 + Math.cos(z*.01)*.1);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,3,0));
  world.createCollider(RAPIER.ColliderDesc.ball(.5),body);
  for(let i=0;i<90;i++) world.step();
  const y=body.translation().y;
  assert.ok(Number.isFinite(y) && y>.2 && y<3,`expected falling body to settle above terrain; y=${y}`);
  world.free();
});
