// Test-only CDP connection to an explicitly selected isolated WebView2 host.
export async function hostSession(port = process.env.ORBITAL_TEST_PORT) {
  if (!port) throw Error('Set ORBITAL_TEST_PORT for an isolated test host.');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = pages.find(p => p.type === 'page' && p.url.startsWith('https://orbital.local/'));
  if (!page) throw Error('No ORBITAL test page on selected port');
  const socket = new WebSocket(page.webSocketDebuggerUrl), pending = new Map();
  let id = 0;
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.consoleAPICalled') {
      console.log(`[Browser Console ${message.params.type}]`, ...message.params.args.map(a => a.value ?? a.description ?? ''));
    }
    if (message.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text);
    }
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id); clearTimeout(request.timer);
    if (message.error) request.reject(Error(message.error.message)); else request.resolve(message.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const ticket = ++id;
    const timer = setTimeout(() => { pending.delete(ticket); reject(Error(`${method} timed out`)); }, 30000);
    pending.set(ticket, {resolve, reject, timer}); socket.send(JSON.stringify({id: ticket, method, params}));
  });
  await send('Runtime.enable');
  return {send, async evaluate(expression) {
    const reply = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (reply.exceptionDetails) throw Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  }, close() { socket.close(); }};
}
