import fs from 'node:fs/promises';
import {download,sha256} from './download.mjs';
const diviner='https://pds-geosciences.wustl.edu/lro/urn-nasa-pds-lro_diviner_derived1/data_derived_pcp/seasonal/slon/pols/pcp_avg_tbol_pols_ls030_slon01_240';
const lola='https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/float_img/ldem_75s_240m_float';
const label=await download(diviner+'.xml'),lolaLabel=await download(lola+'.lbl');
if(!label.bytes.toString().includes('1737.4')||!label.bytes.toString().includes('record_length unit="byte">68')||!lolaLabel.bytes.toString().includes('LINE_SAMPLES          = 3812')||!lolaLabel.bytes.toString().includes('SAMPLE_TYPE           = PC_REAL'))throw Error('Review changed PDS schema before ingesting');
// Pinned, complete 68-byte records in one bounded excerpt. Unsampled cells are
// unknown. This is not a full south-polar map and not a minimum-temperature map.
const first=107989644,last=first+68*1920-1;
const thermal=await download(diviner+'.tab',{range:`bytes=${first}-${last}`,maxBytes:200000});
let rows=thermal.bytes.toString().trim().split(/\r?\n/).map(line=>line.split(',').map(Number));
if(rows.some(a=>a.length!==6||!a.every(Number.isFinite)||a[3]<-90||a[3]>-79||a[2]<-180||a[2]>360||a[5]<0||a[5]>450))throw Error('Invalid Diviner source record');
rows=rows.filter(a=>a[3]<-88);
if(rows.length<20)throw Error('Pinned excerpt has too few valid south-polar cells');
rows=rows.filter((_,i)=>i%Math.ceil(rows.length/24)===0).slice(0,24);
const grid=rows.map(a=>{
 const rho=2*1737400*Math.tan((Math.PI/2+a[3]*Math.PI/180)/2),lon=a[2]*Math.PI/180;
 const x=rho*Math.sin(lon),y=rho*Math.cos(lon);
 return {row:Math.round(1905.5-y/240),column:Math.round(1905.5+x/240),latitudeDeg:a[3],longitudeDeg:a[2],temperatureK:a[5],localTimeHours:a[4]};
});
const minRow=Math.min(...grid.map(p=>p.row)),maxRow=Math.max(...grid.map(p=>p.row));
if(minRow<0||maxRow>=3812||grid.some(p=>p.column<0||p.column>=3812))throw Error('Lunar coordinate outside LOLA grid');
const start=minRow*3812*4,end=(maxRow+1)*3812*4-1;
const elevation=await download(lola+'.img',{range:`bytes=${start}-${end}`});
const targets=grid.map((p,i)=>{
 const value=elevation.bytes.readFloatLE(((p.row-minRow)*3812+p.column)*4);
 if(!Number.isFinite(value)||value< -10||value>12)throw Error('Invalid LOLA height');
 return {...p,id:'cold-context-'+i,elevationM:value*1000,valid:true};
});
const extent={west:Math.min(...targets.map(t=>t.longitudeDeg)),east:Math.max(...targets.map(t=>t.longitudeDeg)),south:Math.min(...targets.map(t=>t.latitudeDeg)),north:Math.max(...targets.map(t=>t.latitudeDeg))};
const source=(id,name,version,url,data,from,to,units,frame)=>({id,provider:'NASA PDS / LRO',productName:name,productVersion:version,sourceUrl:url,retrievedAtUTC:data.record.retrievedAtUTC,observedStartUTC:from,observedEndUTC:to,units,resolution:{value:240,units:'m',meaning:'grid spacing at pole, not guaranteed resolving power'},extent,coordinateSystem:frame,timeScale:'UTC',missingValueMeaning:'Unsampled and empty bins are unknown',attribution:id==='diviner-pcp'?'LRO Diviner Science Team / UCLA / Jean-Pierre Williams':'LRO LOLA Science Team / NASA Goddard / David E. Smith',redistributionNotes:'NASA PDS scientific archive. Retain product label, attribution and processing limitations; no endorsement.',rawChecksum:data.record.sha256,rawRange:data.record.range,fullProductChecksum:null});
const products=[source('diviner-pcp','Diviner seasonal average bolometric brightness temperature PCP','1.0',diviner+'.tab',thermal,'2009-07-05T16:50:26.195Z','2020-03-15T00:00:00Z','K','Moon planetocentric latitude, east longitude; seasonal Ls 0–60°, subsolar longitude 0–15°'),source('lola-gdr','LOLA LDEM_75S_240M height grid','V2.1',lola+'.img',elevation,'2009-07-13T17:33:17Z','2017-02-02T22:18:35Z','m (converted from km)','Moon ME/PA DE421 body-fixed; south polar stereographic; sphere 1737400 m')];
const bundle={id:'lunar-polar-context-1',schemaVersion:1,scenarioVersion:1,productIds:products.map(p=>p.id),processingVersion:'orbital-lunar-nearest-1',geographicBounds:extent,referenceTime:'2020-03-15T00:00:00Z',targets,validityMask:targets.map(()=>true),assumptions:{deadlineSec:32400,minimumElevationDeg:20,minimumDeliveredMinutes:1,description:'Authored orbital context inspection. Temperature is a multi-year seasonal average; cold conditions are not proof of ice. No terrain illumination solution is claimed. Other locations are unknown.'},scoringVersion:'nasa-context-1'};
bundle.processedChecksum=sha256(JSON.stringify(bundle));
await fs.mkdir('Tools/EmbeddedUI/NasaData',{recursive:true});
await fs.writeFile('Tools/EmbeddedUI/NasaData/lunar-polar-context-1.json',JSON.stringify({products,bundle,processing:{sourceRecords:[label.record,lolaLabel.record,thermal.record,elevation.record],method:'Select complete Diviner excerpt cells south of 88 S; evenly subsample <=24 cells; nearest LOLA polar grid sample. Temperatures remain source averages. Elevations convert km to m. Horizontal sampling mismatch up to 170 m, distinct acquisition periods and frames limit interpretation.'}},null,2)+'\n');
console.log('Acquired '+targets.length+' matching lunar source cells; '+bundle.processedChecksum);
