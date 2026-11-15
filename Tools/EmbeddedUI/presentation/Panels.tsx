import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowRight, Gauge, Radio, ScanLine } from 'lucide-react';

type Action = { id: string; label: string; disabled?: boolean; primary?: boolean; value?: string };
type Metric = { label: string; value: string | number };
type Row = { id: string; label: string; planned: string; recorded: string; received: string; status?: string };
type Window = { label: string; start: number; end: number };
type PlanOption = {id:string;label:string;detail:string};
type PanelData = Readonly<{
  name?: string; family?: string; question?: string; beneficiary?: string; product?: string; instrument?: string;
  source?: string; sourceAvailable?: string; selectedSource?: string; decision?: string;
  conditions?: string[]; windows?: Window[]; targets?: string[]; encounterHours?: number;
  planOptions?: PlanOption[]; selectedPlan?: string; deadlineMinutes?: number; metrics?: Metric[]; rows?: Row[];
  actions?: Action[]; outcome?: string; message?: string; status?: string;
  notes?: string[]; log?: string[];
}>;
export type PanelController = {
  getSnapshot: () => PanelData;
  subscribe: (listener: () => void) => () => void;
  dispatch: (type: string, value?: string) => {ok: boolean; reason?: string};
};

function Metrics({items = []}: {items?: Metric[]}) {
  return <dl className="campaign-metrics">{items.map(item =>
    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
  )}</dl>;
}

function Timeline({rows = []}: {rows?: Row[]}) {
  if (!rows.length) return null;
  return <div className="campaign-table"><table>
    <caption>Results timeline</caption>
    <thead><tr><th scope="col">Target</th><th scope="col">Planned</th>
      <th scope="col">Recorded or served</th><th scope="col">Confirmed on Earth</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} data-result={row.status}>
      <th scope="row">{row.label}</th><td>{row.planned}</td><td>{row.recorded}</td><td>{row.received}</td>
    </tr>)}</tbody>
  </table></div>;
}

function Brief({view, dispatch, actions}: {view: PanelData; dispatch: (type: string, value?: string) => void; actions:ReactNode}) {
  const {windows = [], targets = [], conditions = []} = view;
  return <>
    <header className="campaign-panel-title"><ScanLine aria-hidden="true"/><h1>{view.name}</h1></header>
    <h2 className="campaign-question">{view.question}</h2>
    <Metrics items={[
      ...(view.product ? [{label:'Deliverable', value:view.product}] : []),
      ...(view.beneficiary ? [{label:'Mission partner', value:view.beneficiary}] : []),
      ...(view.instrument ? [{label:'Required instrument', value:view.instrument}] : []),
      ...(view.metrics ?? []),
    ]}/>
    {view.planOptions?.length ? <fieldset className="campaign-plan">
      <legend>{view.family === 'transfer' ? 'Choose the encounter plan' : 'Choose the observation plan'}</legend>
      <div className="campaign-plan-options">{view.planOptions.map(plan =>
        <button type="button" key={plan.id} data-evidence-plan={plan.id}
          aria-pressed={view.selectedPlan===plan.id} onClick={()=>dispatch('evidencePlan',plan.id)}>
          <strong>{plan.label}</strong><span>{plan.detail}</span>
        </button>
      )}</div>
    </fieldset> : null}
    {actions}
    <div className="campaign-columns">
      <section className="campaign-plate">
        <h2>{view.family === 'relay' ? 'Plan relay service' : view.family === 'transfer' ? 'Plan the encounter' : 'Plan the observation'}</h2>
        <p>{view.decision}</p>
        {conditions.map(condition => <p key={condition}>{condition}</p>)}
        {view.sourceAvailable && <label className="campaign-choice">Mission approach
          <select value={view.selectedSource ?? ''} onChange={event => dispatch('approach', event.target.value)}>
            <option value="">Guided scenario</option>
            <option value={view.sourceAvailable}>Archived NASA context</option>
          </select>
        </label>}
        <p className="campaign-meta">{view.source}</p>
      </section>
      <section className="campaign-plate">
        <h2>{windows.length ? 'Target schedule' : 'Encounter targets'}</h2>
        <ul className="campaign-schedule">{windows.map(window =>
          <li key={window.label}><span>{window.label}</span><strong>{window.start}–{window.end} min</strong></li>
        )}{targets.map(target => <li key={target}>{target}</li>)}</ul>
        {windows.length > 0 && <p className="campaign-meta">Minutes from deployment. Contact and lighting depend on the flown orbit.</p>}
        {view.deadlineMinutes != null && <p>Receipt deadline · {view.deadlineMinutes} min</p>}
        {view.encounterHours != null && <p>Modeled total integration · {view.encounterHours} h</p>}
      </section>
    </div>
  </>;
}

export function CampaignPanel({kind, controller}: {kind: string; controller: PanelController}) {
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [rejection, setRejection] = useState('');
  function dispatch(type: string, value?: string) {
    setRejection('');
    const result = controller.dispatch(type, value);
    if (!result.ok) setRejection(result.reason ?? 'Action rejected.');
  }
  const actions = view.actions?.length ? <div className="campaign-panel-actions">{view.actions.map(action =>
    <button type="button" key={action.id} id={action.id} disabled={action.disabled}
      className={'orbital-btn' + (action.primary ? ' orbital-btn-primary' : '')}
      onClick={() => dispatch(action.id, action.value)}>
      {action.label}{action.primary && <ArrowRight size={16} aria-hidden="true"/>}
    </button>
  )}</div> : null;
  return <section className={'campaign-panel campaign-panel-' + kind} aria-label={
    kind === 'brief' ? 'Mission briefing' : kind === 'report' ? 'Mission result' :
    kind === 'flight' ? 'Flight controls' : kind === 'fit' ? 'Stowed spacecraft fit' : 'Mission evidence'
  }>
    {kind === 'brief' ? <Brief view={view} dispatch={dispatch} actions={actions}/> : <>
      {view.name && <header className="campaign-panel-title">
        {kind === 'fit' || kind === 'flight' ? <Gauge aria-hidden="true"/> : <Radio aria-hidden="true"/>}
        <h2>{view.name}</h2>
      </header>}
      {view.outcome && <p className="campaign-outcome" data-result={view.status}>{view.outcome}</p>}
      {view.message && <p>{view.message}</p>}
      <Metrics items={view.metrics}/>
      <Timeline rows={view.rows}/>
      {view.log?.length ? <details className="campaign-log">
        <summary>Flight log</summary><ol>{view.log.map((entry, index) => <li key={index}>{entry}</li>)}</ol>
      </details> : null}
      {view.notes?.map(note => <p key={note} className="campaign-meta">{note}</p>)}
    </>}
    {kind !== 'brief' && actions}
    {rejection && <p className="campaign-rejection" role="alert">{rejection}</p>}
  </section>;
}

