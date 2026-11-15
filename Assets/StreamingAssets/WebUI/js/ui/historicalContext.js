import {validateHistoricalContext,historicalPoints} from '../content/historical.js';
let cached=null;
async function load(){if(!cached)cached=fetch(new URL('../../data/content/historical-context.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Historical reference unavailable');return r.json();}).then(validateHistoricalContext).catch(e=>{cached=null;throw e;});return cached;}
export function renderHistoricalContext(host){
  host.innerHTML='<details class="historical-context"><summary>Spaceflight in context <span>Historical supplied reference · 1957–2025</span></summary><div class="historical-body" role="region" aria-label="Historical mission context"></div></details>';
  const details=host.querySelector('details'),body=host.querySelector('.historical-body');let alive=true,started=false;
  async function open(){started=true;body.textContent='Loading historical context…';
    try{const data=await load();if(!alive||!host.isConnected)return;
      body.innerHTML='<p class="historical-disclosure">Supplied historical reference, not a live official feed. Publisher and count definitions remain unverified. The 2025 points are partial-year through 2 October 2025, inferred from filenames. These data do not affect science scores or predict individual trajectories or collisions.</p><div class="historical-controls"><label>Series <select id="history-series"></select></label><label>Metric <select id="history-metric"></select></label><label><input id="history-partial" type="checkbox" checked> Include partial 2025</label></div><p id="history-source"></p><div id="history-chart"></div><p id="history-note"></p><details><summary>Read the data table</summary><div class="history-table-wrap" id="history-table"></div></details>';
      const source=body.querySelector('#history-series'),metric=body.querySelector('#history-metric'),partial=body.querySelector('#history-partial');
      for(const s of data.series){const o=document.createElement('option');o.value=s.id;o.textContent=s.title;source.append(o);}
      function draw(){const s=data.series.find(x=>x.id===source.value),column=s.columns.find(c=>c.id===metric.value);const points=historicalPoints(s,column.id,partial.checked),max=Math.max(...points.map(p=>p.value),1);
        body.querySelector('#history-source').textContent=s.sourceFile+' · '+column.label+' · '+column.unit+' · '+points[0].year+'–'+points.at(-1).year+' · supplied reference / definitions unverified';
        const x=p=>45+(p.year-1957)/68*590,y=p=>170-p.value/max*140,complete=points.filter(p=>!p.partial),last=points.at(-1),before=points.at(-2);
        body.querySelector('#history-chart').innerHTML='<svg viewBox="0 0 660 210" role="img" aria-label="Historical '+column.label+' trend; equivalent values in the data table"><path d="M45 20V170H640" fill="none" stroke="#758c9a"/><text x="5" y="30" fill="#b8c9d2">'+max.toLocaleString()+'</text><text x="20" y="175" fill="#b8c9d2">0</text><polyline fill="none" stroke="#ccec93" stroke-width="2" points="'+complete.map(p=>x(p)+','+y(p)).join(' ')+'"/>'+(last.partial?'<path d="M'+x(before)+' '+y(before)+'L'+x(last)+' '+y(last)+'" stroke="#eda765" stroke-width="3" stroke-dasharray="5 4"/>':'')+'<text x="45" y="195" fill="#b8c9d2">1957</text><text x="590" y="195" fill="#b8c9d2">'+last.year+'</text></svg>';
        body.querySelector('#history-note').textContent=(last.partial?'Orange dashed segment: partial-year 2025. ':'Only full-year points shown. ')+(data.crossSeriesFlags.length?'Cross-series checks flag unreconciled country totals and some ratios. Supplied definitions have not been combined or corrected.':'');
        const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=column.label+' — same values as chart';table.append(caption);
        const head=table.createTHead().insertRow();for(const name of ['Year',column.label+' ('+column.unit+')','Quality']){const th=document.createElement('th');th.scope='col';th.textContent=name;head.append(th);}
        const tbody=table.createTBody();for(const p of points){const row=tbody.insertRow();for(const text of [p.year,p.value.toLocaleString(),p.partial?'Partial year; cutoff from filename':'Full-year label; publisher unverified'])row.insertCell().textContent=text;}
        body.querySelector('#history-table').replaceChildren(table);
      }
      function selectSeries(){metric.replaceChildren();const s=data.series.find(x=>x.id===source.value);for(const c of s.columns){const o=document.createElement('option');o.value=c.id;o.textContent=c.label;metric.append(o);}draw();}
      source.onchange=selectSeries;metric.onchange=draw;partial.onchange=draw;selectSeries();
    }catch(error){if(!alive)return;body.textContent='Historical reference could not load. Core missions remain available. ';const button=document.createElement('button');button.className='orbital-button';button.textContent='Retry reference';button.onclick=open;body.append(button);}
  }
  details.addEventListener('toggle',()=>{if(details.open&&!started)open();});return ()=>{alive=false;};
}
