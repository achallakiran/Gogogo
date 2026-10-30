import {MOUNTAIN_CONTROL_POINTS} from '../world/MountainData.js';
// Deterministic route planner for connected city streets and the authored mountain route.
// Every waypoint belongs to an actual road intersection, including the airport spur.
export const GRID=[-240,-180,-120,-60,0,60,120,180,240];
export const AIRPORT_SPUR=[300,360];
export const key=p=>p[0]+','+p[1];
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// The graph is built from authored roads, not from visual-only shortcuts.
// Grid intersections are connected only to their immediate neighbours.
import {COUNTRY_SAMPLES} from '../world/RegionalRoads.js';
import {COAST_SAMPLES} from '../world/CoastalRoad.js';
const COUNTRY_NODES=COUNTRY_SAMPLES.map(p=>[p.x,p.z]);
const COAST_NODES=COAST_SAMPLES.map(p=>[p.x,p.z]);
const CITY_NODES=GRID.flatMap(x=>GRID.map(z=>[x,z]));
const AIRPORT_NODES=AIRPORT_SPUR.map(x=>[x,-120]);
const MOUNTAIN_NODES=MOUNTAIN_CONTROL_POINTS.map(p=>[...p]);
const CONNECTOR=[[120,240],[120,272]];
const NODES=[...CITY_NODES,...AIRPORT_NODES,...MOUNTAIN_NODES,...CONNECTOR,...COUNTRY_NODES,...COAST_NODES];
const graph=new Map();
function connect(a,b){
 const ak=key(a),bk=key(b);
 if(!graph.has(ak))graph.set(ak,new Map());
 if(!graph.has(bk))graph.set(bk,new Map());
 graph.get(ak).set(bk,b);graph.get(bk).set(ak,a);
}
for(const [x,z] of CITY_NODES){
 if(GRID.includes(x+60))connect([x,z],[x+60,z]);
 if(GRID.includes(z+60))connect([x,z],[x,z+60]);
}
connect([240,-120],[300,-120]);
connect([300,-120],[360,-120]);
for(let i=1;i<MOUNTAIN_NODES.length;i++)connect(MOUNTAIN_NODES[i-1],MOUNTAIN_NODES[i]);
connect(CONNECTOR[0],CONNECTOR[1]);
for(let i=1;i<COUNTRY_NODES.length;i++)connect(COUNTRY_NODES[i-1],COUNTRY_NODES[i]);
for(let i=1;i<COAST_NODES.length;i++)connect(COAST_NODES[i-1],COAST_NODES[i]);
export const ROAD_GRAPH_STATS=Object.freeze({nodes:NODES.length,edges:[...graph.values()].reduce((n,m)=>n+m.size,0)/2,countrysideNodes:COUNTRY_NODES.length,coastalNodes:COAST_NODES.length});
export function nearestNode(pos){
 let best=NODES[0],distanceBest=Infinity;
 for(const n of NODES){const d=distance(pos,n);if(d<distanceBest){best=n;distanceBest=d;}}
 return [...best];
}
function simplify(points){
 if(points.length<3)return points;
 const out=[points[0]];
 for(let i=1;i<points.length-1;i++){
  const a=out[out.length-1],b=points[i],c=points[i+1];
  const ax=b[0]-a[0],az=b[1]-a[1],bx=c[0]-b[0],bz=c[1]-b[1];
  if(Math.abs(ax*bz-az*bx)>0.00001||ax*bx+az*bz<0)out.push(b);
 }
 out.push(points.at(-1));return out;
}
export function planRoadRoute(start,target){
 if(!start||!target)return [];
 const s=nearestNode(start),finish=nearestNode(target),begin=key(s),end=key(finish);
 const q=[s],cost=new Map([[begin,0]]),parent=new Map(),visited=new Set();
 while(q.length){
  q.sort((a,b)=>(cost.get(key(a))+distance(a,finish))-(cost.get(key(b))+distance(b,finish)));
  const node=q.shift(),k=key(node);
  if(visited.has(k))continue;
  visited.add(k);
  if(k===end)break;
  for(const next of graph.get(k)?.values()||[]){
   const nk=key(next),estimate=cost.get(k)+distance(node,next);
   if(estimate>=(cost.get(nk)??Infinity))continue;
   cost.set(nk,estimate);parent.set(nk,k);q.push(next);
  }
 }
 if(!cost.has(end))return [];
 const points=[finish];let current=end;
 while(current!==begin){
  current=parent.get(current);
  if(!current)return [];
  points.unshift(current.split(',').map(Number));
 }
 const core=simplify(points),result=[...core];
 if(distance(start,result[0])>2)result.unshift([...start]);
 if(distance(target,result.at(-1))>2)result.push([...target]);
 return result;
}
export function getNextTurn(current,route,yaw){
  if(!route.length)return null;
  const goal=route[route.length-1];
  if(distance(current,goal)<9){
    return {next:goal,relative:0,direction:'ARRIVED',turnDistance:0,remaining:0};
  }
  let index=0;
  while(index<route.length-1&&distance(current,route[index])<13)index++;
  const next=route[index];
  const dx=next[0]-current[0],dz=next[1]-current[1];
  const absolute=Math.atan2(-dx,-dz);
  const relative=Math.atan2(Math.sin(absolute-yaw),Math.cos(absolute-yaw));
  const remainder=[current,...route.slice(index)].reduce((sum,p,i,arr)=>i?sum+distance(p,arr[i-1]):sum,0);
  const direction=Math.abs(relative)>2.55?'U-TURN':relative>.38?'LEFT':relative<-.38?'RIGHT':'STRAIGHT';
  return {next,relative,direction,turnDistance:distance(current,next),remaining:remainder};
}
