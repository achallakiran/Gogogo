// The arrow follows the nearest point AHEAD on a road route, never a passed node.
export function routeLookahead(route,position,lookahead=24){
 if(!Array.isArray(route)||!route.length)return null;
 if(route.length===1)return [...route[0]];
 let best={distance2:Infinity,index:0,t:0};
 for(let i=0;i<route.length-1;i++){
  const a=route[i],b=route[i+1],dx=b[0]-a[0],dz=b[1]-a[1],d2=dx*dx+dz*dz;
  if(d2<.0001)continue;
  const t=Math.max(0,Math.min(1,((position[0]-a[0])*dx+(position[1]-a[1])*dz)/d2));
  const x=a[0]+dx*t,z=a[1]+dz*t,distance2=(x-position[0])**2+(z-position[1])**2;
  if(distance2<best.distance2)best={distance2,index:i,t};
 }
 let d=Math.max(3,lookahead);
 for(let i=best.index;i<route.length-1;i++){
  const a=route[i],b=route[i+1],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  if(length<.0001)continue;
  const start=i===best.index?best.t:0;
  if(d<=length*(1-start))return [a[0]+dx*(start+d/length),a[1]+dz*(start+d/length)];
  d-=length*(1-start);
 }
 return [...route.at(-1)];
}
export function angleToWaypoint(position,waypoint){
 const dx=waypoint[0]-position[0],dz=waypoint[1]-position[1];
 return Math.atan2(-dx,-dz); // Local -Z points forward.
}
export function smoothGuideAngle(from,to,dt,turnRate=1.7){
 if(!Number.isFinite(from))return to;
 const frame=Math.max(0,Math.min(.07,dt));
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 const move=delta*(1-Math.exp(-3.2*frame));
 return from+Math.max(-frame*turnRate,Math.min(frame*turnRate,move));
}
