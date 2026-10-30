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
  // The planner simplifies collinear segments: a [240,-120] -> [360,-120]
  // route passes through 300 even if 300 is not retained as a waypoint.
  assert.ok(route.some(([x,z])=>x===240&&z===-120));
  assert.ok(route.some(([x,z])=>x===360&&z===-120));
});
test('navigation reads left/right relative to a north-facing player',()=>{
  let hint=getNextTurn([0,0],[[30,-30]],0);
  assert.equal(hint.direction,'RIGHT');
});

test('route HUD shows ARRIVED at a passenger rather than U-TURN',()=>{
 const route=planRoadRoute([0,0],[5,-75]);
 const hint=getNextTurn([5,-75],route,Math.PI);
 assert.equal(hint.direction,'ARRIVED');
 assert.equal(hint.remaining,0);
});
