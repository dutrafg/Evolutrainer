
(function(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-et5-favorite]');if(b){e.preventDefault();if(etRole==='personal'&&!state.active)et5ToggleFav(b.dataset.et5Favorite);}});
 document.addEventListener('keydown',event=>{
  if(etRole!=='personal'||state.active)return;
  const input=event.target.closest('input,textarea,select,[contenteditable]');
  if(event.key==='Escape'&&document.getElementById('et-more-menu')&&!document.getElementById('et-more-menu').hidden){document.getElementById('et-more-menu').hidden=true;return;}
  if(input)return;
  if(event.key==='/'||((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k')){
   event.preventDefault();setTab('library');document.getElementById('search-exercise')?.focus();return;
  }
  if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.key.toLowerCase()==='n'){
   if(state.tab==='workouts'&&state.student)document.querySelector('[data-action="new-routine"]')?.click();
   else if(state.tab==='clients')document.querySelector('[data-action="student-new"]')?.click();
   else if(state.tab==='library')document.querySelector('[data-action="new-exercise"]')?.click();
  }
 });
})();
