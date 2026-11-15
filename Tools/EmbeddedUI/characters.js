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
 const c=getCharacter(id),s=Math.min(80,Math.max(24,Number(size)||64));
 const paths={
  engineer:'<path d="M20 9v22M9 20h22M12 12l16 16M12 28l16-16"/><circle cx="20" cy="20" r="7"/>',
  scientist:'<ellipse cx="20" cy="20" rx="15" ry="6" transform="rotate(-35 20 20)"/><ellipse cx="20" cy="20" rx="15" ry="6" transform="rotate(35 20 20)"/><circle cx="20" cy="20" r="2"/>',
  accountant:'<path d="M10 29V18h5v11M18 29V12h5v17M26 29V8h5v21M8 32h25"/>',
  nova:'<path d="M20 10V6M5 18v9M35 18v9"/><circle cx="20" cy="4" r="2" fill="#e4b96b" stroke="none"/><rect x="7" y="10" width="26" height="24" rx="9" fill="#183c50"/><path d="M13 12h11" stroke="#c9eeee" opacity=".65"/><rect x="11" y="16" width="18" height="11" rx="5" fill="#050e19" stroke="none"/><circle cx="16" cy="21" r="2.2" fill="#9cf4e8" stroke="none"/><circle cx="24" cy="21" r="2.2" fill="#9cf4e8" stroke="none"/><path d="M17 30h6M15 35l-2 3M25 35l2 3"/>'
 };
 return '<svg class="character-portrait role-insignia '+(c.id==='nova'?'nova-avatar':'')+'" role="img" aria-label="'+c.role+'" viewBox="0 0 40 40" style="width:'+s+'px;height:'+s+'px" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'+(paths[c.id]||paths.nova)+'</svg>';
}
