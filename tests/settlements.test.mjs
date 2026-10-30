import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSettlementPlots,parcelClear,SETTLEMENT_ZONES} from '../src/world/Settlements.js';
test('settlements fill multiple otherwise empty regions deterministically',()=>{
 const a=generateSettlementPlots(),b=generateSettlementPlots();
 assert.deepEqual(a,b);
 assert.ok(a.length>=35,'expected meaningful density');
 assert.ok(new Set(a.map(p=>p.zone)).size>=4,'expected multiple developed regions');
 assert.equal(SETTLEMENT_ZONES.length,5);
});
test('settlements preserve roads, airport, lake and protected landmarks',()=>{
 for(const p of generateSettlementPlots())assert.ok(parcelClear(p.x,p.z,p.w,p.d),p.zone);
 assert.equal(parcelClear(444,-114,12,12),false);
 assert.equal(parcelClear(-325,335,12,12),false);
 assert.equal(parcelClear(-553,-362,12,12),false);
 assert.equal(parcelClear(-240,-240,12,12),false);
});
