import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SAVE,VEHICLES,purchaseVehicle,loadSave,saveGame} from '../src/core/config.js';
import {rideQualityAfterStep,creditedFare,applyImpact} from '../src/gameplay/RideQuality.js';
test('passenger happiness drops with violent driving, fast corners and rocky ground',()=>{
 const car=VEHICLES[0];const nice=rideQualityAfterStep(100,{speed:8,surface:{terrainKind:'asphalt'},vehicle:car},1);
 const rough=rideQualityAfterStep(100,{speed:35,yawRate:1,verticalSpeed:6,surface:{terrainKind:'rock'},vehicle:car},1);
 assert.equal(nice,100);assert.ok(rough<90);
});
test('happiness and vehicle condition alter fare without paying twice',()=>{
 assert.equal(creditedFare(1000,100,100),1000);
 assert.ok(creditedFare(1000,40,100)<creditedFare(1000,85,100));
 assert.ok(creditedFare(1000,60,30)<creditedFare(1000,60,100));
 assert.ok(creditedFare(1000,-500,-5)>=0);
});
test('collision penalizes both vehicle and current passenger happiness',()=>{
 const x=applyImpact(90,85,21);assert.equal(x.condition,69);assert.ok(x.happiness<55);
 assert.deepEqual(applyImpact(0,0,1000),{condition:0,happiness:0});
});
test('legacy saves retain full health and purchases initialize vehicle health',()=>{
 const old=globalThis.localStorage;const store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 try{
  const legacy=DEFAULT_SAVE();delete legacy.condition;saveGame(legacy);
  const repaired=loadSave();assert.equal(repaired.condition.taxi,100);
  const bought=purchaseVehicle({...repaired,cash:1700},'coupe');
  assert.equal(bought.save.condition.coupe,100);
  bought.save.condition.coupe=30;saveGame(bought.save);
  assert.equal(loadSave().condition.coupe,30);
 }finally{globalThis.localStorage=old;}
});
