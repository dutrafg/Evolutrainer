
(function(){
 const menu=document.getElementById('et-more-menu'),btn=document.getElementById('et-more-btn');
 btn?.addEventListener('click',()=>{if(state.active||etRole==='student')return;menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',String(!menu.hidden));});
 document.addEventListener('click',event=>{if(!menu||menu.hidden)return;if(event.target.closest('#et-more-menu,#et-more-btn'))return;menu.hidden=true;btn?.setAttribute('aria-expanded','false');});
 document.addEventListener('click',event=>{const tab=event.target.closest('#et-more-menu [data-tab]');if(!tab)return;menu.hidden=true;btn?.setAttribute('aria-expanded','false');});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu&&!menu.hidden){menu.hidden=true;btn?.setAttribute('aria-expanded','false');}});
})();
