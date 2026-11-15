import {addAdvancedCatalogue} from './advancedCatalogue.js';
// Authored educational trade-offs, not specifications of measured flight hardware.
// Every row changes resources consumed by the existing engineering/operations model.
export function extendCatalogue(data){
 if(data.workshopCatalogueVersion===1)return data;
 const all=[...data.parts,...data.instruments];
 const add=(base,id,name,values,price,bays=1)=>{const source=all.find(p=>p.id===base);if(!source)throw Error('Missing catalogue prototype '+base);
  const p={...structuredClone(source),...values,id,name,visualId:source.visualId||base,unlock:'purchase',unlockPrice:price,bayUnits:bays,
   description:'Educational balance: '+name+'. Compare mass, construction cost, power and system capacity for your mission.',balanceStatus:'Authored educational balance; not measured flight hardware'};
  if(!source.type){p.roleId=base;data.instruments.push(p);}else data.parts.push(p);
 };
 // Panels retain the original paired-array resource convention; the Workshop displays single wings.
 for(const [id,name,visual,mass,power,cost,length,price]of [
  ['compact','Compact low-cost wing','s',6,50,1, .85,80],['film','Light deployable wing','m',8,150,3.2,1.6,180],['rigid','Economy rigid wing','s',15,120,1.8,1.1,100],
  ['efficient','High-efficiency compact wing','s',10,190,5,1.1,300],['economy','Economy survey wing','m',20,230,2.7,1.65,130],['survey','Survey power wing','m',22,360,5.2,1.65,240],
  ['relay','Relay power wing','l',44,650,8.5,2.2,350],['deep','Deep-space power wing','l',38,780,14,2.2,550],['heavy','High-output heavy wing','l',65,1050,13,2.6,650]
 ])add('panel_'+visual,'panel_'+id,name,{mass,power,powerGen:power,cost,wingLength:length,visualId:'solar_wing_'+visual},price);
 for(const [id,name,mass,capacityWh,cost,price,bays]of [
  ['reserve','Micro reserve battery',3,55,.6,60,1],['light','Light lithium battery',7,180,2,100,1],['economy','Economy battery',20,350,1.8,90,2],
  ['compact','Compact high-density battery',12,450,5,240,1],['eclipse','Long-eclipse battery',30,750,4.8,200,2],['rugged','Heavy reserve battery',42,900,4.4,180,2],
  ['relay','Relay battery bank',55,1500,8,350,3],['deep','Deep-space battery bank',65,2200,12,500,3],['heavy','Heavy service battery bank',100,3500,16,650,4]
 ])add('battery_m','battery_'+id,name,{mass,capacityWh,cost},price,bays);
 for(const [id,name,mass,power,baseDownlinkGbDay,cost,price]of [
  ['beacon','Low-power beacon',1,2,.12,.4,50],['telemetry','Telemetry radio',2,4,.8,.8,70],['low_s','Low-power S-band',3,5,2,1.2,90],
  ['survey_s','Survey S-band',5,12,6,1.8,120],['compact_x','Compact X-band',4,10,15,3.5,180],['efficient_x','Efficient X-band',7,14,30,5.5,250],
  ['high_x','High-rate X-band',14,38,75,6,300],['economy_dish','Economy dish link',20,45,90,5.5,280],['deep_link','Deep-space link',30,65,180,14,550],
  ['high_ka','High-throughput Ka-band',24,95,300,15,600],['relay_link','Service relay link',40,120,450,18,700]
 ])add(id.includes('dish')||id==='deep_link'?'comms_dish_m':id.includes('ka')?'comms_ka_band':id.includes('_x')?'comms_x_band':'comms_s_band','comms_'+id,name,{mass,power,baseDownlinkGbDay,transmitPowerW:power,standbyPowerW:power*.25,cost},price);
 for(const [id,name,mass,power,maxDataGbDay,recorderCapacityGb,cost,radTolerant,price,bays]of [
  ['lowpower','Low-power controller',1,2,4,4,.7,false,80,1],['recorder','Large-recorder computer',6,12,30,64,4,false,200,2],
  ['processor','High-throughput processor',8,28,180,16,5,false,260,2],['hardened','Hardened compact controller',5,10,35,24,7,true,350,1],
  ['deep','Deep-space science computer',12,35,250,128,14,true,650,3]
 ])add('computer_basic','computer_'+id,name,{mass,power,maxDataGbDay,recorderCapacityGb,cost,radTolerant},price,bays);
 for(const [id,name,mass,power,quality,cost,price,bays]of [
  ['light','Light magnetic controller',1,2,'coarse',.5,60,1],['economy','Economy wheel cluster',8,12,'fine',1.5,100,2],
  ['compact','Compact fine controller',4,8,'fine',3.5,220,1],['precision','Precision wheel cluster',12,25,'precision',6,350,2],['deep','Precision deep-space controller',20,40,'precision',10,500,3]
 ])add(quality==='coarse'?'pointing_magnetorquers':quality==='fine'?'pointing_reaction_wheels':'pointing_star_tracker','pointing_'+id,name,{mass,power,quality,cost,magneticOnly:quality==='coarse'},price,bays);
 for(const [id,name,mass,fuelKg,cost,price,bays]of [
  ['trim','Trim propellant pack',4,2,.4,50,1],['light','Light propellant pack',12,8,1.2,100,1],['economy','Economy propellant tank',40,25,2,130,2],
  ['transfer','Transfer propellant tank',75,55,5,300,3],['deep','Deep-space reserve tank',150,120,9,500,4]
 ])add('fuel_s','fuel_'+id,name,{mass,fuelKg,cost},price,bays);
 for(const [base,id,name,mass,power,dataPerDay,value,cost,pointing,price]of [
  ['optical_camera','wide_camera','Wide-field survey camera',5,8,5,3,1.5,'coarse',90],['optical_camera','compact_camera','Compact mapping camera',8,15,12,5,3,'fine',180],
  ['optical_camera','hires_camera','High-resolution mapping camera',25,65,80,10,10,'precision',450],['thermal_imager','compact_thermal','Compact thermal scanner',6,12,3,4,3,'fine',160],
  ['thermal_imager','thermal_survey','Wide-swath thermal scanner',18,38,12,8,6,'fine',300],['weather_imager','weather_wide','Wide-field weather imager',12,22,15,6,4,'fine',200],
  ['weather_imager','weather_fast','Rapid weather imager',25,55,50,10,9,'precision',450],['radar_imager','radar_compact','Compact radar mapper',35,95,40,8,9,'fine',400],
  ['spectrometer','compact_spectrometer','Compact spectral analyser',8,18,4,4,4,'fine',230],['spectrometer','precision_spectrometer','Precision spectral analyser',30,70,22,10,12,'precision',550],
  ['laser_altimeter','compact_altimeter','Compact laser altimeter',12,28,8,5,5,'fine',300],['neutron_detector','light_neutron','Light neutron sensor',7,9,1,3,3,'coarse',180],
  ['magnetometer','field_survey','Field survey magnetometer',5,6,.4,4,2,'coarse',130]
 ])add(base,id,name,{mass,power,dataPerDay,value,cost,pointing},price);
 addAdvancedCatalogue(add);
 for(const p of data.parts)if(p.type==='fuel'){p.name=p.name.replace('Fuel pack','Integrated propulsion pack').replace(/propellant (pack|tank|bank)/ig,'propulsion pack').replace('Deep-space reserve tank','Deep-space propulsion pack');p.includesThruster=true;p.dryHardwareKg=p.mass-p.fuelKg;p.description='Integrated thruster, controller and propellant tank. Wet mass includes propellant. Uses the mission’s guided insertion and annual fuel budget; thrust and specific impulse are not simulated.';p.bayUnits??=p.id==='fuel_l'?3:p.id==='fuel_m'?2:1;}
 data.workshopCatalogueVersion=1;return data;
}
