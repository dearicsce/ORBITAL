import { resourceRows } from './resourceTable.js';
import { warningCharacter,warningText } from './warningTexts.js';
import { showLine } from './speech.js';
import { drawAvatar } from '../characters.js';
export function mountDesignWarnings(host,data,budget,initial) {
  let previous=new Map(resourceRows(initial,budget,data).map(r=>[r.id,r.over])),last=-Infinity,timer;
  const handler=e=>{
    const rows=resourceRows(e.detail.evalResult,budget,data);
    const changed=rows.find(r=>r.over&&!previous.get(r.id));previous=new Map(rows.map(r=>[r.id,r.over]));
    if(!changed||performance.now()-last<8000)return;last=performance.now();
    const character=warningCharacter[changed.id],text=warningText(changed);showLine(character,text,{pointAt:`[data-bar="${changed.id}"]`});
    host.innerHTML=`${drawAvatar(character,32)}<span>${text}</span>`;clearTimeout(timer);timer=setTimeout(()=>{host.innerHTML='';},8000);
  };
  document.addEventListener('design-updated',handler);
  return ()=>{clearTimeout(timer);document.removeEventListener('design-updated',handler);};
}
