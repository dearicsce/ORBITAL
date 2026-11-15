import { getCharacter,drawAvatar } from '../characters.js';
import { speak,stopSpeaking,isMuted,setMuted } from '../voice.js';
let bubble=null,pointer=null,queue=[],timer=null,generation=0,resize=null;
function clearPointer(){pointer?.remove();pointer=null;if(resize){window.removeEventListener('resize',resize);window.removeEventListener('scroll',resize,true);resize=null;}}
export function clearLines(){generation++;clearTimeout(timer);queue=[];stopSpeaking();clearPointer();bubble?.remove();bubble=null;}
function point(selector){clearPointer();const target=document.querySelector(selector);if(!target)return;pointer=document.createElement('div');pointer.className='guide-pointer';document.body.append(pointer);resize=()=>{if(!pointer||!target.isConnected)return;const r=target.getBoundingClientRect();pointer.style.cssText='top:'+r.top+'px;left:'+r.left+'px;width:'+r.width+'px;height:'+r.height+'px';};resize();window.addEventListener('resize',resize);window.addEventListener('scroll',resize,true);}
export function showLine(characterId,text,options={}) {
 const token=++generation;clearTimeout(timer);stopSpeaking();bubble?.remove();clearPointer();const c=getCharacter(characterId);
 bubble=document.createElement('aside');bubble.className='guide-dialogue speaking';bubble.setAttribute('aria-label','Dialogue from '+c.name);
 bubble.innerHTML='<button class="guide-character" aria-expanded="true" aria-label="Show or hide '+c.name+' dialogue">'+drawAvatar(c.id,76)+'<span>'+ (c.id==='nova'?'Nova':c.role)+'</span></button><div class="guide-message"><div class="guide-message-top"><strong>'+c.name+'</strong><div><button id="btn-speech-replay" aria-label="Replay line">Replay</button><button id="btn-speech-mute" aria-label="'+(isMuted()?'Unmute voice':'Mute voice')+'">'+(isMuted()?'Muted':'Sound')+'</button><button id="btn-speech-dismiss" aria-label="Dismiss dialogue">×</button></div></div><p id="speech-subtitles" aria-live="polite"></p></div>';
 bubble.querySelector('#speech-subtitles').textContent=text;document.body.append(bubble);const current=bubble;
 if(options.pointAt)point(options.pointAt);
 const play=()=>{current.classList.add('speaking');speak(c.id,text,{onStart:()=>current.classList.add('talking'),onEnd:()=>{if(token!==generation)return;current.classList.remove('talking','speaking');current.querySelector('.guide-character').setAttribute('aria-expanded','false');clearPointer();options.onEnd?.();if(queue.length){const next=queue.shift();timer=setTimeout(()=>showLine(next.characterId,next.text,next.options),250);}}});};
 current.querySelector('.guide-character').onclick=()=>{const open=current.classList.toggle('expanded');current.querySelector('.guide-character').setAttribute('aria-expanded',String(open));};
 current.querySelector('#btn-speech-replay').onclick=play;current.querySelector('#btn-speech-mute').onclick=()=>{setMuted(!isMuted());current.querySelector('#btn-speech-mute').textContent=isMuted()?'Muted':'Sound';play();};current.querySelector('#btn-speech-dismiss').onclick=clearLines;play();
}
export function queueLines(lines=[]){clearLines();queue=[...lines];const first=queue.shift();if(first)showLine(first.characterId,first.text,first.options);}
