/* v5.7: preços atualizados por interação, sem observadores globais ou mutações recursivas */
(function(){
  'use strict';
  const catalog=Object.freeze({
    '2x por Semana':144,
    '3x por Semana':185,
    '4x por Semana':221,
    '5x por Semana':250,
    'Diária':25
  });
  document.addEventListener('change',event=>{
    if(event.target?.id!=='fin-service')return;
    const price=catalog[event.target.value];
    const input=document.getElementById('fin-price');
    if(input&&price!==undefined){
      input.value=price.toFixed(2);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  });
  document.addEventListener('click',event=>{
    const card=event.target.closest('[data-fin-preset]');
    if(!card)return;
    const choice=card.dataset.finPreset;
    if(!Object.hasOwn(catalog,choice))return;
    const service=document.getElementById('fin-service');
    if(service){
      service.value=choice;
      service.dispatchEvent(new Event('change',{bubbles:true}));
      service.focus();
    }
  });
})();
