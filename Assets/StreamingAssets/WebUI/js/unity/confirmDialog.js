// A promise-based in-game confirmation. Opening it never mutates campaign state.
export function confirmMissionSwitch(name, {signal, flight = false} = {}) {
  if (signal?.aborted) return Promise.resolve(false);
  return new Promise(resolve => {
    const trigger = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'orbital-confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'mission-switch-title');
    dialog.setAttribute('aria-describedby', 'mission-switch-copy');
    dialog.innerHTML = '<h2 id="mission-switch-title"></h2><p id="mission-switch-copy"></p>' +
      '<div class="orbital-confirm-actions"><button type="button" class="btn" data-cancel autofocus>Keep playing</button><button type="button" class="btn btn-primary" data-confirm>Switch mission</button></div>';
    dialog.querySelector('#mission-switch-copy').textContent = flight ? 'This ends your unfinished flight.' : 'This replaces your unfinished design.';
    dialog.querySelector('h2').textContent = 'Switch to ' + name + '?';
    let settled = false;
    const finish = accepted => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      dialog.close(); dialog.remove();
      if (trigger?.isConnected) trigger.focus({preventScroll:true});
      resolve(accepted);
    };
    const abort = () => finish(false);
    dialog.addEventListener('cancel', event => {event.preventDefault(); finish(false);});
    dialog.querySelector('[data-cancel]').onclick = () => finish(false);
    dialog.querySelector('[data-confirm]').onclick = () => finish(true);
    signal?.addEventListener('abort', abort, {once:true});
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-cancel]').focus();
  });
}
