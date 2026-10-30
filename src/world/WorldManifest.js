// Versioned, static, authored world identifiers. These positions are frozen
// from v0.2 to protect saves, routes, and repeat visits.
export const WORLD_MANIFEST_VERSION=1;
const entries=[
  {id:'clock-square',label:'Clock Square',assetId:'landmarks/clock-square',position:[-150,150],footprint:[46,46],protected:true,
   collision:[
     {type:'box',center:[0,.4,0],size:[17,.8,17]},
     {type:'box',center:[0,10,0],size:[9.7,20,9.7]}
   ]},
  {id:'metro-terminal',label:'Metro Terminal',assetId:'landmarks/metro-terminal',position:[150,150],footprint:[50,43],protected:true,
   collision:[
     {type:'box',center:[0,.25,0],size:[37,.5,24]},
     {type:'box',center:[0,9.4,0],size:[35,1.6,18]},
     {type:'box',center:[-12,2,0],size:[4,4,4]},
     {type:'box',center:[12,2,0],size:[4,4,4]}
   ]},
  {id:'gogogo-welcome-gate',label:'Welcome Gate',assetId:'landmarks/welcome-gate',position:[0,-27],footprint:[22,4],protected:true,
   collision:[
     {type:'box',center:[-9,4.1,0],size:[1,8.2,1.2]},
     {type:'box',center:[9,4.1,0],size:[1,8.2,1.2]},
     {type:'box',center:[0,9,0],size:[19,2.4,1]}
   ]},
  {id:'sunrise-plaza',label:'Sunrise Plaza',assetId:'landmarks/sunrise-plaza',position:[30,30],footprint:[49,49],protected:true,
   collision:[
     {type:'box',center:[-15,2.8,-14],size:[.85,5.6,1.2]},
     {type:'box',center:[15,2.8,-14],size:[.85,5.6,1.2]},
     {type:'box',center:[0,6,-14],size:[32,1,2]},
     {type:'cylinder',center:[0,.55,0],radius:7,halfHeight:.55}
   ]},
  {id:'pinecrest-lodge',label:'Pinecrest Lodge',assetId:'landmarks/pinecrest-lodge',
   position:[206,470],footprint:[27,25],protected:true,collision:[
     {type:'box',center:[0,4,0],size:[16,8,12]},
     {type:'box',center:[0,8.5,0],size:[18.5,1,15]}
   ]},
  {id:'skyport-airport',label:'Skyport International',assetId:'landmarks/skyport-airport',position:[444,-114],footprint:[177,265],
   protected:true,collisionOwner:'airport-legacy',collision:[]}
];
const frozen=entries.map(e=>Object.freeze({...e,position:Object.freeze([...e.position]),
 footprint:Object.freeze([...e.footprint]),
 collision:Object.freeze((e.collision||[]).map(s=>Object.freeze({...s,center:Object.freeze([...s.center]),
 ...(s.size?{size:Object.freeze([...s.size])}:{})})))}));
export const FIXED_LANDMARKS=Object.freeze(frozen);
export const WORLD_MANIFEST=Object.freeze({version:WORLD_MANIFEST_VERSION,landmarks:FIXED_LANDMARKS});
const byId=new Map(FIXED_LANDMARKS.map(x=>[x.id,x]));
export function landmarkById(id){return byId.get(id)||null;}
// Used by future parcel generation and current building placement validation.
export function overlapsProtectedFootprint(x,z,w,d,clearance=0){
  return FIXED_LANDMARKS.some(entry=>
    Math.abs(x-entry.position[0])<(w+entry.footprint[0])/2+clearance &&
    Math.abs(z-entry.position[1])<(d+entry.footprint[1])/2+clearance);
}
export function stableParcelSeed(i,j,worldVersion=WORLD_MANIFEST_VERSION){
  let h=(2166136261^worldVersion)>>>0;
  for(const n of [i,j]){h^=n>>>0;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}
  return h>>>0;
}
export function validateWorldManifest(manifest=WORLD_MANIFEST){
 const errors=[],ids=new Set();
 for(const entry of manifest.landmarks){
   if(ids.has(entry.id))errors.push('Duplicate ID: '+entry.id);
   ids.add(entry.id);
   if(!Number.isFinite(entry.position[0])||!Number.isFinite(entry.position[1]))errors.push('Invalid position: '+entry.id);
   if(entry.footprint.some(v=>!Number.isFinite(v)||v<=0))errors.push('Invalid footprint: '+entry.id);
 }
 return errors;
}
