import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SAVE,VEHICLES,tripReward,distance2,formatMoney} from '../src/core/config.js';

test('new game gives a taxi and zero cash',()=>{
  const s=DEFAULT_SAVE();assert.equal(s.cash,0);assert.equal(s.selected,'taxi');assert.deepEqual(s.owned,['taxi']);
});
test('different vehicle identities have unique prices and properties',()=>{
  const ids=VEHICLES.map(v=>v.id);assert.equal(new Set(ids).size,ids.length);
  assert.ok(VEHICLES.find(v=>v.id==='coupe').topSpeed > VEHICLES.find(v=>v.id==='taxi').topSpeed);
  assert.ok(VEHICLES.find(v=>v.id==='truck').wheel > VEHICLES.find(v=>v.id==='taxi').wheel);
});
test('distance fare is monotonic and formatting works',()=>{
  assert.equal(distance2([0,0],[3,4]),5);
  assert.ok(tripReward([0,0],[100,0])>tripReward([0,0],[10,0]));
  assert.equal(formatMoney(1234),'$1,234');
});
