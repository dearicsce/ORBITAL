const parts = [
  {id:'thermal_radiator',name:'Radiator panel',mass:9,cost:1.65,dimensionsM:[.42,.067,.34],mountSpan:.42,
    externalHalfWidthM:.211,externalHeightM:.068,externalDepthM:.171,radiatorWPerK:.67,
    description:'A finned exterior panel releases payload heat.',intendedStrengths:'Adds 0.67 W/°C of payload heat rejection. Draws 0 W.',
    limitations:'Uses a mounting face and can make the battery colder in eclipse.'},
  {id:'thermal_blanket',name:'Insulation blanket',mass:3.5,cost:.72,dimensionsM:[.38,.035,.32],mountSpan:.38,
    externalHalfWidthM:.191,externalHeightM:.036,externalDepthM:.161,insulationFraction:.34,
    description:'A quilted foil panel slows heat exchange with space.',intendedStrengths:'Reduces baseline heat loss by 34%. Draws 0 W.',
    limitations:'Slows cooldown when the payload is working hard.'},
  {id:'thermal_heater',name:'Battery heater',mass:2.4,cost:.9,dimensionsM:[.235,.081,.168],
    bayUnits:1,internal:true,heaterW:12,
    description:'An internal thermostat warms the battery when needed.',intendedStrengths:'Starts at 8 °C and switches off at 13 °C.',
    limitations:'Uses one bay and up to 12 W when heating.'}
];

export const thermalParts = parts.map(p=>({
  ...p,type:'thermal',category:'thermal',subcategory:p.internal?'heater':'passive thermal',
  schemaVersion:2,visualId:p.id,unlock:'start',unlockPrice:0,unlockPrerequisites:[],
  balanceStatus:'educational',attachmentRequirements:{kind:p.internal?'internal_bay':'exterior_face'},
  units:{mass:'kg',cost:'million USD',power:'W'},power:p.heaterW||0,
  resources:{massKg:p.mass,costUsd:p.cost*1e6,generatedPowerW:0,basePowerW:0,operatingPowerW:p.heaterW||0,
    batteryCapacityJ:0,recorderCapacityBit:0,processingBitPerSec:0,instrumentBitPerSec:0,transmitPowerW:0,standbyPowerW:0,propellantKg:0}
}));
