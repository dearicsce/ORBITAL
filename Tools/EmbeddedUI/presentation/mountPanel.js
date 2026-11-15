function freezeSnapshot(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSnapshot(child);
    Object.freeze(value);
  }
  return value;
}

// Controllers publish detached views and own every state change.
export function mountPanel(host, kind, initial, actions = {}) {
  const copy = snapshot => freezeSnapshot(structuredClone(snapshot));
  let current = copy(initial);
  const listeners = new Set();
  const dispose = window.mountOrbitalPanel(host, kind, {
    getSnapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(type, value) {
      if (!Object.hasOwn(actions, type)) return {ok:false, reason:'This action is unavailable.'};
      try {
        return actions[type](value) ?? {ok:true};
      } catch (error) {
        return {ok:false, reason:error.message};
      }
    },
  });
  return {
    update(snapshot) {
      current = copy(snapshot);
      for (const listener of listeners) listener();
    },
    destroy() {
      dispose();
      listeners.clear();
    },
  };
}
