import {appendFileSync} from 'node:fs';

const [port='19330',output='Verification/Campaign-2026-11-09/verified-webview-frames.jsonl']=process.argv.slice(2);
const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
const page=pages.find(p=>p.type==='page'&&p.url.startsWith('https://orbital.local/'));
if(!page)throw Error('Start an isolated Windows host first');
const socket=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let next=0;
const waiting=new Map();
const closed=new Promise(resolve=>{socket.onclose=resolve;});
socket.onmessage=event=>{
 const msg=JSON.parse(event.data);
 if(msg.method==='Runtime.bindingCalled'&&msg.params.name==='orbitalFrameWindow'){
  appendFileSync(output,msg.params.payload+'\n');
 }
 const call=waiting.get(msg.id);
 if(call){waiting.delete(msg.id);if(msg.error)call.reject(Error(msg.error.message));else call.resolve(msg.result);}
};
function send(method,params={}){
 return new Promise((resolve,reject)=>{
  const id=++next;waiting.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
 });
}
const source=`(()=>{
 if(self!==top||globalThis.orbitalFrameProbe)return;
 globalThis.orbitalFrameProbe=true;
 let last,begin,screen,mission,frames=[];
 function flush(){
  if(frames.length)orbitalFrameWindow(JSON.stringify({utc:new Date().toISOString(),screen,mission,
   width:innerWidth,height:innerHeight,dpr:devicePixelRatio,frames}));
  frames=[];
 }
 requestAnimationFrame(function sample(now){
  const name=document.querySelector('#app > [data-screen]')?.dataset.screen||'startup';
  if(name!==screen){
   flush();screen=name;begin=now;
   try{mission=JSON.parse(localStorage.getItem('space_mission_flight_v1'))?.design?.missionId||null;}
   catch{mission=null;}
  }
  if(last!==undefined)frames.push(now-last);
  last=now;
  if(now-begin>=2000){flush();begin=now;}
  requestAnimationFrame(sample);
 });
 addEventListener('pagehide',flush);
})()`;
await send('Runtime.enable');
await send('Runtime.addBinding',{name:'orbitalFrameWindow'});
await send('Page.addScriptToEvaluateOnNewDocument',{source});
await send('Runtime.evaluate',{expression:source});
console.log('Recording WebView2 frame intervals in '+output);
await closed;
