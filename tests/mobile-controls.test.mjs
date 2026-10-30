import test from 'node:test';
import assert from 'node:assert/strict';
import {steeringYawRate} from '../src/vehicles/Steering.js';
import {svgIcon} from '../src/ui/icons.js';
test('right steering is negative yaw toward right when nose points -Z',()=>assert.ok(steeringYawRate(1,1,1,12)<0));
test('left steering is positive yaw toward left when nose points -Z',()=>assert.ok(steeringYawRate(-1,1,1,12)>0));
test('reversing changes steering yaw direction',()=>assert.ok(steeringYawRate(1,1,1,-12)>0));
test('no input means no yaw',()=>assert.equal(steeringYawRate(0,1,1,12),0));
test('all mobile icons are vector-only, with no emoji or text',()=>{
  for(const name of ['left','right','gas','brake','camera','pause','fullscreen','passenger']){
    const svg=svgIcon(name);
    assert.ok(svg.startsWith('<svg')&&svg.includes('aria-hidden="true"'));
    assert.equal(/\p{Extended_Pictographic}/u.test(svg),false);
  }
});
