import test from 'node:test';
import assert from 'node:assert/strict';
import {routeLookahead,angleToWaypoint,smoothGuideAngle} from '../src/navigation/Guidance.js';
const near=(a,b)=>Math.abs(a-b)<.05;
test('arrow points forward (north / local -Z), not backwards',()=>{
 assert.ok(near(angleToWaypoint([0,0],[0,-20]),0));
 assert.ok(near(angleToWaypoint([0,0],[20,0]),-Math.PI/2));
 assert.ok(near(angleToWaypoint([0,0],[-20,0]),Math.PI/2));
});
test('lookahead ignores a passed waypoint and aims into next segment',()=>{
 const route=[[0,0],[0,-60],[60,-60]];
 assert.deepEqual(routeLookahead(route,[0,-40],15),[0,-55]);
 assert.ok(Math.abs(routeLookahead(route,[0,-57],15)[0]-12)<.0001);
 assert.deepEqual(routeLookahead(route,[40,-60],15),[55,-60]);
});
test('rotation wraps by shortest arc and never exceeds angular-rate limit',()=>{
 const last=179*Math.PI/180,desired=-179*Math.PI/180;
 const next=smoothGuideAngle(last,desired,1/60);
 assert.ok(next>last,'should turn by +2 degrees, not -358');
 assert.ok(Math.abs(next-last)<=1.7/60+.0001);
 const turned=smoothGuideAngle(0,Math.PI,1/60);
 assert.ok(Math.abs(turned)<.04,'no sudden half turn');
});
