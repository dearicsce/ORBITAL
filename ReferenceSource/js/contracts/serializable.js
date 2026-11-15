export function assertSerializable(value,path='value'){
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error(`${path} must be finite`);return;}
 if(typeof value!=='object'||(!Array.isArray(value)&&Object.getPrototypeOf(value)!==Object.prototype))throw Error(`${path} is not plain JSON data`);
 for(const [key,entry]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key))throw Error(`${path}: unsafe key`);assertSerializable(entry,`${path}.${key}`);}
}
