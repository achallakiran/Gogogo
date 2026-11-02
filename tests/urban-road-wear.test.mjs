import test from 'node:test';
import assert from 'node:assert/strict';
import {ROAD_WEAR_SITES,roadWearProfile,roadWearHeight} from '../src/world/UrbanRoadWear.js';
import {terrainHeight} from '../src/world/SurfaceSystem.js';
test('seven road-wear sites form actual raised and dented geometry',()=>{
 assert.ok(ROAD_WEAR_SITES.length>=7);
 for(const site of ROAD_WEAR_SITES){
  const rim=roadWearHeight(site,site.x+1.9,site.z);
  const hole=roadWearHeight(site,site.x+.7,site.z-.45);
  assert.ok(rim>hole+.08,'Road crater must physically dip below the raised rim');
  assert.ok(hole>terrainHeight(site.x+.7,site.z-.45)+.10,'No road gap beneath the crater');
  assert.ok(roadWearProfile(site,site.x,site.z).fade>.5);
 }
});
