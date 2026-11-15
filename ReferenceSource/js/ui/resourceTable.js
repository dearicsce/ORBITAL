export function resourceRows(e,budget,data) {
  const required=e.averageLoad*data.settings.powerMargin;
  return [
    {id:'mass',name:'Mass',used:e.launchMass,limit:e.capacity,unit:'kg',over:e.launchMass>e.capacity||!e.capacity},
    {id:'power',name:'Power',used:required,limit:e.panelPower,unit:'W'},
    {id:'battery',name:'Battery',used:e.eclipseNeedWh,limit:e.batteryUsableWh,unit:'Wh'},
    {id:'data',name:'Downlink data',used:e.dataPerDay,limit:e.downlinkPerDay,unit:'GB/day'},
    {id:'fuel',name:'Fuel',used:e.fuelNeeded,limit:e.fuelKg,unit:'kg'},
    {id:'budget',name:'Budget',used:e.totalCost,limit:budget,unit:'$M'}
  ].map(r=>({...r,over:r.over||r.used>r.limit,near:r.limit>0&&r.used/r.limit>.85}));
}
export function renderResourceTable(host,e,budget,data) {
  const fmt=v=>Number(v.toFixed(1));
  host.innerHTML=`<table class="resource-table"><thead><tr><th>Resource</th><th>Used</th><th>Limit</th><th>Margin</th><th>Status</th></tr></thead><tbody>${resourceRows(e,budget,data).map(r=>`<tr class="bar-card ${r.over?'bar-red':r.near?'bar-amber':'bar-green'}" data-bar="${r.id}"><th>${r.name}</th><td>${fmt(r.used)} ${r.unit}</td><td>${r.id==='mass'&&!r.limit?'Cannot reach orbit':fmt(r.limit)+' '+r.unit}</td><td>${fmt(r.limit-r.used)} ${r.unit}</td><td>${r.over?'Over':r.near?'Near':'OK'}</td></tr>`).join('')}</tbody></table>`;
}
