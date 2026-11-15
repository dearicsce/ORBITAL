const CACHE_NAME='orbital-agency-media-v1';
const META_KEY='orbital_apod_metadata_v1';
const INTERVAL=12*60*60*1000;
const BACKOFF=10*60*1000;
const MAX_IMAGE=5*1024*1024;
const nasaHosts=['apod.nasa.gov','svs.gsfc.nasa.gov','images-assets.nasa.gov','assets.science.nasa.gov','www.nasa.gov'];
const types=['image/jpeg','image/png','image/webp'];
let pending;

export function imageApod(payload){
 if(payload?.media_type!=='image'||payload.copyright||typeof payload.title!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(payload.date||''))return null;
 try{
  const url=new URL(payload.url);
  if(url.protocol!=='https:'||url.username||url.password||!nasaHosts.includes(url.hostname))return null;
  return {url:url.href,title:payload.title.slice(0,150),date:payload.date,credit:'NASA Astronomy Picture of the Day'};
 }catch{return null;}
}

const read=(storage,key)=>{
 try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}
};
const write=(storage,key,value)=>{try{storage?.setItem(key,JSON.stringify(value));}catch{}};

export async function cachedApod({storage=globalThis.localStorage,caches=globalThis.caches}={}){
 const meta=read(storage,META_KEY);
 if(!meta?.entry||!Number.isFinite(meta.updatedAt)||!imageApod({...meta.entry,media_type:'image'}))return null;
 try{
  const cache=await caches?.open(CACHE_NAME);
  const response=await cache?.match(meta.entry.url);
  if(!response?.ok)return null;
  const blob=await response.blob();
  if(!types.includes(blob.type)||blob.size>MAX_IMAGE||!blob.size)return null;
  return {...meta.entry,updatedAt:meta.updatedAt,blob};
 }catch{return null;}
}

export function refreshApod(apiKey,{storage=globalThis.localStorage,caches=globalThis.caches,fetcher=globalThis.fetch,now=Date.now()}={}){
 if(pending)return pending;
 const key=String(apiKey||'').trim();
 if(!key||!/^[a-z0-9_-]{8,80}$/i.test(key)||key==='DEMO_KEY')return Promise.resolve({status:'key'});
 const options={storage,caches};
 pending=(async()=>{
  const previous=read(storage,META_KEY)||{};
  const existing=await cachedApod(options);
  if(existing&&now-existing.updatedAt<INTERVAL)return {status:'cached',asset:existing};
  if(previous.attemptedAt&&now-previous.attemptedAt<BACKOFF)return {status:'backoff',asset:existing};
  write(storage,META_KEY,{...previous,attemptedAt:now});
  try{
   const query=new URL('https://api.nasa.gov/planetary/apod');
   query.searchParams.set('api_key',key);
   const response=await fetcher(query,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});
   if(response.status===429)return {status:'rate',asset:existing};
   if(!response.ok)return {status:'offline',asset:existing};
   const entry=imageApod(await response.json());
   if(!entry)return {status:'unsupported',asset:existing};
   const photo=await fetcher(entry.url,{credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(8000)});
   const size=Number(photo.headers.get('content-length'));
   if(!photo.ok||size>MAX_IMAGE)return {status:'offline',asset:existing};
   const blob=await photo.blob();
   if(!types.includes(blob.type)||blob.size>MAX_IMAGE||!blob.size)return {status:'unsupported',asset:existing};
   const cache=await caches?.open(CACHE_NAME);
   if(cache){
    await cache.put(entry.url,new Response(blob,{headers:{'Content-Type':blob.type}}));
    if(previous.entry?.url&&previous.entry.url!==entry.url)await cache.delete(previous.entry.url);
    write(storage,META_KEY,{attemptedAt:now,entry,updatedAt:now});
   }
   return {status:'updated',asset:{...entry,updatedAt:now,blob}};
  }catch{return {status:'offline',asset:existing};}
 })().finally(()=>{pending=null;});
 return pending;
}

export async function atlasCredits(){
 const response=await fetch(new URL('../../textures/atlas/manifest.json',import.meta.url));
 if(!response.ok)throw Error('Image credits unavailable');
 return (await response.json()).assets;
}
