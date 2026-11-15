export function bindReportExport(container,run,summary,rating){
 if(!run)return;
 const footer=container.querySelector('.screen-actions')||container.querySelector('[data-screen="report"]');
 const panel=container.querySelector('.mission-panel')||footer;
 const button=document.createElement('button');
 button.type='button';button.className='btn';button.id='export-flight-record';button.textContent='Export flight record';
 button.onclick=()=>{
  const record={format:'orbital-flight-record',version:1,run,summary:summary||null,rating};
  const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;link.download='orbital-flight-'+run.design.missionId+'.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 };
 footer?.append(button);
 const learning=document.createElement('details');learning.className='ops-report-summary';learning.innerHTML='<summary>Optional local learning notes</summary><p>The game is being evaluated. Skip any question or stop at any time. No names or contact details are requested. Do not enter personal information. Export stays on this computer; agree on retention before sharing.</p>';
 const fields=[['initial','Initial explanation'],['assistance','Assistance used'],['diagnosis','Failure diagnosis'],['improvement','What changed and why?'],['transfer','Apply the idea to another mission'],['uncertain','What remains unknown?']];
 for(const [id,label]of fields){const wrapper=document.createElement('label');wrapper.textContent=label;const input=document.createElement('textarea');input.maxLength=1000;input.dataset.learning=id;wrapper.append(input);learning.append(wrapper);}
 const consent=document.createElement('label'),check=document.createElement('input');check.type='checkbox';consent.append(check,document.createTextNode(' I agree to export these optional notes locally.'));learning.append(consent);
 const exportNotes=document.createElement('button');exportNotes.className='btn';exportNotes.textContent='Export local learning notes';exportNotes.disabled=true;check.onchange=()=>exportNotes.disabled=!check.checked;
 exportNotes.onclick=()=>{if(!check.checked)return;const notes=Object.fromEntries([...learning.querySelectorAll('textarea')].map(i=>[i.dataset.learning,i.value]));const record={format:'orbital-local-learning-notes',version:1,consent:'Optional local export agreed',missionId:run.design.missionId,model:run.simulationVersion,lifecycle:run.lifecycle?.version??null,source:run.sourceBundle??null,seed:run.initialSeed,notes,interpretation:'Self-reported notes; no mastery certification or fabricated participant outcomes.'};const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='orbital-learning-notes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};learning.append(exportNotes);panel?.append(learning);
}
