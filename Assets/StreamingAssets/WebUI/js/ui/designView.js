import { createSpacecraftView } from '../three/spacecraft.js';
let view=null;
export function mountDesignView(container,design,data,onRemove){destroyDesignView();view=createSpacecraftView(container,{data,onRemove});view.update(design,data);return view;}
export function refreshDesignView(design,data){view?.update(design,data);}
export function destroyDesignView(){view?.destroy();view=null;}
