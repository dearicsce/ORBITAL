import {isCoreMission} from '../campaignAtlas.js';

export function missionLayout(missions) {
 const positions=new Map(),columns=new Map(),ranks=new Map(),byId=new Map(missions.map(m=>[m.id,m]));
 function rank(mission){
  if(!ranks.has(mission.id)){
   const parents=(mission.requires||[]).filter(id=>byId.has(id));
   ranks.set(mission.id,parents.length?1+Math.max(...parents.map(id=>rank(byId.get(id)))):0);
  }
  return ranks.get(mission.id);
 }
 for(const mission of missions){
  const index=rank(mission);
  if(!columns.has(index))columns.set(index,[]);
  columns.get(index).push(mission);
 }
 const sideRows=Math.max(0,...Array.from(columns.values(),column=>Math.ceil((column.length-1)/2)));
 const width=Math.max(680,columns.size*218),height=Math.max(320,sideRows*316+170);
 for(const [index,column] of columns){
  const core=column.find(isCoreMission);
  const ordered=core?[core,...column.filter(m=>m!==core)]:column;
  ordered.forEach((mission,row)=>{
   const offset=row===0?0:(row%2?-1:1)*Math.ceil(row/2)*152;
   positions.set(mission.id,{x:(index+.5)*width/columns.size,y:height/2+offset+(index%2?10:-10)});
  });
 }
 const links=missions.flatMap(m=>(m.requires||[]).filter(id=>positions.has(id)).map(id=>{
  const a=positions.get(id),b=positions.get(m.id),bend=(a.x+b.x)/2;
  return {from:id,to:m.id,path:`M${a.x} ${a.y} C${bend} ${a.y},${bend} ${b.y},${b.x} ${b.y}`};
 }));
 return {width,height,positions,links};
}
