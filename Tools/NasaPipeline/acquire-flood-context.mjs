import fs from 'node:fs';
import crypto from 'node:crypto';
import {fromArrayBuffer} from '../Dependencies/FloodProcessing/node_modules/geotiff/dist-module/geotiff.js';
const evidence='Verification/CompleteGameplay-2026-11-11';
const url='https://nrt3.modaps.eosdis.nasa.gov/archive/allData/61/MCDWD_L3_F2_NRT/2026/314/MCDWD_L3_F2_NRT.A2026314.h24v06.061.tif';
const file=evidence+'/flood-2026314.tif',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
if(!fs.existsSync(file)){const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Official numerical TIFF unavailable: '+r.status);fs.writeFileSync(file,Buffer.from(await r.arrayBuffer()));}
const bytes=fs.readFileSync(file),rawChecksum=sha(bytes);
const pinPath='Tools/NasaPipeline/flood-pin.json';
const pin=fs.existsSync(pinPath)?JSON.parse(fs.readFileSync(pinPath)):null;
if(pin&&pin.sha256!==rawChecksum)throw Error('Pinned numerical flood input changed');
const bundlePath='Tools/EmbeddedUI/NasaData/sindh-flood-20261110-1.json';
// Preserve the first acquisition's attribution snapshot when reacquiring exact
// pinned bytes. A new retrieval date must not invalidate historical saves.
const retrievedAtUTC=pin?.retrievedAtUTC??(fs.existsSync(bundlePath)?JSON.parse(fs.readFileSync(bundlePath)).products[0].retrievedAtUTC:fs.statSync(file).mtime.toISOString());
if(bytes.readUInt16LE(0)!==0x4949||bytes.readUInt16LE(2)!==42)throw Error('Not a numerical TIFF');
const tiff=await fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),image=await tiff.getImage();
const bounds=image.getBoundingBox(),width=image.getWidth(),height=image.getHeight();
if(JSON.stringify(bounds)!==JSON.stringify([60,20,70,30])||width!==4800||height!==4800)throw Error('Unexpected flood grid/alignment');
const [raster]=await image.readRasters(),counts={},byClass={0:[],1:[],2:[],3:[],255:[]};
for(let i=0;i<raster.length;i++){const value=raster[i];if(!Object.hasOwn(byClass,value))throw Error('Unknown class encoding '+value);counts[value]=(counts[value]??0)+1;byClass[value].push(i);}
const targets=[];
for(const value of [3,2,1,0,255]){
 const cells=byClass[value],count=Math.min(value===3?16:4,cells.length);
 for(let j=0;j<count;j++){
  const index=cells[Math.floor((j+.5)*cells.length/count)],row=Math.floor(index/width),column=index%width;
  targets.push({id:'flood-cell-'+value+'-'+j,row,column,latitudeDeg:30-(row+.5)*10/height,longitudeDeg:60+(column+.5)*10/width,
   floodClass:value,valid:value!==255,unknown:value===255,cloudStatus:'unknown; cloud-specific mask unavailable in this GeoTIFF'});
 }
}
const product={id:'mcdwd-f2-2026314-h24v06',provider:'NASA LANCE / MODIS Terra+Aqua',productName:'MODIS 2-day flood classification GeoTIFF',productVersion:'Collection 6.1',sourceUrl:url,
 retrievedAtUTC,observedStartUTC:'2026-11-09T00:00:00Z',observedEndUTC:'2026-11-10T23:59:59Z',units:'categorical: 0 no water; 1 expected surface water; 2 recurring flood; 3 unusual flood; 255 insufficient data',
 coordinateSystem:'10 degree linear latitude/longitude tile h24v06; TIFF Clarke 1866 ellipsoid, unspecified datum; spherical game projection, no precision datum transformation',timeScale:'UTC',
 resolution:{value:10/4800,units:'degrees',meaning:'Native pixel spacing (~232 m at equator), not fictional camera sample size'},extent:{west:60,east:70,south:20,north:30},
 missingValueMeaning:'255 insufficient data is unknown, never dry. All cloud-specific mask entries remain unknown; no clear-sky inference.',attribution:'NASA LANCE MODIS Flood Product Team',
 redistributionNotes:'Retain NASA product citation DOI 10.5067/MODIS/MCDWD_L3_F2_NRT.061 and user guide. Numerical product, no endorsement.',rawChecksum,
 encodingSource:'https://www.earthdata.nasa.gov/s3fs-public/2025-04/MCDWD_VCDWD_UserGuide_RevE_04.22.25.pdf',qualityLimit:'2-day optical composite; cloud shadows can cause false positives. Full HDF cloud/count layers were not obtainable without archive authorization.'};
const bundle={id:'sindh-flood-20261110-1',schemaVersion:1,scenarioVersion:1,productIds:[product.id],processingVersion:'orbital-flood-native-cells-1',
 geographicBounds:{west:60,east:70,south:20,north:30},referenceTime:'2026-11-10T23:59:59Z',targets,validityMask:targets.map(t=>t.valid),unknownMask:targets.map(t=>t.unknown),cloudMask:targets.map(()=>null),
 assumptions:{deadlineSec:29700,minimumElevationDeg:45,minimumDeliveredMinutes:1,
 description:'Archived numerical flood-context follow-up, tile 60–70 E / 20–30 N, 9–10 November 2026. No real-time response claim. Validity and unknown masks derive from native class encoding; cloud-specific mask unavailable and remains unknown. Sparse selected cells are not a flood-area estimate. Broad context versus flood-class priority is an authored inspection policy; simulated follow-up receipt deadline 495 min.'},scoringVersion:'nasa-context-1'};
bundle.processedChecksum=sha(JSON.stringify(bundle));
const entry={products:[product],bundle,processing:{method:'Decode complete numerical GeoTIFF; verify 4800x4800 grid and native tags; select stratified native pixel centers, no resampling or browse-colour classification.',nativeClassCounts:counts,cloudMaskStatus:'unknown; not available',sourceUrl:url,rawChecksum}};
fs.writeFileSync(bundlePath,JSON.stringify(entry,null,2)+'\n');
fs.writeFileSync(pinPath,JSON.stringify({url,sha256:rawChecksum,bytes:bytes.length,retrievedAtUTC,grid:bounds,counts},null,2)+'\n');
fs.writeFileSync(evidence+'/flood-processing.json',JSON.stringify(entry.processing,null,2)+'\n');
console.log('Prepared '+targets.length+' actual source cells. Cloud-specific input remains unavailable. '+rawChecksum);
