// WebView2 can move focus to its browser surface when Tab leaves the final
// control of a modal. Keep keyboard focus in the top visible modal, including
// the existing custom workshop dialogs. Entry/Escape/restoration stay with
// each dialog's existing owner.
export function installDialogFocus(){
 const visible=element=>element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden';
 const keydown=event=>{
  if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;
  const modal=[...document.querySelectorAll('dialog:modal,[role="dialog"][aria-modal="true"]')].filter(visible).at(-1);
  if(!modal)return;
  const controls=[...modal.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')]
   .filter(element=>element.tabIndex>=0&&!element.matches(':disabled')&&!element.closest('[inert]')&&visible(element));
  if(!controls.length){event.preventDefault();modal.tabIndex=-1;modal.focus();return;}
  const first=controls[0],last=controls.at(-1),active=document.activeElement;
  if(!modal.contains(active)||!controls.includes(active)){event.preventDefault();(event.shiftKey?last:first).focus();}
  else if(event.shiftKey&&active===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&active===last){event.preventDefault();first.focus();}
 };
 document.addEventListener('keydown',keydown,true);
 return ()=>document.removeEventListener('keydown',keydown,true);
}
