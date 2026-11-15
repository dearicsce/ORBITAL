import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const module=await readFile(new URL('../Assets/StreamingAssets/WebUI/vendor/three/three.module.js',import.meta.url),'utf8');
const start=module.indexOf('this.compileAsync = function');
const end=module.indexOf('\n\t\t};',start);
assert.ok(start>=0&&end>start,'Locate the pinned renderer method');
const material={},scene={},checks=[];
const pending=new Set([material]);
const renderer={compile:()=>pending};
let ready=false,disposed=false;
const properties={get:()=>disposed?{}:{currentProgram:{isReady:()=>ready}}};
// The extracted assignment runs in the same scope as the renderer constructor.
vm.runInNewContext('(function(){'+module.slice(start,end+5)+'}).call(renderer)',{
 renderer,properties,extensions:{get:()=>true},setTimeout:fn=>checks.push(fn)
});
const result=renderer.compileAsync(scene,{});
assert.equal(pending.size,1,'Uncompiled live material still waits');
assert.equal(checks.length,1);
disposed=true;
checks.shift()();
assert.equal(await result,scene);
assert.equal(pending.size,0);
disposed=false;ready=true;pending.add(material);
assert.equal(await renderer.compileAsync(scene,{}),scene);
console.log('PASS: pending shader warmup completes safely after renderer disposal.');
