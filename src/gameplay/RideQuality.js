import {terrainDriveProfile} from '../vehicles/DrivingFeel.js';
export const clampMeter=n=>Math.max(0,Math.min(100,Number.isFinite(n)?n:100));
export function rideQualityAfterStep(happiness,{speed=0,yawRate=0,verticalSpeed=0,surface=null,vehicle=null}={},dt=1/60){
  const terrain=vehicle?terrainDriveProfile(surface,vehicle):{kind:'asphalt'};
  const rough={asphalt:0,gravel:1.3,dirt:1.7,grass:2.0,rock:3.2,mud:3.7}[terrain.kind]||0;
  const speedPenalty=Math.max(0,speed-24)*.18;
  const turnPenalty=Math.max(0,Math.abs(yawRate)*Math.max(speed,0)-4)*.16;
  const bouncePenalty=Math.max(0,Math.abs(verticalSpeed)-2.4)*.5;
  const rate=rough+speedPenalty+turnPenalty+bouncePenalty;
  return clampMeter(happiness-rate*Math.max(0,dt));
}
export function creditedFare(baseFare,happiness=100,condition=100){
  const quality=.45+.55*clampMeter(happiness)/100;
  const vehicle=.90+.10*clampMeter(condition)/100;
  return Math.max(0,Math.round(baseFare*quality*vehicle));
}
export function applyImpact(condition,happiness,damage){
  const amount=Math.max(0,Math.min(100,Number.isFinite(damage)?damage:0));
  return {condition:clampMeter(condition-amount),happiness:clampMeter(happiness-amount*1.6)};
}
