export const VERSION = '0.5.0-beta.1';
export const STORAGE_KEY = 'voxel-city-driver:v1';
export const COLORS = [
  {name:'Sunburst', hex:'#ffc34b'},
  {name:'Azure', hex:'#2f9cfc'},
  {name:'Coral', hex:'#ff626f'},
  {name:'Mint', hex:'#4ce1b6'},
  {name:'Lilac', hex:'#b18cff'},
  {name:'Ivory', hex:'#fff0d8'},
  {name:'Midnight', hex:'#19263e'},
  {name:'White', hex:'#f8fbff'}
];
export const VEHICLES = [
  {id:'taxi',name:'Sunset Taxi',subtitle:'The perfect city companion',price:0,accel:29,topSpeed:52,brake:39,handling:1.15,grip:8.0,suspension:0.13,width:1.95,length:4.15,wheel:0.52,bodyHeight:1.35,capacity:4,color:COLORS[0].hex},
  {id:'coupe',name:'Lightning GT',subtitle:'Low, fast and exhilarating',price:1600,accel:42,topSpeed:72,brake:50,handling:1.25,grip:10.0,suspension:0.09,width:2.07,length:4.45,wheel:0.50,bodyHeight:0.99,capacity:1,color:COLORS[2].hex},
  {id:'suv',name:'Summit Explorer',subtitle:'Comfort for every road',price:2800,accel:30,topSpeed:54,brake:42,handling:0.93,grip:8.6,suspension:0.24,width:2.15,length:4.70,wheel:0.64,bodyHeight:1.65,capacity:5,color:COLORS[1].hex},
  {id:'truck',name:'Titan Monster',subtitle:'Go boldly beyond the asphalt',price:5200,accel:26,topSpeed:46,brake:40,handling:0.68,grip:7.6,suspension:0.38,width:2.85,length:5.15,wheel:0.96,bodyHeight:1.55,capacity:2,color:COLORS[3].hex},
  {id:'van',name:'Skyport Shuttle',subtitle:'A whole crew and their luggage',price:3900,accel:23,topSpeed:45,brake:38,handling:0.74,grip:9.0,suspension:0.18,width:2.3,length:5.75,wheel:0.58,bodyHeight:2.0,capacity:8,color:COLORS[4].hex}
];
export const PICKUPS = [
  {id:'p0',pos:[5,-75],label:'Sunrise Plaza',passengers:1,bonus:0},
  {id:'p1',pos:[-125,4],label:'Old Town Market',passengers:2,bonus:70},
  {id:'p2',pos:[124,184],label:'Maple Gardens',passengers:3,bonus:120},
  {id:'p3',pos:[-184,-122],label:'Harbor Heights',passengers:1,bonus:100},
  {id:'p4',pos:[184,-245],label:'Westside Mall',passengers:4,bonus:180},
  {id:'p5',pos:[206,460],label:'Pinecrest Lodge',passengers:2,bonus:280},
  {id:'p6',pos:[-455,-339],label:'Coral Bay Beach',passengers:2,bonus:260},
  {id:'p7',pos:[-385,366],label:'Country Valley',passengers:3,bonus:220},
  {id:'p8',pos:[150,327],label:'Mountain Trailhead',passengers:2,bonus:230},
  {id:'p9',pos:[247,182],label:'Eastside Suburb',passengers:2,bonus:130},
  {id:'p10',pos:[-118,263],label:'Northern Farmstead',passengers:4,bonus:175},
  {id:'p11',pos:[62,-263],label:'South Workshop Row',passengers:3,bonus:180},
  {id:'p12',pos:[-385,-277],label:'West Hamlet Approach',passengers:5,bonus:300}
];
export const AIRPORT = {pos:[380,-120],name:'Skyport International'};
export const DEFAULT_SETTINGS = {quality:'auto',sound:true,volume:0.55,sensitivity:0.65,camera:'chase',shadows:true,roadGuides:true};
export const DEFAULT_SAVE = () => ({version:1,cash:0,earned:0,trips:0,owned:['taxi'],selected:'taxi',colors:{taxi:COLORS[0].hex},position:[0,2,0],heading:0,hasPlayed:false,settings:{...DEFAULT_SETTINGS}});
export function formatMoney(n){return '$'+Math.round(n).toLocaleString('en-US');}
export function distance2(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1]);}
export function tripReward(start, end, bonus=0){return Math.round(160 + distance2(start,end)*1.3 + bonus);}
export function loadSave(){
  try{
    const raw=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(!raw || raw.version!==1) return DEFAULT_SAVE();
    const out={...DEFAULT_SAVE(),...raw};
    out.cash=Number.isFinite(raw.cash)&&raw.cash>=0?Math.round(raw.cash):0;
    out.earned=Number.isFinite(raw.earned)&&raw.earned>=0?Math.round(raw.earned):0;
    out.trips=Number.isSafeInteger(raw.trips)&&raw.trips>=0?raw.trips:0;
    out.colors=raw.colors&&typeof raw.colors==='object'&&!Array.isArray(raw.colors)?{...DEFAULT_SAVE().colors,...raw.colors}:{...DEFAULT_SAVE().colors};
    out.owned=Array.isArray(raw.owned)?[...new Set(raw.owned.filter(x=>VEHICLES.some(v=>v.id===x)))]:['taxi'];
    if(!out.owned.includes('taxi'))out.owned.unshift('taxi');
    if(!out.owned.includes(out.selected))out.selected='taxi';
    out.settings={...DEFAULT_SETTINGS,...raw.settings};
    return out;
  }catch{return DEFAULT_SAVE();}
}
export function saveGame(data){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));return true;}
  catch(err){console.warn('Save unavailable',err);return false;}
}
// Pure, all-or-nothing purchase: the wallet and ownership update together.
export function purchaseVehicle(save,id,{select=true}={}){
  const spec=VEHICLES.find(v=>v.id===id);
  if(!spec||spec.price<=0)return {ok:false,reason:'unknown'};
  if(!Array.isArray(save.owned)||save.owned.includes(id))return {ok:false,reason:'owned'};
  if(!Number.isFinite(save.cash)||save.cash<spec.price)return {ok:false,reason:'funds'};
  return {ok:true,save:{
    ...save,cash:save.cash-spec.price,
    owned:[...save.owned,id],
    selected:select?id:save.selected,
    colors:{...save.colors,[id]:spec.color}
  }};
}
