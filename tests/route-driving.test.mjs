import test from 'node:test';
import assert from 'node:assert/strict';
import {planRoadRoute,getNextTurn,nearestNode,GRID} from '../src/navigation/Route.js';
import {REVERSE_LIMIT,longitudinalAcceleration} from '../src/vehicles/DrivingDynamics.js';
const spec={accel:29,brake:39,topSpeed:52};
test('rapid throttle builds more acceleration than previous config',()=>{
  assert.ok(longitudinalAcceleration({gas:true,brake:false},0,spec)>40);
  assert.equal(longitudinalAcceleration({gas:true},52,spec),0);
});
test('brake slows forward travel, then reverses without another button',()=>{
  assert.ok(longitudinalAcceleration({brake:true},20,spec)<0);
  assert.ok(longitudinalAcceleration({brake:true},0,spec)<0);
  assert.equal(longitudinalAcceleration({brake:true},-REVERSE_LIMIT-1,spec),0);
  assert.ok(longitudinalAcceleration({gas:true},-4,spec)>0);
});
test('city road route only uses grid intersections and connected airport spur',()=>{
  const route=planRoadRoute([0,2],[355,-123]);
  assert.ok(route.length>=3);
  assert.deepEqual(route.at(-1),[355,-123]);
  assert.ok(route.some(([x,z])=>x===300&&z===-120));
  assert.ok(route.some(([x,z])=>x===360&&z===-120));
});
test('navigation reads left/right relative to a north-facing player',()=>{
  let hint=getNextTurn([0,0],[[30,-30]],0);
  assert.equal(hint.direction,'RIGHT');
});
