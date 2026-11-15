import {copy,validateBlueprint} from './blueprint.js';
export const LIBRARY_KEY='orbital_blueprints_v1',DRAFT_KEY='orbital_workshop_draft_v1';
export function createLibrary(data,storage,missionId){
 const draftKey=missionId?DRAFT_KEY+':'+missionId:DRAFT_KEY;
 if(storage===undefined)try{storage=globalThis.localStorage;}catch{}
 if(!storage)storage={getItem(){throw Error('Browser storage is unavailable. Export the working draft for a portable backup.');},setItem(){throw Error('Browser storage is unavailable.');}};
 function read(){const raw=storage.getItem(LIBRARY_KEY);if(!raw)return [];const list=JSON.parse(raw);if(!Array.isArray(list)||list.length>100)throw Error('Invalid satellite library');return list.map(b=>validateBlueprint(b,data));}
 function write(list){storage.setItem(LIBRARY_KEY,JSON.stringify(list));}
 return {list:read,save(blueprint){const b=validateBlueprint(blueprint,data),list=read(),index=list.findIndex(v=>v.id===b.id);b.updatedAt=new Date().toISOString();if(index<0){if(list.length>=100)throw Error('Library full (100 satellites)');list.push(b);}else list[index]=b;write(list);return copy(b);},
  remove(id){write(read().filter(b=>b.id!==id));},
  draft(b){storage.setItem(draftKey,JSON.stringify(validateBlueprint(b,data)));},
  recover(){const raw=storage.getItem(draftKey)??(missionId?storage.getItem(DRAFT_KEY):null);return raw?validateBlueprint(JSON.parse(raw),data):null;},
  import(text){if(text.length>2e6)throw Error('Import exceeds 2 MB');return validateBlueprint(JSON.parse(text),data);}
 };
}
