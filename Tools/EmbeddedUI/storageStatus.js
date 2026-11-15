import {installDialogFocus} from './dialogFocus.js';
const campaignKey='space_mission_game_state_v1';
export function installStorageStatus(){
 installDialogFocus();
 const notice=document.createElement('div');
 notice.setAttribute('role','status');
 notice.className='orbital-storage-status';
 notice.hidden=true;
 document.body.append(notice);
 addEventListener('orbital-storage-issue',event=>{
  notice.textContent=event.detail;notice.hidden=!event.detail;
 });
}

export function guardCampaignStorage(app,loadProgress){
 let raw;
 try{
  raw=localStorage.getItem(campaignKey);
  if(raw===null||loadProgress())return true;
 }catch{}
 app.innerHTML='<section class="screen content-screen"><h1>Campaign save needs attention</h1><p id="storage-message"></p></section>';
 const message=app.querySelector('#storage-message');
 if(raw===undefined){
  message.textContent='ORBITAL could not read local storage. Restart after checking the profile folder permissions and available disk space.';
  return false;
 }
 message.textContent='This campaign save could not be read. Export a copy for recovery before resetting the campaign record.';
 const copy=document.createElement('button');
 copy.className='btn';copy.textContent='Export damaged campaign record';
 copy.onclick=()=>{
  const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='orbital-campaign-recovery.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 };
 const reset=document.createElement('button');
 reset.className='btn';reset.textContent='Reset campaign record';
 reset.onclick=()=>{
  if(reset.dataset.confirm!=='yes'){reset.dataset.confirm='yes';reset.textContent='Confirm reset of campaign record';return;}
  try{localStorage.removeItem(campaignKey);location.reload();}
  catch{message.textContent='The campaign record could not be reset. Check the profile folder permissions.';}
 };
 app.querySelector('section').append(copy,reset);
 return false;
}
