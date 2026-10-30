// Reserved, deterministic Coral Bay coastal corridor. Layout-only P0 stage:
// no geometry, terrain deformation, or save/landmark mutation.
import {FIXED_LANDMARKS} from './WorldManifest.js';
export const COAST_BOUNDS=Object.freeze({minX:-620,maxX:-330,minZ:-460,maxZ:-230});
export const COAST_ROAD_ANCHORS=Object.freeze([
 [-240,-240],[-275,-253],[-310,-269],[-349,-289],[-386,-310],
 [-421,-325],[-456,-339],[-490,-340]
].map(p=>Object.freeze(p)));
export const COAST_PARCELS=Object.freeze([
 {id:'coral-bay-lighthouse',position:[-553,-362],footprint:[19,19]},
 {id:'coral-bay-pier',position:[-519,-309],footprint:[23,45]},
 {id:'coral-bay-market',position:[-459,-374],footprint:[44,28]}
].map(p=>Object.freeze({...p,position:Object.freeze(p.position),footprint:Object.freeze(p.footprint)})));
export function rectanglesOverlap(a,b,clearance=0){
 return Math.abs(a.position[0]-b.position[0])<(a.footprint[0]+b.footprint[0])/2+clearance&&
 Math.abs(a.position[1]-b.position[1])<(a.footprint[1]+b.footprint[1])/2+clearance;
}
export function validateCoastLayout(){
 const errors=[];
 for(const p of COAST_ROAD_ANCHORS){
  if(!p.every(Number.isFinite))errors.push('Nonfinite road anchor');
  if(p[0]<-660||p[0]>660||p[1]<-500||p[1]>500)errors.push('Road outside terrain: '+p);
 }
 for(let i=1;i<COAST_ROAD_ANCHORS.length;i++){
  const a=COAST_ROAD_ANCHORS[i-1],b=COAST_ROAD_ANCHORS[i];
  if(Math.hypot(a[0]-b[0],a[1]-b[1])>65)errors.push('Long road anchor gap: '+i);
 }
 for(const parcel of COAST_PARCELS){
  if(parcel.position[0]<COAST_BOUNDS.minX||parcel.position[0]>COAST_BOUNDS.maxX||
    parcel.position[1]<COAST_BOUNDS.minZ||parcel.position[1]>COAST_BOUNDS.maxZ)
    errors.push('Parcel outside coast: '+parcel.id);
  for(const fixed of FIXED_LANDMARKS)
   if(rectanglesOverlap(parcel,fixed,12))errors.push('Protected landmark overlap: '+parcel.id+' / '+fixed.id);
 }
 for(let i=0;i<COAST_PARCELS.length;i++)for(let j=0;j<i;j++)
  if(rectanglesOverlap(COAST_PARCELS[i],COAST_PARCELS[j],8))
   errors.push('Coastal parcel overlap: '+COAST_PARCELS[i].id+' / '+COAST_PARCELS[j].id);
 return errors;
}
