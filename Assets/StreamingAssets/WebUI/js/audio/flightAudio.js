import {getState} from '../state.js';

// Original procedural audio. The seeded buffer feeds a filtered roar and a
// quieter pad loop; envelopes are driven by simulation events and engine state.
export function createFlightAudio(){
 const settings=getState().settings;
 let context,buffer,master,engine,ambient,disposed=false;
 function noise(loop,frequency,type){
  const source=context.createBufferSource();
  source.buffer=buffer;source.loop=loop;
  const filter=context.createBiquadFilter();
  filter.type=type;filter.frequency.value=frequency;
  const gain=context.createGain();
  gain.gain.value=0;
  source.connect(filter);filter.connect(gain);gain.connect(master);
  return {source,filter,gain};
 }
 function unlock(){
  if(disposed)return;
  if(context){context.resume().catch(()=>{});return;}
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Audio)return;
  try{
   context=new Audio();
   master=context.createGain();master.gain.value=0;master.connect(context.destination);
   buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
   const samples=buffer.getChannelData(0);
   let seed=87301;
   for(let i=0;i<samples.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const edge=Math.min(1,i/96,(samples.length-1-i)/96);
    samples[i]=(seed/2147483648-1)*edge;
   }
   engine=noise(true,280,'lowpass');ambient=noise(true,130,'bandpass');
   engine.source.start();ambient.source.start();
   context.resume().catch(()=>{});
  }catch{destroy();}
 }
 function update({throttle=0,altitudeKm=0,paused,events,camera}){
  if(!engine||context.state!=='running')return;
  const now=context.currentTime;
  const audible=!paused&&settings.audio!==false;
  const transmission=Math.max(0,1-altitudeKm/55)**2*(camera==='wide'?.55:1);
  master.gain.setTargetAtTime(audible?(settings.masterVolume??.75):0,now,.045);
  engine.gain.gain.setTargetAtTime(transmission*Math.sqrt(throttle)*(settings.effectsVolume??.8)*.46,now,.09);
  engine.filter.frequency.setTargetAtTime(110+throttle*530,now,.08);
  ambient.gain.gain.setTargetAtTime(Math.max(0,1-altitudeKm/.7)*(settings.ambienceVolume??.55)*.11,now,.18);
  if(!audible||transmission===0)return;
  for(const {id} of events){
   if(!['ignition','boosters','core','fairing'].includes(id))continue;
   const cue=noise(false,id==='ignition'?150:480,'lowpass');
   cue.gain.gain.setValueAtTime(Math.max(.0001,(settings.effectsVolume??.8)*.46*transmission),now);
   cue.gain.gain.exponentialRampToValueAtTime(.0001,now+.52);
   cue.source.onended=()=>{cue.source.disconnect();cue.filter.disconnect();cue.gain.disconnect();};
   cue.source.start(now);cue.source.stop(now+.55);
  }
 }
 function destroy(){
  if(disposed)return;
  disposed=true;
  if(context&&context.state!=='closed')context.close().catch(()=>{});
 }
 return {unlock,update,destroy};
}
