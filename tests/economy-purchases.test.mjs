import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SAVE,VEHICLES,purchaseVehicle,loadSave,saveGame,STORAGE_KEY} from '../src/core/config.js';

test('purchase atomically deducts money, grants ownership and selects vehicle',()=>{
  const before={...DEFAULT_SAVE(),cash:1800};
  const result=purchaseVehicle(before,'coupe');
  assert.equal(result.ok,true);
  assert.equal(result.save.cash,200);
  assert.equal(result.save.selected,'coupe');
  assert.deepEqual(result.save.owned,['taxi','coupe']);
  assert.equal(before.cash,1800,'Original save must not be mutated');
  assert.deepEqual(before.owned,['taxi']);
  assert.equal(result.save.colors.coupe,VEHICLES.find(v=>v.id==='coupe').color);
});
test('cannot double purchase, buy starter taxi or overspend',()=>{
  const start={...DEFAULT_SAVE(),cash:1600};
  const first=purchaseVehicle(start,'coupe');
  assert.equal(purchaseVehicle(first.save,'coupe').ok,false);
  assert.equal(purchaseVehicle(start,'taxi').ok,false);
  assert.equal(purchaseVehicle(start,'truck').reason,'funds');
  assert.equal(purchaseVehicle(start,'nonexistent').reason,'unknown');
  assert.equal(first.save.cash,0);
});
test('purchase during active mission preserves selected car',()=>{
  const result=purchaseVehicle({...DEFAULT_SAVE(),cash:3000},'suv',{select:false});
  assert.equal(result.save.selected,'taxi');
  assert.ok(result.save.owned.includes('suv'));
});
test('v1 saves retain purchased cars, wallet, colors and vehicle on reload',()=>{
  const old=globalThis.localStorage;
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  try{
    const save=purchaseVehicle({...DEFAULT_SAVE(),cash:2000},'coupe').save;
    assert.equal(saveGame(save),true);
    const reread=loadSave();
    assert.equal(reread.cash,400);
    assert.deepEqual(reread.owned,['taxi','coupe']);
    assert.equal(reread.selected,'coupe');
    assert.equal(values.has(STORAGE_KEY),true);
  }finally{globalThis.localStorage=old;}
});
test('unavailable storage reports failure without silently pretending to save',()=>{
  const old=globalThis.localStorage;
  globalThis.localStorage={setItem(){throw new Error('Storage disabled');}};
  const warn=console.warn;console.warn=()=>{};
  try{assert.equal(saveGame(DEFAULT_SAVE()),false);}
  finally{globalThis.localStorage=old;console.warn=warn;}
});
