import fs from 'node:fs';
import path from 'node:path';
import {hostSession} from './HostSession.mjs';
const host = await hostSession();
const cooperative=process.argv[3]==='cooperative';
try {
  const result = await host.evaluate(`(async () => {
    const [{loadData}, {starterDesign,enrichCampaign}, {designForecast,designForecastAsync,createForecastService}] = await Promise.all([
      import('/js/data.js'), import('/js/campaign.js'), import('/js/unity/consequences.js')]);
    const data = enrichCampaign(await loadData()), samples = [];
    for (let pass = 0; pass < 3; pass++) for (const mission of data.missions) {
      if (mission.id === 'tutorial') continue;
      const design = starterDesign(mission, data);
      let delay;
      const scheduled = performance.now(), tick = new Promise(resolve => setTimeout(() => {delay=performance.now()-scheduled;resolve();},0));
      const start = performance.now(); let forecast, error;
      try { forecast = ${cooperative?'await designForecastAsync(design,data)':'designForecast(design, data)'}; } catch (e) { error=e.message; }
      const durationMs = performance.now()-start;
      await tick;
      samples.push({id:mission.id,pass,durationMs,interactionDelayMs:delay,values:forecast?.values,error});
    }
    const cacheSamples=[];
    if(${cooperative}){const service=createForecastService(data),design=starterDesign(data.missions.find(m=>m.id==='m1'),data);await service.forecast(design);for(let i=0;i<10;i++){const start=performance.now();await service.forecast(design);cacheSamples.push(performance.now()-start);}}
    return {samples,cacheSamples,cooperative:${cooperative},userAgent:navigator.userAgent, viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}, scope:'Operations forecast wall duration and zero-timer interaction delay on WebView2 UI event loop; not native frame time or CPU time'};
  })()`);
  const filename = path.resolve(process.argv[2]); fs.mkdirSync(path.dirname(filename), {recursive:true});
  fs.writeFileSync(filename, JSON.stringify(result,null,2));
  console.log(`${result.samples.length} forecast samples; max ${Math.max(...result.samples.map(s=>s.durationMs)).toFixed(1)} ms`);
} finally { host.close(); }
