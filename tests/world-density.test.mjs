import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneryPlacementAllowed} from '../src/world/WorldDensity.js';
import {COAST_SAMPLES} from '../src/world/CoastalRoad.js';
test('large scenery never occupies the drivable coastal ribbon',()=>{
 for(const p of COAST_SAMPLES)assert.equal(sceneryPlacementAllowed(p.x,p.z,'large'),false);
});
test('protected city landmarks and coastal parcels remain free of new scenery',()=>{
 assert.equal(sceneryPlacementAllowed(-553,-362,'large'),false);
 assert.equal(sceneryPlacementAllowed(-459,-374,'large'),false);
 assert.equal(sceneryPlacementAllowed(206,470,'large'),false);
});
