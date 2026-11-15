import {hostSession} from './HostSession.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=path.resolve('Video/ORBITAL-captioned/raw');fs.mkdirSync(out,{recursive:true});
const ff=path.resolve('Video/ORBITAL-30s/tools/python/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v9.0.2.exe');
const h=await hostSession();
const record=(name,seconds)=>new Promise((resolve,reject)=>{
 const p=spawn(ff,['-hide_banner','-loglevel','error','-y','-f','gdigrab','-framerate','30','-draw_mouse','0','-i','desktop','-t',String(seconds),'-an','-c:v','libx264','-threads','4','-preset','fast','-crf','18','-pix_fmt','yuv420p',path.join(out,name+'.mp4')]);
 let err='';p.stderr.on('data',v=>err+=v);p.on('error',reject);p.on('exit',code=>code?reject(Error(err)):resolve());
});
try {
 await h.send('Emulation.clearDeviceMetricsOverride');
 for(const [name,screen,seconds] of [['home','menu',3],['campaign','missionSelect',4],['satellite','workshop',5],['rocket','rocketWorkshop',4]]) {
  await h.evaluate(`(async()=>{
   const {showScreen}=await import('/js/ui/router.js');
   if('${screen}'==='workshop'){
    const [{loadData},{starterDesign},{setDesign},{makeBlueprint}]=await Promise.all([import('/js/data.js'),import('/js/campaign.js'),import('/js/state.js'),import('/js/workshop/blueprint.js')]);
    const d=await loadData(),design=starterDesign(d.missions.find(m=>m.id==='m1'),d);setDesign(design);
    showScreen('workshop',{mission:false,blueprint:makeBlueprint(design,d,'Floodwatch spacecraft')});
   }else {showScreen('${screen}',{mission:false});}
   if('${screen}'==='rocketWorkshop')document.querySelector('#rocket-reference').click();
   if('${screen}'==='missionSelect')window.scrollTo(0,240);
  })()`);
  await new Promise(r=>setTimeout(r,1800));
  await record(name,seconds);console.log('Captured '+name);
 }
}finally{h.close();}
