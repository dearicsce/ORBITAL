// Additional authored resource trade-offs. Names make no claims about unmodelled
// discharge rates, engine thrust, tracking hardware or measured flight performance.
export function addAdvancedCatalogue(add){
 for(const [id,name,mass,power,cost,wingLength,price]of [
  ['nano','Nano reserve wing',3,35,.7,.7,60],['short','Short survey wing',7,95,2,.95,110],
  ['stiff','Heavy compact wing',18,165,2.3,1.15,140],['lowmass','Low-mass survey wing',11,280,6.8,1.9,320],
  ['broad','Broad low-cost wing',32,420,4.7,2.4,220],['dense','Dense compact power wing',24,520,10.5,1.5,460],
  ['service','Service power wing',55,900,10,2.8,500],['observatory','Observatory power wing',85,1500,24,3.2,800]
 ])add('panel_m','panel_'+id,name,{mass,power,powerGen:power,cost,wingLength},price);
 for(const [id,name,mass,capacityWh,cost,price,bays]of [
  ['minimal','Minimal battery module',2,30,.3,40,1],['compact90','Compact 90 Wh module',4,90,1.3,80,1],
  ['service250','Service 250 Wh module',16,250,1.4,100,1],['dense600','Dense 600 Wh module',17,600,7.5,320,2],
  ['economy1100','Economy 1100 Wh bank',52,1100,4.7,220,3],['survey1800','Survey 1800 Wh bank',60,1800,9.5,400,3],
  ['compact2800','Compact 2800 Wh bank',75,2800,19,650,4],['station5000','Station 5000 Wh bank',160,5000,22,800,6]
 ])add('battery_m','battery_'+id,name,{mass,capacityWh,cost},price,bays);
 for(const [id,name,mass,power,baseDownlinkGbDay,cost,requiredPointing,price]of [
  ['micro_x','Micro X-band link',2.5,8,8,4,'fine',160],['survey_link','Survey directional link',11,22,50,4.5,'fine',230],
  ['precision_link','Precision high-gain link',23,55,240,16,'precision',550],['deep_service','Deep-service high-gain link',55,160,700,26,'precision',900]
 ])add('comms_x_band','comms_'+id,name,{mass,power,baseDownlinkGbDay,cost,requiredPointing,transmitPowerW:power,standbyPowerW:power*.25},price);
 for(const [id,name,mass,power,maxDataGbDay,recorderCapacityGb,cost,radTolerant,price,bays]of [
  ['minimal','Minimal flight computer',.8,1.2,1,1,.3,false,40,1],['telemetry','Telemetry flight computer',1.5,2.5,3,2,.5,false,60,1],
  ['survey8','Survey 8 GB controller',3,5,12,8,1.2,false,100,1],['buffer32','Buffer 32 GB controller',5,9,18,32,2.5,false,150,1],
  ['processor60','60 GB/day processor',6,18,60,12,3.5,false,210,2],['processor120','120 GB/day processor',10,30,120,24,4.5,false,260,2],
  ['recorder96','96 GB recorder computer',8,13,25,96,6,false,300,2],['recorder256','256 GB recorder computer',18,30,80,256,13,false,550,4],
  ['rad_low','Hardened low-power controller',4,6,12,8,5,true,250,1],['rad_buffer','Hardened buffer computer',9,16,45,64,10,true,450,2],
  ['rad_processor','Hardened high-rate processor',20,50,400,48,18,true,700,3],['observatory','Observatory data system',28,70,600,512,30,true,1000,5]
 ])add('computer_basic','computer_'+id,name,{mass,power,maxDataGbDay,recorderCapacityGb,cost,radTolerant},price,bays);
 for(const [id,name,mass,power,quality,cost,magneticOnly,price,bays]of [
  ['nano_mag','Nano magnetic package',.8,1.5,'coarse',.4,true,40,1],['survey_mag','Survey magnetic package',3,4,'coarse',.6,true,65,1],
  ['service_mag','Service magnetic package',6,7,'coarse',.8,true,80,1],['coarse_free','General coarse controller',5,10,'coarse',1.4,false,90,1],
  ['fine_lowpower','Low-power fine controller',7,5,'fine',5,false,240,2],['fine_service','Service fine controller',14,15,'fine',2.2,false,140,2],
  ['fine_light','Light fine controller',2.5,16,'fine',4.5,false,230,1],['fine_heavy','Heavy economy fine controller',25,25,'fine',1.7,false,120,3],
  ['prec_light','Light precision package',6,28,'precision',8.5,false,400,1],['prec_lowpower','Low-power precision package',18,12,'precision',12,false,550,3],
  ['prec_economy','Economy precision package',30,45,'precision',4.5,false,260,4],['prec_service','Service precision package',22,22,'precision',9,false,450,3]
 ])add(quality==='coarse'?'pointing_magnetorquers':quality==='fine'?'pointing_reaction_wheels':'pointing_star_tracker','pointing_'+id,name,{mass,power,quality,cost,magneticOnly},price,bays);
 for(const [id,name,mass,fuelKg,power,cost,price,bays]of [
  ['micro','Micro propulsion pack',3,1,1,.3,40,1],['trim4','Trim propulsion pack',7,4,1,.7,70,1],
  ['reserve6','Reserve propulsion pack',9,6,1.5,1,90,1],['compact12','Compact propulsion pack',17,12,2,1.8,130,2],
  ['economy18','Economy propulsion pack',32,18,1.5,1.5,110,2],['survey30','Survey propulsion pack',44,30,2.5,3.2,200,3],
  ['compact40','Compact transfer pack',54,40,3.5,5,300,3],['service65','Service propulsion pack',90,65,3,5.5,330,4],
  ['reserve80','Reserve transfer pack',115,80,3.5,6.5,380,4],['compact100','Compact deep-space pack',135,100,5,11,550,5],
  ['service150','Deep-service propulsion pack',210,150,5,12,650,6],['observatory220','Observatory propulsion pack',310,220,8,20,900,8]
 ])add('fuel_s','fuel_'+id,name,{mass,fuelKg,power,cost},price,bays);
}
