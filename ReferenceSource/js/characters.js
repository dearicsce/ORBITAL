const defaults=[
 {id:'nova',name:'Nova',role:'Mission guide',color:'#65dcea',voice:{pitch:1.25,rate:1.05}},
 {id:'engineer',name:'Chief Engineer Arjun Rao',role:'Engineering',color:'#79dfac',voice:{pitch:.95,rate:1}},
 {id:'scientist',name:'Lead Scientist Dr. Meera Iyer',role:'Science',color:'#bea6ef',voice:{pitch:1.15,rate:1.05}},
 {id:'accountant',name:'Mission Accountant Kabir Shah',role:'Budget',color:'#f3c472',voice:{pitch:1,rate:1.2}}
];
let cast=defaults,promise;
export function loadCharacters(baseUrl='') {return promise??=(async()=>{try{const url=baseUrl?baseUrl.replace(/\/$/,'')+'/data/characters.json':new URL('../data/characters.json',import.meta.url);const response=await fetch(url);if(response.ok){const data=await response.json();if(data.characters?.length)cast=data.characters.filter(c=>c.id!=='commander');}}catch{}return cast;})();}
export function getCharacter(id){return cast.find(c=>c.id===(id==='commander'?'nova':id))||defaults[0];}
export function drawAvatar(id,size=64){
 const c=getCharacter(id),s=Math.max(24,Number(size)||64),src=new URL('../images/characters/'+c.id+(c.id==='nova'?'.png':'.jpg'),import.meta.url).href;
 if(c.id==='nova')return '<span class="robot-portrait character-portrait" role="img" aria-label="Nova, your robot guide" title="Nova · Mission guide" style="width:'+s+'px;height:'+s*1.3+'px"><img src="'+src+'" alt="" style="width:'+s*1536/180+'px;max-width:none;left:'+(-s*24/180)+'px;top:'+(-s*15/180)+'px"></span>';
 return '<img class="character-portrait portrait-'+c.id+'" src="'+src+'" alt="'+c.name+'" title="'+c.name+'" style="width:'+s+'px;height:'+s*1.3+'px">';
}
