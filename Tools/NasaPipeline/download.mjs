import fs from 'node:fs/promises';
import crypto from 'node:crypto';
export const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const allowed=new Set(['cmr.earthdata.nasa.gov','pds-geosciences.wustl.edu','firms.modaps.eosdis.nasa.gov','nrt3.modaps.eosdis.nasa.gov']);
const pins=JSON.parse(await fs.readFile(new URL('./pins.json',import.meta.url),'utf8')).resources;
// Tooling only. Credentials are never written into cache records or game assets.
export async function download(url,{cacheDir='Verification/Sol61-2026-11-10/SourceCache',range,maxBytes=8*1024*1024,token,fetcher=fetch}={}){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||!allowed.has(parsed.hostname)||parsed.username||parsed.password)throw Error('Unsupported NASA download origin');
 if(parsed.searchParams.has('MAP_KEY')||/Bearer|token=/i.test(url))throw Error('Do not persist credential URLs');
 const key=sha256(url+'|'+(range||'')),file=cacheDir+'/'+key;
 const pin=pins.find(p=>p.url===url&&(p.range??null)===(range??null));
 await fs.mkdir(cacheDir,{recursive:true});
 try{
  const [bytes,record]=await Promise.all([fs.readFile(file+'.bin'),fs.readFile(file+'.json','utf8').then(JSON.parse)]);
  if(bytes.length>maxBytes||sha256(bytes)!==record.sha256||record.url!==url||record.range!==(range??null))throw Error('Corrupted NASA cache: '+key);
  if(pin&&sha256(bytes)!==pin.sha256)throw Error('NASA source changed; preserve old bundle and review a new version.');
  return {bytes,record};
 }catch(error){if(error.code!=='ENOENT')throw error;}
 let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const headers={Accept:'*/*'};if(range)headers.Range=range;if(token)headers.Authorization='Bearer '+token;
   const response=await fetcher(url,{headers,redirect:'manual',signal:AbortSignal.timeout(20000)});
   if(response.status===401||response.status===403||response.status===302||response.status===303)throw Object.assign(Error('NASA download requires authorized archive access; no data bundle was substituted.'),{permanent:true});
   if(!response.ok||range&&response.status!==206)throw Error('NASA endpoint status '+response.status+(range?' (byte range required)':''));
   if(Number(response.headers.get('content-length'))>maxBytes)throw Object.assign(Error('NASA response exceeds download bound'),{permanent:true});
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Object.assign(Error('NASA stream exceeds download bound'),{permanent:true});chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);
   if(pin&&sha256(bytes)!==pin.sha256)throw Object.assign(Error('NASA source changed; preserve old bundle and review a new version.'),{permanent:true});
   if(/text\/html/i.test(response.headers.get('content-type')||'')&&!/\.html?$/.test(parsed.pathname))throw Object.assign(Error('NASA returned HTML instead of scientific data'),{permanent:true});
   const record={url,range:range??null,retrievedAtUTC:new Date().toISOString(),sha256:sha256(bytes),bytes:bytes.length,contentRange:response.headers.get('content-range')};
   await fs.writeFile(file+'.bin',bytes);await fs.writeFile(file+'.json',JSON.stringify(record,null,2));return {bytes,record};
  }catch(error){last=error;if(error.permanent||attempt===2)break;await new Promise(r=>setTimeout(r,500*2**attempt));}
 }
 throw last;
}
