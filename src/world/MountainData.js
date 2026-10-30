// Authored scenic mountain road, always at the same map coordinates.
// x/z define the driveable route; height is the intended roadbed elevation.
import * as THREE from 'three';
export const MOUNTAIN_CONTROL_POINTS=Object.freeze([
  [120,272,0],[128,296,2.8],[174,322,6.1],[202,350,10.3],
  [178,376,13.9],[130,385,16.0],[115,411,19.1],
  [150,438,23.0],[185,450,25.1],[206,470,27.1]
].map(p=>Object.freeze(p)));
const curve=new THREE.CatmullRomCurve3(MOUNTAIN_CONTROL_POINTS.map(p=>new THREE.Vector3(p[0],p[2],p[1])),false,'centripetal',.45);
export const MOUNTAIN_SAMPLES=Object.freeze(curve.getPoints(150).map(p=>Object.freeze({x:p.x,z:p.z,y:p.y})));
export const MOUNTAIN_START=Object.freeze([120,272]);
export const MOUNTAIN_FINISH=Object.freeze([206,470]);
export const MOUNTAIN_ROAD_HALF_WIDTH=5.1;

export function closestMountainPoint(x,z){
  let best=null,bestDist2=Infinity,bestIndex=0;
  for(let i=0;i<MOUNTAIN_SAMPLES.length;i++){
    const s=MOUNTAIN_SAMPLES[i],dx=x-s.x,dz=z-s.z,d2=dx*dx+dz*dz;
    if(d2<bestDist2){best=s;bestDist2=d2;bestIndex=i;}
  }
  return {sample:best,distance:Math.sqrt(bestDist2),index:bestIndex};
}
