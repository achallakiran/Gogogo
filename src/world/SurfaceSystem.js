import * as THREE from 'three';

// The canonical height function is the sole source of the drivable terrain.
// This preserves v0.2 coordinates/heights until roads and hills are rebuilt.
const S=THREE.MathUtils;
export function terrainHeight(x,z){
  const ax=Math.abs(x),az=Math.abs(z);
  const outskirts=S.smoothstep(Math.max(ax-265,az-260),0,95);
  const hills=outskirts*(2.5*Math.sin(x*.026)*Math.cos(z*.029)+3.7*Math.sin((x+z)*.016));
  let dips=0;
  for(const p of [[-81,-120,3.1],[114,0,2.9],[0,113,3.3],[-208,180,2.5]]){
    const dx=(x-p[0])/p[2],dz=(z-p[1])/p[2];const r=dx*dx+dz*dz;
    dips-=.45*Math.exp(-r*.7);
  }
  const bump=.12*Math.exp(-Math.pow((z+188)/2.8,2))*Math.exp(-Math.pow(x/65,4));
  // Airport's terminal, apron and runway are built at ground level y=0.
  // Smoothly settle the underlying hills to that same elevation to avoid
  // visible tarmac sheets or collisions below/above the runway surface.
  const airportZone=S.smoothstep(x,345,376) *
    S.smoothstep(z,-280,-245) * (1-S.smoothstep(z,21,49));
  return (hills+dips+bump)*(1-airportZone);
}

export const GRID_LINES=Object.freeze([-240,-180,-120,-60,0,60,120,180,240]);
export const ROAD_HALF_WIDTH=6.25;
export const ROAD_SHOULDER_HALF_WIDTH=7.75;

// Road appearance and vehicle grip query the SAME declared road footprint.
// Airport access along z=-120 is deliberately included beyond the city grid.
export function surfaceInfoAt(x,z){
  const distanceX=Math.min(...GRID_LINES.map(a=>Math.abs(x-a)));
  const distanceZ=Math.min(...GRID_LINES.map(a=>Math.abs(z-a)));
  const northSouth=distanceX<=ROAD_HALF_WIDTH && z>=-272 && z<=272;
  const eastWest=distanceZ<=ROAD_HALF_WIDTH && x>=-272 && (Math.abs(z+120)<ROAD_HALF_WIDTH?x<=405:x<=272);
  const road=northSouth||eastWest;
  const shoulder=!road && (
    (distanceX<=ROAD_SHOULDER_HALF_WIDTH && z>=-273&&z<=273)||
    (distanceZ<=ROAD_SHOULDER_HALF_WIDTH && x>=-273 && (Math.abs(z+120)<ROAD_SHOULDER_HALF_WIDTH?x<=406:x<=273))
  );
  return {height:terrainHeight(x,z),type:road?'asphalt':shoulder?'shoulder':'terrain',drivable:true};
}

// The visual ground and Rapier heightfield are generated from identical
// samples and cell boundaries, avoiding the previous 220x166 vs 132x100
// mismatch. Road colours are thin draped overlays (not raised collision pads).
export function createTerrainGeometry(sampled){
  const {ncols,nrows,scale,heights}=sampled;
  const geo=new THREE.PlaneGeometry(scale.x,scale.z,ncols,nrows);
  geo.rotateX(-Math.PI/2);
  const attr=geo.getAttribute('position');
  for(let row=0;row<=nrows;row++)for(let col=0;col<=ncols;col++){
    const meshIndex=row*(ncols+1)+col;
    attr.setY(meshIndex,heights[col*(nrows+1)+row]*scale.y);
  }
  attr.needsUpdate=true;
  geo.computeVertexNormals();
  return geo;
}
