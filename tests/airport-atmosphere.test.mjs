import test from 'node:test';import assert from 'node:assert/strict';import {AIRPORT,PICKUPS} from '../src/core/config.js';
test('taxi curbside drop-off remains at the actual airport road',()=>{assert.deepEqual(AIRPORT.pos,[380,-120]);assert.ok(PICKUPS.some(p=>p.label==='Coral Bay Beach'));});
