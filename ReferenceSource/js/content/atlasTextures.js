export const ATLAS_TEXTURES={
 earth:{file:'earth-clouds.jpg',rotationHours:23.934,tiltDeg:23.44,color:0x3c8db3,caption:'Blue Marble + NOAA cloud composite · NASA Goddard SVS'},
 sun:{file:'sun.jpg',rotationHours:25.38*24,tiltDeg:7.25,color:0xe7741f,caption:'False-colour 304 Å Carrington map · NASA JPL / SDO / STEREO'},
 venus:{file:'venus-radar.jpg',rotationHours:243.025*24,tiltDeg:177.4,color:0xc49567,caption:'Magellan radar surface · processed and gap-filled · NASA/JPL-Caltech'},
 mars:{file:'mars.jpg',rotationHours:24.623,tiltDeg:25.19,color:0xae6048,caption:'Processed Viking mosaic · NASA/JPL-Caltech and USGS'},
 jupiter:{file:'jupiter.jpg',rotationHours:9.925,tiltDeg:3.13,flatten:.94,color:0xcba174,caption:'Cassini cloud map · reconstructed colour · NASA/JPL/SSI with ESA and ASI'},
 europa:{file:'europa.jpg',rotationHours:85.23,tiltDeg:.1,color:0xbca7a1,caption:'Processed Voyager mosaic · USGS / JPL-Caltech'},
 saturn:{file:'saturn.jpg',rotationHours:10.7,tiltDeg:26.73,flatten:.90,rings:true,color:0xbdae7f,caption:'Illustrative JPL-Caltech cloud texture · schematic ring geometry'},
 uranus:{rotationHours:17.24,tiltDeg:97.8,flatten:.98,rings:true,color:0x9ed9df,caption:'Schematic globe and rings'},
 neptune:{file:'neptune.jpg',rotationHours:16.11,tiltDeg:28.32,flatten:.98,color:0x547dcc,caption:'Illustrative cloud texture · Don Davis / JPL-Caltech'},
 moon:{file:'../moon/lroc_color_2k.jpg',rotationHours:655.72,tiltDeg:6.68,color:0x9a9995,caption:'LRO LROC processed colour mosaic · NASA SVS / LRO'}
};

export const EARTH_ATLAS_LAYERS={
 clouds:{name:'Surface and clouds',file:'earth-clouds.jpg',caption:ATLAS_TEXTURES.earth.caption},
 surface:{name:'Surface mosaic',file:'earth-surface.jpg',caption:'Blue Marble surface mosaic · NASA Goddard SVS / Reto Stockli'},
 night:{name:'Night lights',file:'earth-night.jpg',caption:'Historical DMSP night-lights composite · NASA Goddard SVS',unlit:true}
};

export const atlasTexture=file=>new URL('../../textures/atlas/'+file,import.meta.url).href;
