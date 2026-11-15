import {atlasCredits,cachedApod,refreshApod} from '../content/agencyMedia.js';

const statuses={
 key:'Enter a personal NASA API key to fetch APOD.',
 cached:'Using the cached image. Refresh interval is twelve hours.',
 backoff:'A fetch was attempted recently. Try again in ten minutes.',
 rate:'NASA rate limit reached. Keeping the current background.',
 offline:'APOD is unavailable. Keeping the current background.',
 unsupported:'APOD returned media without a supported image and usage record. Keeping the current background.',
 updated:'APOD background updated.'
};

export function mountAgencyMedia(container){
 const target=container.querySelector('.program-map');
 const dialog=container.querySelector('#atlas-media');
 const status=dialog.querySelector('[data-media-status]');
 const image=target.querySelector('.program-apod');
 const credit=dialog.querySelector('[data-apod-credit]');
 const toggle=dialog.querySelector('[data-apod-show]');
 const form=dialog.querySelector('form');
 const key=form.querySelector('input');
 let alive=true,objectUrl,asset;
 try{toggle.checked=localStorage.getItem('orbital_apod_enabled')==='yes';}catch{}
 const show=()=>{
  image.hidden=!toggle.checked||!asset;
  credit.textContent=asset?asset.title+' · '+asset.credit+' · '+asset.date+' · Cache updated '+new Date(asset.updatedAt).toLocaleString('en-IN'):'Default background · NASA SVS Deep Star Maps 2020';
 };
 const apply=value=>{
  if(!alive||!value)return;
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  asset=value;objectUrl=URL.createObjectURL(value.blob);
  image.src=objectUrl;
  show();
 };
 image.onerror=()=>{asset=null;show();status.textContent='Image decoding failed. Using the bundled star map.';};
 toggle.onchange=()=>{
  try{localStorage.setItem('orbital_apod_enabled',toggle.checked?'yes':'no');}catch{}
  show();
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  const submit=form.querySelector('button');
  submit.disabled=true;status.textContent='Checking NASA APOD…';
  const result=await refreshApod(key.value);key.value='';
  if(!alive)return;
  submit.disabled=false;status.textContent=statuses[result.status];
  if(result.asset){toggle.checked=true;toggle.onchange();apply(result.asset);}
 };
 cachedApod().then(apply).catch(()=>{});
 dialog.addEventListener('toggle',()=>{
  if(!dialog.open||dialog.dataset.credits)return;
  dialog.dataset.credits='loaded';
  atlasCredits().then(entries=>{
   if(!alive)return;
   const list=dialog.querySelector('[data-atlas-credits]');
   for(const entry of entries){
    const item=document.createElement('li'),link=document.createElement('a');
    link.href=entry.source;link.target='_blank';link.rel='noopener';
    link.textContent=entry.credit;item.textContent=entry.processing+' · ';item.append(link);
    if(entry.license){
     const license=document.createElement('a');license.href=entry.license;license.textContent=entry.usage;license.target='_blank';license.rel='noopener';
     item.append(' · ',license);
    }
    list.append(item);
   }
  }).catch(()=>{dialog.querySelector('[data-atlas-credits]').textContent='Detailed bundled image credits are unavailable.';});
 });
 return ()=>{alive=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
}

export const agencyMarkup=`<details id="atlas-media" class="program-media"><summary>Imagery and background</summary><p data-apod-credit>Default background · NASA SVS Deep Star Maps 2020</p><label><input type="checkbox" data-apod-show> Use a cached NASA APOD image</label>
 <form><label>Personal NASA API key <input type="password" autocomplete="off" spellcheck="false"></label><button class="orbital-button">Fetch APOD</button></form><p data-media-status role="status"></p><p>The key is used for this request. Only an eligible image and its attribution are cached. Core flight systems use bundled resources.</p><ul data-atlas-credits></ul>
 <a href="https://api.nasa.gov/" target="_blank" rel="noopener">NASA API catalogue</a> · <a href="https://www.nasa.gov/nasa-brand-center/images-and-media/" target="_blank" rel="noopener">NASA media usage</a></details>`;
