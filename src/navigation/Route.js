import {MOUNTAIN_CONTROL_POINTS,MOUNTAIN_START} from '../world/MountainData.js';
// Deterministic route planner for connected city streets and the authored mountain route.
// Every waypoint belongs to an actual road intersection, including the airport spur.
export const GRID=[-240,-180,-120,-60,0,60,120,180,240];
export const AIRPORT_SPUR=[300,360];
export const key=p=>p[0]+','+p[1];
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function roadNodes(){
  const nodes=[];
  for(const x of GRID)for(const z of GRID)nodes.push([x,z]);
  for(const x of AIRPORT_SPUR)nodes.push([x,-120]);
  for(const [x,z] of MOUNTAIN_CONTROL_POINTS)nodes.push([x,z]);
  return nodes;
}
const NODES=roadNodes();
const lookup=new Map(NODES.map((n,i)=>[key(n),i]));
const mountainEdges=new Map();
for(let i=0;i<MOUNTAIN_CONTROL_POINTS.length-1;i++){
  const a=MOUNTAIN_CONTROL_POINTS[i],b=MOUNTAIN_CONTROL_POINTS[i+1];
  const ak=key(a),bk=key(b);
  if(!mountainEdges.has(ak))mountainEdges.set(ak,[]);
  if(!mountainEdges.has(bk))mountainEdges.set(bk,[]);
  mountainEdges.get(ak).push([b[0],b[1]]);
  mountainEdges.get(bk).push([a[0],a[1]]);
}
// The 32-metre connector joins the original city street to the mountain.
const cityConnector=[120,240],ridgeConnector=[120,272];
for(const [a,b] of [[cityConnector,ridgeConnector],[ridgeConnector,cityConnector]]){
  const ak=key(a);if(!mountainEdges.has(ak))mountainEdges.set(ak,[]);
  mountainEdges.get(ak).push(b);
}
function neighbours(node){
  const [x,z]=node,opts=[[x-60,z],[x+60,z],[x,z-60],[x,z+60],...(mountainEdges.get(key(node))||[])];
  return opts.filter(p=>lookup.has(key(p)));
}
export function nearestNode(pos){
  let candidate=NODES[0],best=Infinity;
  for(const n of NODES){const score=distance(n,pos);if(score<best){candidate=n;best=score;}}
  return [...candidate];
}
function simplify(points){
  if(points.length<3)return points;
  const result=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const a=result[result.length-1],b=points[i],c=points[i+1];
    const ax=b[0]-a[0],az=b[1]-a[1],bx=c[0]-b[0],bz=c[1]-b[1];
    if(Math.abs(ax*bz-az*bx)>0.00001 || ax*bx+az*bz<0)result.push(b);
  }
  result.push(points[points.length-1]);
  return result;
}
export function planRoadRoute(start,target){
  if(!start||!target)return [];
  const s=nearestNode(start),finish=nearestNode(target);
  const begin=key(s),end=key(finish);
  const q=[s],cost=new Map([[begin,0]]),parent=new Map(),visited=new Set();
  while(q.length){
    q.sort((a,b)=>(cost.get(key(a))+distance(a,finish))-(cost.get(key(b))+distance(b,finish)));
    const node=q.shift(),k=key(node);
    if(visited.has(k))continue;
    visited.add(k);
    if(k===end)break;
    for(const other of neighbours(node)){
      const nk=key(other),estimate=cost.get(k)+distance(node,other);
      if(estimate>=(cost.get(nk)??Infinity))continue;
      cost.set(nk,estimate);parent.set(nk,k);q.push(other);
    }
  }
  let points=[finish],current=end,safety=0;
  while(current!==begin&&parent.has(current)&&safety++<200){
    current=parent.get(current);
    points.unshift(current.split(',').map(Number));
  }
  if(current!==begin)return [start,target];
  const core=simplify(points);
  const route=[...core];
  if(distance(start,route[0])>2)route.unshift([...start]);
  if(distance(target,route[route.length-1])>2)route.push([...target]);
  return route;
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
