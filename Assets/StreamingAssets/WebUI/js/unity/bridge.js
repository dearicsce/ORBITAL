// The host transport carries rendering requests independently of campaign rules.
// Design, installation and pricing remain in the reference workshop modules.
let sequence = 0,pendingMesh=null,exportNoticeTimer;
const epoch=crypto.randomUUID();
let active = null;
const surfaces = [];
const masked = new Map();
const listeners = new Map();
export function send(type, payload = {}) {
  const commandId=epoch+'-'+ ++sequence;
  window.chrome.webview.postMessage({protocol: 1, commandId, type, payload});
  return commandId;
}
window.chrome.webview.addEventListener('message', event => {
  const message = event.data;
  if(typeof message==='string'&&message.startsWith('orbital-export:')){
    let status=document.querySelector('#orbital-export-status');
    if(!status){
      status=document.createElement('p');
      status.id='orbital-export-status';
      status.setAttribute('role','status');
      document.body.append(status);
    }
    status.textContent=message.slice('orbital-export:'.length);
    clearTimeout(exportNoticeTimer);
    exportNoticeTimer=setTimeout(()=>status.remove(),5000);
    return;
  }
  if(message.type==='spacecraft.ack'&&pendingMesh===message.payload?.commandId)pendingMesh=null;
  for(const handler of listeners.get(message.type)||[])handler(message.payload);
});
export function meshSnapshotPending(){return pendingMesh!==null;}
export function sendMeshSnapshot(payload){pendingMesh=send('spacecraft.meshes',payload);}
export function on(type, handler) {
  if(!listeners.has(type))listeners.set(type,new Set());
  listeners.get(type).add(handler);
  return ()=>listeners.get(type)?.delete(handler);
}

const style = document.createElement('style');
style.textContent = `html.native-scene,html.native-scene body,html.native-scene #app,
html.native-scene #app>section {background:transparent!important}
#native-ui-backdrop{position:fixed;inset:0;background:#08131d;z-index:-1;pointer-events:none}
[data-native-viewport]{background:transparent!important;touch-action:none}
[data-native-viewport] canvas {background:transparent!important}
html.native-preview .ws-modal-backdrop{background:transparent;isolation:isolate}
html.native-preview .ws-modal-backdrop::before{content:'';position:fixed;inset:0;z-index:-1;
  background:#020a10d9;clip-path:var(--native-screen-cutout);pointer-events:none}
html.native-preview .ws-modal{position:relative;isolation:isolate;background:transparent}
html.native-preview .ws-modal::before{content:'';position:absolute;inset:0;z-index:-1;border-radius:inherit;
  background:#102532;clip-path:var(--native-modal-cutout);pointer-events:none}
`;
document.head.append(style);
const backdrop = document.createElement('div');
backdrop.id = 'native-ui-backdrop';
document.body.append(backdrop);
let frame = 0,lastViewport='';
function publishViewport(payload) {
  payload.screen=document.querySelector('#app > [data-screen]')?.dataset.screen||'unknown';
  const next=JSON.stringify(payload);
  if(next===lastViewport)return;
  lastViewport=next;
  send('viewport',payload);
}
function layout() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    for(const [element,original] of masked)element.style.clipPath=original;
    masked.clear();
    active=surfaces.findLast(surface=>surface.element.isConnected)||null;
    if (!active) {
      document.documentElement.classList.remove('native-scene');
      document.documentElement.classList.remove('native-preview');
      backdrop.hidden = true;
      publishViewport({scene: 'none', x: 0, y: 0, width: 0, height: 0});
      return;
    }
    const r = active.element.getBoundingClientRect();
    const left = Math.max(0, r.left), top = Math.max(0, r.top);
    const right = Math.min(innerWidth, r.right), bottom = Math.min(innerHeight, r.bottom);
    const x = Math.max(left, right), y = Math.max(top, bottom);
    document.documentElement.classList.add('native-scene');
    backdrop.hidden = false;
    const cutout=(l,t,r,b)=>`polygon(evenodd, 0 0,100% 0,100% 100%,0 100%,0 0,
      ${l}px ${t}px,${l}px ${b}px,${r}px ${b}px,${r}px ${t}px,${l}px ${t}px)`;
    backdrop.style.clipPath=cutout(left,top,x,y);
    const modal=active.element.closest('.ws-modal');
    document.documentElement.classList.toggle('native-preview',Boolean(modal));
    if(modal){
      const m=modal.getBoundingClientRect();
      document.documentElement.style.setProperty('--native-screen-cutout',cutout(left,top,x,y));
      modal.style.setProperty('--native-modal-cutout',cutout(left-m.left,top-m.top,x-m.left,y-m.top));
      // The transparent preview hole must also exclude the workshop DOM below
      // the modal, otherwise an underlying inspector can show through it.
      const screen=modal.closest('[data-screen]');
      for(const child of screen?.children||[]){
        if(child.contains(active.element))continue;
        const c=child.getBoundingClientRect();
        masked.set(child,child.style.clipPath);
        child.style.clipPath=cutout(left-c.left,top-c.top,x-c.left,y-c.top);
      }
    }
    // CSS pixels are converted once at the transport boundary. The host uses
    // rasterization scale 1. WebView zoom is locked at 1 by the controller.
    publishViewport({scene: active.scene, x: r.left * devicePixelRatio, y: r.top * devicePixelRatio,
      width: r.width * devicePixelRatio, height: r.height * devicePixelRatio,
      clipX: left * devicePixelRatio, clipY: top * devicePixelRatio,
      clipWidth: Math.max(0, right-left) * devicePixelRatio, clipHeight: Math.max(0, bottom-top) * devicePixelRatio});
  });
}
addEventListener('resize', layout);
addEventListener('scroll', layout, true);
new MutationObserver(layout).observe(document.getElementById('app'), {childList: true, subtree: true});
export function mount(element, scene, nativeCamera = true) {
  element.dataset.nativeViewport = scene;
  const surface={element,scene};
  surfaces.push(surface);active=surface;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  canvas.setAttribute('aria-label', scene === 'spacecraft' ? 'Unity spacecraft viewport' : 'Unity Earth viewport');
  element.append(canvas);
  let pointer = null;
  const down = e => {
    if (e.button > 2) return;
    pointer = {id: e.pointerId, x: e.clientX, y: e.clientY, startX:e.clientX, startY:e.clientY};
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const move = e => {
    if (pointer?.id !== e.pointerId) return;
    send('camera.drag', {dx: e.clientX-pointer.x, dyUp: pointer.y-e.clientY});
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  };
  const end = () => { pointer = null; };
  const wheel = e => { e.preventDefault(); send('camera.zoom', {delta: e.deltaY}); };
  if(nativeCamera){
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('lostpointercapture', end);
    canvas.addEventListener('wheel', wheel, {passive: false});
  }
  const observer = new ResizeObserver(layout);
  observer.observe(element);
  layout();
  return {canvas,isActive(){return surfaces.findLast(entry=>entry.element.isConnected)===surface;}, destroy() {
    observer.disconnect();
    canvas.remove();
    const index=surfaces.indexOf(surface);
    if(index>=0)surfaces.splice(index,1);
    active=surfaces.findLast(entry=>entry.element.isConnected)||null;
    layout();
  }};
}
send('host.ready');
