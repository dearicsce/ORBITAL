let manifest={};
const active=new Set();
export async function loadCutscenes(){try{const r=await fetch(new URL('../../videos/manifest.json',import.meta.url));if(r.ok)manifest=await r.json();}catch{manifest={};}}
export function playCutscene(container,id,{onDone=()=>{}}={}) {
  const entry=manifest[id];if(!entry?.file)return false;
  const wrap=document.createElement('div');wrap.className='cutscene';
  const video=document.createElement('video');video.muted=true;video.playsInline=true;video.controls=false;
  const skip=document.createElement('button');skip.className='btn';skip.textContent='Skip video';
  const sound=document.createElement('button');sound.className='btn';sound.textContent='Video sound off';
  const caption=document.createElement('p');caption.className='video-caption';caption.textContent=entry.caption||'';wrap.append(video,sound,skip,caption);container.append(wrap);let done=false;
  const finish=(notify=true)=>{if(done)return;done=true;video.pause();video.onended=null;video.onerror=null;video.removeAttribute('src');video.load();wrap.remove();active.delete(cancel);if(notify)onDone();};
  const cancel=()=>finish(false);active.add(cancel);
  skip.onclick=()=>finish();sound.onclick=()=>{video.muted=!video.muted;sound.textContent=video.muted?'Video sound off':'Video sound on';};
  video.onended=()=>finish();video.onerror=()=>finish();video.src=new URL('../../'+entry.file,import.meta.url).href;
  video.play().catch(()=>finish());return true;
}
export function clearCutscenes(){for(const cancel of active)cancel();}
