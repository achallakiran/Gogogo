// Common five-vehicle traction model. Surface transitions affect real physics.
export function terrainDriveProfile(surface,spec){
  const kind=surface?.terrainKind||surface?.type||'asphalt';
  const isTruck=spec.id==='truck',isSUV=spec.id==='suv';
  const ability=isTruck?1:isSUV?.7:spec.id==='van'?.32:.10;
  const profiles={
    asphalt:{traction:1,rolling:.22,speedRatio:1},
    gravel:{traction:.66,rolling:1.6,speedRatio:.65},
    dirt:{traction:.59,rolling:1.9,speedRatio:.59},
    grass:{traction:.47,rolling:2.4,speedRatio:.52},
    mud:{traction:.31,rolling:4.1,speedRatio:.35},
    rock:{traction:.57,rolling:2.75,speedRatio:.48}
  };
  const base=profiles[kind]||profiles.grass;
  const offroad=kind!=='asphalt';
  return {
    kind,traction:Math.min(1,base.traction+(offroad?.25*ability:0)),
    rolling:base.rolling*(1-(offroad?.50*ability:0)),
    speedRatio:Math.min(1,base.speedRatio+(offroad?.36*ability:0))
  };
}
export function safeImpactDamage(speed,condition=100){
  if(!Number.isFinite(speed)||speed<7)return 0;
  // A light nudge is forgivable; fast collisions demand an expensive repair.
  return Math.min(36,Math.round((speed-6)*1.1+Math.max(0,100-condition)*.018));
}
export function safeRepairCost(condition,spec){
  const damage=Math.max(0,100-Math.min(100,Number.isFinite(condition)?condition:100));
  return Math.ceil(damage*(spec.price>2500?5:spec.price>0?4:3));
}
