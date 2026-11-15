"""Pin NASA Eyes map faces and convert their published cube frames to lat/lon.

Run from the project root. Sources stay under Verification; only the processed
maps and a provenance manifest enter the offline player. No Eyes application
code or network-dependent runtime is embedded.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request
from PIL import Image
import numpy as np
import hashlib
import json
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'Verification/SceneRepair/Research/MapFaces'
OUT = ROOT / 'Tools/EmbeddedUI/eyes-textures'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'https://eyes.nasa.gov/assets/static/maps/'
# NASA Eyes CubeMap.defaultCubeMapFaceFrames: U, V, outward normal, Z north.
FRAMES = [((0,1,0),(0,0,1),(1,0,0)),((-1,0,0),(0,0,1),(0,1,0)),
          ((0,-1,0),(0,0,1),(-1,0,0)),((1,0,0),(0,0,1),(0,-1,0)),
          ((0,1,0),(-1,0,0),(0,0,1)),((0,1,0),(1,0,0),(0,0,-1))]
SPECS = [('earth','color',4096,'png'),('earth','cloud',512,'png'),
         ('earth','night',512,'png'),('earth','specular',512,'png')]
SPECS += [(p,'color',256 if p in ['uranus','neptune'] else 512,
           'jpg' if p=='jupiter' else 'png')
          for p in ['sun','mercury','venus','moon','mars','jupiter','saturn','uranus','neptune']]

def acquire(job):
    planet, layer, size, ext, face = job
    relative=f'{planet}/{layer}_{size}_{face}.{ext}'
    url=BASE+relative
    local=CACHE / relative.replace('/','-')
    if not local.exists():
        with urlopen(Request(url, headers={'User-Agent':'ORBITAL-offline-assets/1.0'}), timeout=90) as r:
            data=r.read()
        # Decode before accepting a response as an asset.
        import io
        with Image.open(io.BytesIO(data)) as image:
            assert image.size==(size,size), (url,image.size)
        local.write_bytes(data)
    data=local.read_bytes()
    return {'url':url,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'local':local}

jobs=[(*spec,face) for spec in SPECS for face in range(6)]
with ThreadPoolExecutor(max_workers=8) as pool:
    sources=list(pool.map(acquire,jobs))

def convert(spec, sources):
    planet, layer, size, ext=spec
    width=4096 if size==4096 else 2048
    height=width//2
    output=np.zeros((height,width,4),dtype=np.uint8)
    lon=(np.arange(width)+.5)/width*2*np.pi-np.pi
    # Process strips to bound memory on the player's authoring PC.
    images=[np.asarray(Image.open(s['local']).convert('RGBA'),dtype=np.float32) for s in sources]
    for row in range(0,height,128):
        stop=min(height,row+128)
        lat=np.pi/2-(np.arange(row,stop)+.5)/height*np.pi
        x=np.cos(lat[:,None])*np.cos(lon[None,:])
        y=np.cos(lat[:,None])*np.sin(lon[None,:])
        z=np.broadcast_to(np.sin(lat[:,None]),x.shape)
        xyz=np.stack((x,y,z),axis=-1)
        dots=np.stack([xyz@np.array(frame[2]) for frame in FRAMES],axis=-1)
        selected=np.argmax(dots,axis=-1)
        for face,(u,v,n) in enumerate(FRAMES):
            mask=selected==face
            vec=xyz[mask]
            divisor=vec@np.array(n)
            px=np.clip(((vec@np.array(u))/divisor+1)*.5*size-.5,0,size-1)
            py=np.clip((1-(vec@np.array(v))/divisor)*.5*size-.5,0,size-1)
            ix,iy=np.floor(px).astype(int),np.floor(py).astype(int)
            jx,jy=np.minimum(ix+1,size-1),np.minimum(iy+1,size-1)
            a=(px-ix)[:,None];b=(py-iy)[:,None]
            image=images[face]
            values=(image[iy,ix]*(1-a)+image[iy,jx]*a)*(1-b)+(image[jy,ix]*(1-a)+image[jy,jx]*a)*b
            output[row:stop][mask]=np.round(values).astype(np.uint8)
    file=f'{planet}-{layer}.'+('png' if layer=='cloud' else 'jpg')
    image=Image.fromarray(output,'RGBA')
    if layer=='cloud': image.save(OUT/file,optimize=True)
    else: image.convert('RGB').save(OUT/file,quality=94,subsampling=0)
    data=(OUT/file).read_bytes()
    print(file,len(data),flush=True)
    return {'file':file,'width':width,'height':height,'sha256':hashlib.sha256(data).hexdigest(),
            'sources':[{k:v for k,v in s.items() if k!='local'} for s in sources]}

processed=[convert(spec,sources[i*6:i*6+6]) for i,spec in enumerate(SPECS)]
manifest={'schemaVersion':1,'acquiredUTC':datetime.now(timezone.utc).isoformat(),
          'source':'NASA/JPL Eyes on the Solar System',
          'sourcePage':'https://eyes.nasa.gov/apps/solar-system/',
          'credit':'NASA/JPL-Caltech. Original Eyes planetary maps; reprojected for ORBITAL.',
          'processing':'Bilinear cube-face sampling into equirectangular maps. No geographic relabeling.',
          'limitations':'Static visual maps. No live imagery, NASA trajectory engine, or Eyes application code.',
          'files':processed}
(OUT/'provenance.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
