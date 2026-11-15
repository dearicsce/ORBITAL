import {copy} from './blueprint.js';
export function createHistory(initial){let present=copy(initial),past=[],future=[];return {
 get value(){return copy(present);},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
 replaceCurrent(next){present=copy(next);},
 commit(next){if(JSON.stringify(next)===JSON.stringify(present))return;past.push(present);if(past.length>80)past.shift();present=copy(next);future=[];},
 undo(){if(past.length){future.push(present);present=past.pop();}return copy(present);},
 redo(){if(future.length){past.push(present);present=future.pop();}return copy(present);}
};}
