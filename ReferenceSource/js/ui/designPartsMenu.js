// Parts catalog menu and selection handler
import { showLine } from './speech.js';
import { PART_TOOLTIPS, getUnlockLabel } from './designTooltips.js';
import { filterTutorialParts } from './designTutorialHooks.js';

export const TABS = ['Bus', 'Power', 'Battery', 'Comms', 'Computer', 'Pointing', 'Fuel', 'Instruments'];

export function checkPartSelected(item, design) {
  if (design.busId === item.id || design.commsId === item.id || design.computerId === item.id || design.pointingId === item.id) return true;
  if (design.panelIds?.includes(item.id) || design.batteryIds?.includes(item.id) || design.fuelIds?.includes(item.id) || design.instrumentIds?.includes(item.id)) return true;
  return false;
}

export function renderPartsMenu(container, activeTab, data, unlocked, design, isTutorial) {
  const tabsBar = container.querySelector('#parts-tabs-bar');
  tabsBar.innerHTML = TABS.map(
    (tab) => `<button type="button" class="tab-btn ${tab === activeTab ? 'active' : ''}" data-tab="${tab}"><svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="3" fill="none" stroke="currentColor"/><path d="M6 10h8M10 6v8" stroke="currentColor"/></svg> ${tab}</button>`
  ).join('');

  const scrollList = container.querySelector('#parts-scroll-list');
  let items = [];
  if (activeTab === 'Bus') items = (data.parts || []).filter((p) => p.type === 'bus');
  else if (activeTab === 'Power') items = (data.parts || []).filter((p) => p.type === 'panel');
  else if (activeTab === 'Battery') items = (data.parts || []).filter(p => p.type === 'battery');
  else if (activeTab === 'Comms') items = (data.parts || []).filter((p) => p.type === 'comms');
  else if (activeTab === 'Computer') items = (data.parts || []).filter((p) => p.type === 'computer');
  else if (activeTab === 'Pointing') items = (data.parts || []).filter((p) => p.type === 'pointing');
  else if (activeTab === 'Fuel') items = (data.parts || []).filter((p) => p.type === 'fuel');
  else if (activeTab === 'Instruments') items = data.instruments || [];

  items = filterTutorialParts(items, isTutorial, data.tutorial?.allowedParts);

  const existingNote=container.querySelector('#category-note');existingNote?.remove();
  if(activeTab==='Pointing'){const note=document.createElement('p');note.id='category-note';note.className='category-note';note.textContent='Attitude control aims the spacecraft. Magnetometers in Instruments are separate sensors.';scrollList.before(note);}
  scrollList.innerHTML = items
    .map((item) => {
      const isInst = activeTab === 'Instruments' || Boolean(item.kind);
      const isItemUnlocked = isInst ? (unlocked.instruments || []).includes(item.id) : (unlocked.parts || []).includes(item.id);
      const tooltip = PART_TOOLTIPS[item.id] || 'Spacecraft component.';
      const isSelected = checkPartSelected(item, design);

      return `
        <div 
          class="part-card ${isItemUnlocked ? 'part-unlocked' : 'part-locked'} ${isSelected ? 'part-selected' : ''}" 
          data-part-id="${item.id}"
          role="button"
          tabindex="${isItemUnlocked ? '0' : '-1'}"
          aria-label="${item.name} ($${item.cost}M)"
        >
          <div class="part-card-top">
            <div class="part-title-row">
              <span class="part-name">${item.name}${item.type === 'panel' ? ' (pair)' : ''}</span>
              <span class="info-icon" title="${tooltip}">i</span>
            </div>
            <span class="part-cost">$${item.cost}M</span>
          </div>
          <div class="part-specs">
            <span>${item.mass} kg</span>
            ${item.type === 'panel' ? `<span class="text-green">${item.power}W · 2 wings</span>` : ''}
            ${item.powerGen ? `<span class="text-green">+${item.powerGen}W</span>` : ''}
            ${item.type !== 'panel' && (item.powerDraw || item.power) ? `<span class="text-amber">-${item.powerDraw || item.power}W</span>` : ''}
            ${item.capacityWh ? `<span>${item.capacityWh} Wh</span>` : ''}
            ${item.slots ? `<span>${item.slots} Slots</span>` : ''}
            ${item.fuelKg ? `<span>${item.fuelKg} kg Fuel</span>` : ''}
            ${item.dataPerDay !== undefined ? `<span>${item.dataPerDay} GB/d</span>` : ''}
            ${item.value !== undefined ? `<span title="Science value">★ ${item.value} Sci</span>` : ''}
            ${item.pointing ? `<span class="text-sky" title="Required pointing: ${item.pointing}">${item.pointing}</span>` : ''}
          </div>
          <div class="part-card-footer">
            ${isItemUnlocked ? `<span class="select-badge">${isSelected ? '✓ EQUIPPED' : '+ ADD'}</span>` : `<span class="lock-label">Locked · ${getUnlockLabel(item.unlock)}</span>`}
          </div>
        </div>
      `;
    })
    .join('');
}

export function handlePartClick(partId, data, unlocked, design, refreshUI) {
  const part = (data.parts || []).find((p) => p.id === partId);
  const inst = (data.instruments || []).find((i) => i.id === partId);
  const item = part || inst;
  if (!item) return;

  const isInst = Boolean(inst);
  const isItemUnlocked = isInst ? unlocked.instruments.includes(item.id) : unlocked.parts.includes(item.id);
  if (!isItemUnlocked) return;

  let affected = ['mass', 'budget'];

  if (item.type === 'bus') {
    design.busId = item.id;
    affected.push('power');
    if (design.instrumentIds.length > item.slots) {
      design.instrumentIds = design.instrumentIds.slice(0, item.slots);
      affected.push('data');
    }
  } else if (item.type === 'panel') {
    affected.push('power');
    if (design.panelIds.includes(item.id)) design.panelIds.splice(design.panelIds.indexOf(item.id), 1);
    else if (design.panelIds.length < 2) design.panelIds.push(item.id);
  } else if (item.type === 'battery') {
    affected.push('battery');
    if (design.batteryIds.includes(item.id)) design.batteryIds.splice(design.batteryIds.indexOf(item.id), 1);
    else if (design.batteryIds.length < 2) design.batteryIds.push(item.id);
  } else if (item.type === 'comms') {
    design.commsId = item.id;
    affected.push('power');
  } else if (item.type === 'computer') {
    design.computerId = item.id;
    affected.push('power', 'data');
  } else if (item.type === 'pointing') {
    design.pointingId = item.id;
    affected.push('power');
  } else if (item.type === 'fuel') {
    affected.push('fuel');
    if (design.fuelIds.includes(item.id)) design.fuelIds.splice(design.fuelIds.indexOf(item.id), 1);
    else if (design.fuelIds.length < 2) design.fuelIds.push(item.id);
  } else if (isInst) {
    affected.push('power', 'battery', 'data');
    const bus = (data.parts || []).find((p) => p.id === design.busId);
    const slots = bus ? bus.slots : 0;
    if (design.instrumentIds.includes(item.id)) {
      design.instrumentIds.splice(design.instrumentIds.indexOf(item.id), 1);
    } else if (design.instrumentIds.length < slots) {
      design.instrumentIds.push(item.id);
    } else {
      showLine('engineer', bus ? `${bus.name} has only ${slots} instrument slots. Remove an instrument first.` : 'Choose a bus before adding instruments.');
      return;
    }
  }

  refreshUI(affected);
}

export function removePart(design,field,index){if(Array.isArray(design[field]))design[field].splice(index,1);else design[field]=null;}
