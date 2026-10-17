(function(){
'use strict';
let tab='hoje';
const $p=()=>document.getElementById('et-student-phase1');
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const dateOf=v=>{const d=new Date(v);return Number.isNaN(+d)?null:d};
const formatDate=v=>{const d=dateOf(v);return d?d.toLocaleDateString('pt-BR'):'—'};
const own=()=>typeof state!=='undefined'&&state.student&&typeof etRole!=='undefined'&&etRole==='student';
const sessions=()=>Array.isArray(state.sessions)?state.sessions:[];
const routines=()=>typeof getOrderedRoutines==='function'?getOrderedRoutines():[];
const doneSets=s=>Array.isArray(s.exercises)?s.exercises.flatMap(e=>Array.isArray(e.sets)?e.sets.filter(x=>x.done):[]):[];
const getKey=()=> 'et-p1-feedback-'+String(state.student.id);
const goalKey=()=> 'et-p2-goal-'+state.student.id;
const goal=()=>{const n=Number(localStorage.getItem(goalKey()));return n>=1&&n<=7?n:3};
const countWeek=(ss,w=0)=>{const d=new Date(),a=new Date(d.getFullYear(),d.getMonth(),d.getDate()-(d.getDay()+6)%7+w*7),b=new Date(a);b.setDate(b.getDate()+7);return ss.filter(s=>{const x=dateOf(s.date);return x&&x>=a&&x<b}).length};
const feedbacks=()=>{try{const x=JSON.parse(localStorage.getItem(getKey())||'[]');return Array.isArray(x)?x:[]}catch{return []}};
const groups={
'peito':['peito','chest','supino','crucifixo','crossover','voador'],
'ombros':['ombro','shoulder','desenvolvimento','elevação lateral','elevacao lateral'],
'costas':['costas','back','remada','puxada','barra fixa','pulldown'],
'bíceps':['bíceps','biceps','rosca'],
'tríceps':['tríceps','triceps','tríceps','triceps','testa'],
'pernas':['perna','quadríceps','quadriceps','agachamento','leg press','extensora','flexora','panturrilha','glúteo','gluteo'],
'abdômen':['abdômen','abdomen','abdominal','core']
};
function muscle(ex){const ref=typeof exerciseById==='function'?exerciseById(ex.exerciseId):null;const raw=[ref?.category,ref?.name,ex.name,ex.muscle].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');return Object.keys(groups).find(g=>groups[g].some(k=>raw.includes(k)))||'Outros'}
function stats(){
 const ss=sessions(),now=new Date(),month=ss.filter(s=>{const d=dateOf(s.date);return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()});
 const weekStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7);
 const thisWeek=ss.filter(s=>{const d=dateOf(s.date);return d&&d>=weekStart});
 const totals={};const best=new Map();let records=0;
 [...ss].sort((a,b)=>(dateOf(a.date)||0)-(dateOf(b.date)||0)).forEach(s=>(s.exercises||[]).forEach(ex=>{
  const m=muscle(ex),sets=(ex.sets||[]).filter(x=>x.done);const vol=sets.reduce((n,x)=>n+number(x.weightKg??x.weight)*number(x.reps),0);
  if(!totals[m])totals[m]={sets:0,volume:0};totals[m].sets+=sets.length;totals[m].volume+=vol;
  const key=String(ex.exerciseId||ex.name||'exercício');for(const set of sets){const weight=number(set.weightKg??set.weight);if(weight>0&&weight>(best.get(key)||0)){if(best.has(key))records++;best.set(key,weight)}}
 }));
 return {ss,month,thisWeek,totals,records};
}
function render(){
 const root=$p();if(!root)return;
 if(!own()){root.hidden=true;document.body.classList.remove('et-p1-only-today');return}
 root.hidden=!!state.active;
 if(state.active)return;
 document.body.classList.toggle('et-p1-only-today',tab!=='hoje');
 const {ss,month,thisWeek,totals,records}=stats(),rr=routines(),last=ss.slice().sort((a,b)=>(dateOf(b.date)||0)-(dateOf(a.date)||0))[0], next=rr[0];
 const nav=[['hoje','Hoje'],['historico','Histórico'],['evolucao','Evolução'],['calendario','Calendário'],['feedback','Feedback'],['metas','Metas'],['offline','Offline'],['mapa','Mapa muscular'],['sugestoes','Sugestões']];
 const header=`<div class="et-p1-nav" role="navigation" aria-label="Área do aluno">${nav.map(([id,name])=>`<button type="button" data-p1-tab="${id}" aria-current="${tab===id?'page':'false'}">${name}</button>`).join('')}</div>`;
 let body='';
 if(tab==='hoje'){
  body=`<div class="et-p1-panel"><h2>Olá, ${safe(state.student.name)}!</h2><p class="et-p1-muted">Seu painel de treinamento. Os registros pertencem somente ao perfil selecionado.</p></div>
  <div class="et-p1-grid"><div class="et-p1-kpi"><strong>${month.length}</strong><span>Treinos no mês</span></div><div class="et-p1-kpi"><strong>${thisWeek.length}</strong><span>Treinos na semana</span></div><div class="et-p1-kpi"><strong>${records}</strong><span>Progressões de carga*</span></div></div>
  <div class="et-p1-panel"><h2>Próximo treino</h2><p><strong>${safe(next?.name||'Nenhum treino cadastrado')}</strong></p><p class="et-p1-muted">${next?`${(next.exercises||[]).length} exercícios · escolha o treino na lista abaixo`:'Solicite uma rotina ao seu personal.'}</p>${next?`<button type="button" class="btn primary" data-action="start" data-id="${safe(next.id)}">▶ Iniciar treino</button>`:''}</div>
  <div class="et-p1-panel"><h2>Última sessão</h2><p>${last?safe(last.routineName||'Treino')+' · '+formatDate(last.date):'Nenhuma sessão concluída.'}</p><p class="et-p1-muted">* Progressões observadas no histórico registrado, não recordes verificados.</p></div>`;
 }else if(tab==='historico'){
  body=`<div class="et-p1-panel"><h2>Meu histórico (${ss.length})</h2>${ss.length?ss.slice().sort((a,b)=>(dateOf(b.date)||0)-(dateOf(a.date)||0)).map(s=>`<div class="et-p1-entry"><strong>${safe(s.routineName||'Treino')}</strong><p class="et-p1-muted">${formatDate(s.date)} · ${doneSets(s).length} séries · ${number(s.totalVolumeKg).toLocaleString('pt-BR')} kg de volume · ${Math.round(number(s.durationSeconds)/60)} min</p><details><summary>Ver exercícios</summary>${(s.exercises||[]).map(e=>`<p>${safe((typeof exerciseById==='function'?exerciseById(e.exerciseId)?.name:null)||e.name||'Exercício')}: ${(e.sets||[]).filter(x=>x.done).map(x=>safe(`${x.reps||0} reps × ${x.weightKg??x.weight??0} kg`)).join(', ')||'Sem séries concluídas'}</p>`).join('')}</details></div>`).join(''):'Nenhuma sessão registrada.'}</div>`;
 }else if(tab==='evolucao'){
  const entries=Object.entries(totals).sort((a,b)=>b[1].volume-a[1].volume),max=Math.max(1,...entries.map(x=>x[1].volume));
  body=`<div class="et-p1-panel"><h2>Evolução por grupo muscular</h2><p class="et-p1-muted">Volume = peso × repetições, somado por grupo. Exercícios sem classificação identificável aparecem em Outros.</p>${entries.length?`<div class="et-p1-bars">${entries.map(([g,v])=>`<div><strong>${safe(g.charAt(0).toLocaleUpperCase('pt-BR')+g.slice(1))}</strong> · ${v.sets} séries · ${v.volume.toLocaleString('pt-BR',{maximumFractionDigits:1})} kg<div class="et-p1-bar"><span style="width:${Math.min(100,100*v.volume/max)}%"></span></div></div>`).join('')}</div>`:'Registre séries concluídas com carga para acompanhar a evolução.'}</div><div class="et-p1-panel"><h2>Resumo de frequência</h2><p>${ss.length} treinos concluídos no histórico · ${month.length} neste mês.</p></div>`;
 }else if(tab==='calendario'){
  const days=new Map();ss.forEach(s=>{const d=dateOf(s.date);if(d){const key=d.toLocaleDateString('pt-BR');days.set(key,(days.get(key)||0)+1)}});
  body=`<div class="et-p1-panel"><h2>Calendário de treinos</h2><p class="et-p1-muted">Os dias realizados também aparecem no calendário existente logo abaixo.</p><div class="et-p1-scroll"><table class="et-p1-table"><thead><tr><th>Data</th><th>Sessões concluídas</th></tr></thead><tbody>${[...days].reverse().slice(0,31).map(([d,n])=>`<tr><td>${safe(d)}</td><td>${n}</td></tr>`).join('')||'<tr><td colspan="2">Nenhum treino concluído</td></tr>'}</tbody></table></div></div>`;
 }else if(tab==='mapa'){
  const now=Date.now(),recent=ss.filter(s=>{const d=dateOf(s.date);return d&&d.getTime()<=now&&now-d.getTime()<14*86400000});
  const volume={};recent.forEach(s=>(s.exercises||[]).forEach(ex=>{const completed=(ex.sets||[]).filter(x=>x.done);if(completed.length){const g=muscle(ex);volume[g]=(volume[g]||0)+completed.length}}));
  const muscles=['peito','ombros','costas','bíceps','tríceps','pernas','abdômen'];
  const max=Math.max(1,...Object.values(volume));
  body=`<div class="et-p1-panel"><h2>Mapa muscular</h2><p class="et-p1-muted">Séries concluídas por grupo muscular nos últimos 14 dias. Intensidade visual relativa ao grupo mais treinado; não representa recuperação ou diagnóstico.</p><div class="et-p3-map">${muscles.map(g=>{const n=volume[g]||0;const pct=Math.round(n/max*100);return `<div class="et-p3-muscle"><div class="et-p3-muscle-head"><strong>${safe(g.charAt(0).toLocaleUpperCase('pt-BR')+g.slice(1))}</strong><span>${n} séries</span></div><div class="et-p3-track"><span style="width:${pct}%"></span></div></div>`}).join('')}</div><p class="et-p1-muted">Os exercícios sem classificação reconhecida não entram no mapa.</p></div>`;
 }else if(tab==='sugestoes'){
  const now=Date.now(),recent=ss.filter(s=>{const d=dateOf(s.date);return d&&d.getTime()<=now&&now-d.getTime()<14*86400000});
  const loads={};recent.forEach(s=>(s.exercises||[]).forEach(ex=>{const n=(ex.sets||[]).filter(x=>x.done).length;if(n){const g=muscle(ex);loads[g]=(loads[g]||0)+n}}));
  const suggestions=[],weekly=countWeek(ss),target=goal(),planned=routines();
  if(!ss.length)suggestions.push(['Comece pelo primeiro treino','Conclua um treino para que as sugestões considerem seu histórico.']);
  if(weekly<target)suggestions.push(['Meta semanal','Faltam '+(target-weekly)+' treino(s) para sua meta semanal. Confira seus treinos programados.']);
  const groups=['peito','ombros','costas','bíceps','tríceps','pernas','abdômen'];
  const ranked=groups.map(g=>({g,n:loads[g]||0})).sort((a,b)=>a.n-b.n);
  if(recent.length&&ranked[0].n===0)suggestions.push(['Distribuição muscular','O grupo '+ranked[0].g+' não tem séries concluídas registradas nos últimos 14 dias. Revise a distribuição com seu personal.']);
  if(recent.length&&ranked[ranked.length-1].n>0)suggestions.push(['Maior volume recente','O grupo '+ranked[ranked.length-1].g+' teve '+ranked[ranked.length-1].n+' séries concluídas nos últimos 14 dias. Considere esse histórico ao planejar a semana.']);
  if(!planned.length)suggestions.push(['Organização','Ainda não há treinos cadastrados para este aluno. Solicite um programa ao personal.']);
  if(!suggestions.length)suggestions.push(['Mantenha a consistência','Sua meta semanal foi atingida. Continue registrando os treinos conforme orientação do personal.']);
  body=`<div class="et-p1-panel"><h2>Sugestões inteligentes</h2><p class="et-p1-muted">Recomendações automáticas baseadas em regras e nos dados locais de treino, não em inteligência artificial generativa. Não substituem a orientação do profissional.</p>${suggestions.map(([title,desc])=>`<div class="et-p1-entry"><strong>${safe(title)}</strong><p class="et-p1-muted">${safe(desc)}</p></div>`).join('')}</div>`;
 }else if(tab==='metas'){
  const target=goal(),actual=countWeek(ss);
  const earned=[['Primeiro treino',ss.length>=1],['Meta semanal',actual>=target],['10 treinos',ss.length>=10],['50 treinos',ss.length>=50],['3 semanas ativas',[0,-1,-2].every(w=>countWeek(ss,w)>0)]];
  body=`<div class="et-p1-panel"><h2>Metas e conquistas</h2><p>Treinos nesta semana: <strong>${actual} / ${target}</strong></p><div class="et-p1-bar"><span style="width:${Math.min(100,actual/target*100)}%"></span></div><div class="et-p1-field"><label for="et-p2-goal">Meta semanal</label><select id="et-p2-goal">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${n===target?'selected':''}>${n} treino(s)</option>`).join('')}</select></div><button class="btn primary" type="button" data-p2-goal>Salvar meta</button><p class="et-p1-muted">Metas armazenadas localmente por aluno.</p></div><div class="et-p1-panel"><h2>Conquistas</h2>${earned.map(([label,ok])=>`<div class="et-p1-entry"><strong>${ok?'🏆':'🔒'} ${safe(label)}</strong><p class="et-p1-muted">${ok?'Conquistada':'Pendente'}</p></div>`).join('')}</div>`;
 }else if(tab==='offline'){
  body=`<div class="et-p1-panel"><h2>Treinamento offline</h2><p><strong>${navigator.onLine?'Conexão disponível':'Sem conexão'}</strong></p><p class="et-p1-muted">Os registros de treino ficam no armazenamento local deste navegador. Para usar a aplicação offline, abra o site conectado e prepare a biblioteca de mídia. O navegador pode remover dados armazenados. Não há sincronização automática entre dispositivos.</p><button class="btn primary" type="button" data-p2-offline>Preparar biblioteca offline</button><p id="et-p2-status" role="status" class="et-p1-muted"></p></div>`;
 }else{
  body=`<div class="et-p1-panel"><h2>Feedback pós-treino</h2><p class="et-p1-muted">Anote a dificuldade e possíveis desconfortos. Os dados ficam neste navegador e não são enviados automaticamente ao personal.</p>
  <div class="et-p1-field"><label for="et-p1-effort">Esforço percebido</label><select id="et-p1-effort"><option value="leve">Leve</option><option value="moderado">Moderado</option><option value="intenso">Intenso</option><option value="muito intenso">Muito intenso</option></select></div>
  <div class="et-p1-field"><label for="et-p1-discomfort">Desconforto</label><select id="et-p1-discomfort"><option value="nenhum">Nenhum</option><option value="leve">Leve</option><option value="moderado">Moderado</option><option value="forte">Forte</option></select></div>
  <div class="et-p1-field"><label for="et-p1-note">Observações</label><textarea id="et-p1-note" rows="3" maxlength="1000" placeholder="Como foi o treino?"></textarea></div>
  <button type="button" class="btn primary" data-p1-save>Salvar feedback</button><div id="et-p1-feedback-status" role="status" aria-live="polite"></div></div>
  <div class="et-p1-panel"><h2>Registros anteriores</h2>${feedbacks().slice().reverse().slice(0,10).map(f=>`<div class="et-p1-entry"><strong>${formatDate(f.date)}</strong> · ${safe(f.effort)} · desconforto ${safe(f.discomfort)}<p>${safe(f.note)}</p></div>`).join('')||'<p>Nenhum feedback registrado.</p>'}</div>`;
 }
 root.innerHTML=header+body;
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-p1-tab]');if(t){tab=t.dataset.p1Tab;render();return}
 if(e.target.closest('[data-p2-goal]')&&own()){const n=Number(document.getElementById('et-p2-goal')?.value);if(n>=1&&n<=7){try{localStorage.setItem(goalKey(),String(n));render()}catch{alert('Falha ao salvar meta')}}return}
 if(e.target.closest('[data-p2-offline]')&&own()){const btn=document.querySelector('[data-action="offline-cache"]'),status=document.getElementById('et-p2-status');if(btn){btn.click();if(status)status.textContent='Download solicitado. Consulte o progresso em Configurações > PWA e biblioteca offline.'}else if(status)status.textContent='Recurso offline indisponível.';return}
 if(e.target.closest('[data-p1-save]')&&own()){
  const note=document.getElementById('et-p1-note')?.value||'';
  const entry={date:new Date().toISOString(),effort:document.getElementById('et-p1-effort').value,discomfort:document.getElementById('et-p1-discomfort').value,note};
  try{const list=feedbacks();list.push(entry);localStorage.setItem(getKey(),JSON.stringify(list.slice(-100)));render()}catch{document.getElementById('et-p1-feedback-status').textContent='Não foi possível salvar neste navegador.'}
 }
});
const old=window.renderRoutines;
if(typeof old==='function')window.renderRoutines=function(){const result=old.apply(this,arguments);render();return result};
const apply=window.etApplyRole;
if(typeof apply==='function')window.etApplyRole=function(){const result=apply.apply(this,arguments);render();return result};
document.addEventListener('DOMContentLoaded',()=>{render()});
window.etPhase1Refresh=render;
window.addEventListener('online',()=>{if(tab==='offline')render()});
window.addEventListener('offline',()=>{if(tab==='offline')render()});
})();
