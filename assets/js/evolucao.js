

/* EvoluTrainer v3.3 PT-BR — evolução baseada em dados locais, sem dependências externas.
   IMC, massa gorda/magra e Mifflin-St Jeor seguem a lógica do EvoluFísico
   de referência. Indicadores de treino são informativos, não diagnósticos. */
'use strict';
window.Evolution=(()=>{
 const measureFields={neck:'Pescoço',chest:'Peitoral / Tórax',armRight:'Braço direito',armLeft:'Braço esquerdo',forearmRight:'Antebraço direito',forearmLeft:'Antebraço esquerdo',waist:'Cintura',hip:'Quadril',thighRight:'Coxa direita',thighLeft:'Coxa esquerda',calfRight:'Panturrilha direita',calfLeft:'Panturrilha esquerda'};
 const compFields={weight:'Peso',fatPct:'Gordura corporal',fatKg:'Massa de gordura',muscleKg:'Massa muscular esquelética',fatFreeKg:'Massa livre de gordura',bmi:'IMC',visceral:'Gordura visceral',bmr:'Taxa metabólica basal'};
 const units={weight:'kg',fatPct:'%',fatKg:'kg',muscleKg:'kg',fatFreeKg:'kg',bmi:'kg/m²',visceral:'nível',bmr:'kcal'};
 const $=s=>document.querySelector(s);
 const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=(v)=>{if(v===null||v===undefined||String(v).trim()==='')return null;const z=Number(String(v).replace(',','.'));return Number.isFinite(z)?z:null;};
 const positive=v=>{const a=n(v);return a!==null&&a>0?a:null;};
 const fmt=(v,d=1)=>v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
 const fint=v=>fmt(v,0);
 const nowKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const dateKey=date=>{if(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date))return date;const d=new Date(date);return Number.isNaN(+d)?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const parseDate=k=>new Date(k+'T12:00:00');
 const addDays=(k,x)=>{const d=parseDate(k);d.setDate(d.getDate()+x);return dateKey(d);};
 const dayDiff=(a,b)=>Math.round((parseDate(b)-parseDate(a))/86400000);
 const daysArray=(length,end=nowKey())=>Array.from({length},(_,i)=>addDays(end,i-length+1));
 const short=k=>{if(!k)return '';const [y,m,d]=k.split('-');return `${d}/${m}`;};
 const longDate=k=>k?new Date(k+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}):'Data desconhecida';
 const escForm=html;
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(s)===s&&!Number.isNaN(parseDate(s).getTime())&&parseDate(s).getFullYear()===Number(s.slice(0,4))&&parseDate(s).getMonth()+1===Number(s.slice(5,7))&&parseDate(s).getDate()===Number(s.slice(8,10));
 const validRange=(value,lo,hi)=>value===null||(value>=lo&&value<=hi);
 let records=[];let profile={id:'settings',targetWeight:null,heightCm:null,sex:'',age:null,startWeight:null};
 let section='summary',subpage='overview',bodyTab='weight',period=30,calendarMonth=nowKey().slice(0,7),measureUnit='cm',measureSide='right';
 const getRows=kind=>records.filter(r=>r.kind===kind).sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||'').localeCompare(b.createdAt||''));
 const last=kind=>getRows(kind).at(-1)||null;
 function calcMetrics(input,heightCm=profile.heightCm,demog=profile){
  const v={...input};const w=positive(v.weight),p=n(v.fatPct),h=positive(heightCm);
  const estimated=[];
  if(w!==null&&p!==null&&p>=0&&p<=100){
   if(v.fatKg==null){v.fatKg=+(w*p/100).toFixed(2);estimated.push('fatKg');}
   if(v.fatFreeKg==null){v.fatFreeKg=+(w-v.fatKg).toFixed(2);estimated.push('fatFreeKg');}
  }
  if(w!==null&&h!==null&&h>=60&&h<=260&&v.bmi==null){v.bmi=+(w/Math.pow(h/100,2)).toFixed(2);estimated.push('bmi');}
  if(w!==null&&h!==null&&demog&&['F','M'].includes(demog.sex)&&positive(demog.age)!==null&&v.bmr==null){
   const bmr=10*w+6.25*h-5*n(demog.age)+(demog.sex==='F'?-161:5);
   v.bmr=+bmr.toFixed(0);estimated.push('bmr');
  }
  return {values:v,estimated};
 }
 async function reload(){if(!state.studentDb){reset();return;}const [rows,prefs]=await Promise.all([allFrom('bodyRecords'),allFrom('userProfile')]);records=rows.filter(r=>r&&r.kind&&r.values);profile=prefs.find(p=>p.id==='settings')||{id:'settings',targetWeight:null,heightCm:null,sex:'',age:null,startWeight:null};}
 function reset(){records=[];profile={id:'settings',targetWeight:null,heightCm:null,sex:'',age:null,startWeight:null};section='summary';subpage='overview';bodyTab='weight';}
 const registeredWeight=()=>{
  const l=getRows('weight').map(x=>({...x,weight:positive(x.values.weight)})).filter(x=>x.weight!==null);
  const c=getRows('composition').map(x=>({...x,weight:positive(x.values.weight)})).filter(x=>x.weight!==null);
  return [...l,...c].sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||'').localeCompare(b.createdAt||''));
 };
 const latestWeight=()=>registeredWeight().at(-1)?.weight??null;
 const workoutDays=()=>{const out=new Map();for(const s of state.sessions){const key=dateKey(s.date||s.endedAt);if(!key)continue;out.set(key,[...(out.get(key)||[]),s]);}return out;};
 const validSets=s=>(s.exercises||[]).flatMap(ex=>(ex.sets||[]).filter(x=>x.done===true));
 const sessionVolume=s=>{
  if(Array.isArray(s.exercises)&&s.exercises.length){return s.exercises.reduce((sum,ex)=>sum+(ex.sets||[]).filter(x=>x.done===true).reduce((v,x)=>v+Math.max(0,n(x.weightKg)||0)*Math.max(0,n(x.reps)||0),0),0);}
  return Math.max(0,n(s.totalVolumeKg)||0);
 };
 const sessionSetCount=s=>validSets(s).length||Math.max(0,n(s.totalSets)||0);
 const workoutMap=()=>{const data=new Map();for(const s of state.sessions){const k=dateKey(s.date||s.endedAt);if(!k)continue;const it=data.get(k)||{sessions:0,volume:0,sets:0};it.sessions++;it.volume+=sessionVolume(s);it.sets+=sessionSetCount(s);data.set(k,it);}return data;};
 const sumPeriod=(keys,map)=>keys.reduce((sum,k)=>sum+(map.get(k)?.volume||0),0);
 const streaks=()=>{const dates=[...workoutDays().keys()].sort();if(!dates.length)return {current:0,best:0};
  const weeks=new Set(dates.map(k=>{const d=parseDate(k);const weekday=(d.getDay()+6)%7;d.setDate(d.getDate()-weekday);return dateKey(d);}));
  const keys=[...weeks].sort();let best=0,run=0;for(let i=0;i<keys.length;i++){if(i>0&&dayDiff(keys[i-1],keys[i])!==7)run=0;run++;best=Math.max(best,run);}const today=new Date();today.setHours(12,0,0,0);const shift=(today.getDay()+6)%7;today.setDate(today.getDate()-shift);const thisWeek=dateKey(today);const lastWeek=addDays(thisWeek,-7);let current=0,k=weeks.has(thisWeek)?thisWeek:lastWeek;while(weeks.has(k)){current++;k=addDays(k,-7);}return {current,best};};
 const lastN=(count,offset=0)=>daysArray(count,addDays(nowKey(),-offset));
 const periodCount=(days,offset=0)=>{const dates=new Set(lastN(days,offset));return state.sessions.filter(x=>dates.has(dateKey(x.date))).length;};
 function svgTrend(series,label='Evolução dos registros',height=175){
  if(!series.length)return `<div class="evo-empty">Ainda não há registros suficientes para mostrar o gráfico.</div>`;
  const w=720,h=height,p=28;const vv=series.map(s=>Number(s.value)||0),lo=Math.min(...vv),hi=Math.max(...vv),range=Math.max(hi-lo,hi*.06,1);
  const coord=(v,i)=>[p+i*(w-2*p)/Math.max(series.length-1,1),h-p-(v-(lo-range*.1))/(range*1.2)*(h-2*p)];
  const xy=vv.map(coord),poly=xy.map(q=>q.join(',')).join(' '),fill=`${p},${h-p} ${poly} ${w-p},${h-p}`;
  const lines=[0,.25,.5,.75,1].map(t=>`<line x1="${p}" y1="${p+(h-2*p)*t}" x2="${w-p}" y2="${p+(h-2*p)*t}" stroke="#344154" stroke-width="1"/>`).join('');
  const selected=xy.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===xy.length-1?5:3.5}" fill="#00c86b"><title>${html(series[i].label)}: ${fmt(series[i].value,1)}</title></circle>`).join('');
  const every=Math.max(1,Math.ceil(series.length/6));const ticks=series.map((s,i)=>i%every===0||i===series.length-1?`<text x="${xy[i][0]}" y="${h-3}" text-anchor="middle" font-size="11" fill="#99aabe">${html(s.label)}</text>`:'').join('');
  return `<svg class="evo-trend" viewBox="0 0 ${w} ${h}" role="img" aria-label="${html(label)}"><defs><linearGradient id="evograd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00c86b" stop-opacity=".17"/><stop offset="1" stop-color="#00c86b" stop-opacity="0"/></linearGradient></defs>${lines}<polygon points="${fill}" fill="url(#evograd)"/><polyline points="${poly}" stroke="#00c86b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" fill="none"/>${selected}${ticks}</svg>`;
 }
 function progress(label,value,max=25){return `<div class="evo-progress"><div class="evo-progress-head"><strong>${html(label)}</strong><span>${fint(value)}/${max}</span></div><div class="evo-bar"><span style="width:${Math.max(0,Math.min(100,100*value/max))}%"></span></div></div>`;}
 function scoreInfo(){const map=workoutMap(),current=lastN(28),previous=lastN(28,28);const active=current.filter(k=>map.has(k)).length,volume=sumPeriod(current,map),prevVolume=sumPeriod(previous,map),sets=current.reduce((t,k)=>t+(map.get(k)?.sets||0),0),prevSets=previous.reduce((t,k)=>t+(map.get(k)?.sets||0),0);
  if(!state.sessions.length)return null;
  const consistency=Math.round(Math.min(25,active/12*25));
  const frequency=Math.round(Math.min(25,active/12*25));
  const volumePoints=volume<=0?0:prevVolume<=0?15:Math.round(Math.min(25,25*Math.min(1.15,volume/prevVolume)));
  const progression=sets<=0?0:prevSets<=0?15:Math.round(Math.min(25,25*Math.min(1.15,sets/prevSets)));
  return {consistency,frequency,volume:volumePoints,progression,total:consistency+frequency+volumePoints+progression};
 }
 function monthCalendar(){
  const [year,month]=calendarMonth.split('-').map(Number),d=new Date(year,month-1,1,12),offset=(d.getDay()+6)%7,days=new Date(year,month,0).getDate(),map=workoutDays(),cells=Array.from({length:offset},()=>'<span class="evo-day empty" aria-hidden="true"></span>');
  for(let i=1;i<=days;i++){
    const key=`${year}-${String(month).padStart(2,'0')}-${String(i).padStart(2,'0')}`,sessions=map.get(key)||[],future=key>nowKey();
    cells.push(`<button type="button" class="evo-day ${sessions.length?'trained':''} ${future?'future':''} ${key===nowKey()?'today':''}" data-evo-action="calendar-day" data-date="${key}" aria-label="${html(longDate(key))}: ${sessions.length} treino(s)" title="${html(longDate(key))}: ${sessions.length} treino(s)">${i}</button>`);
  }
  const trained=[...map.keys()].filter(k=>k.startsWith(calendarMonth)).length;
  return `<section class="evo-panel evo-calendar-panel"><div class="evo-panel-heading"><span>Calendário de atividade</span><span class="evo-activity-count">${trained} ${trained===1?'dia ativo':'dias ativos'}</span></div><div class="evo-month-head"><button type="button" data-evo-action="month-prev" aria-label="Mês anterior">‹</button><strong>${html(d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}))}</strong><button type="button" data-evo-action="month-next" aria-label="Mês seguinte">›</button></div><div class="evo-calendar">${['SEG','TER','QUA','QUI','SEX','SÁB','DOM'].map(x=>`<span class="weekday">${x}</span>`).join('')}${cells.join('')}</div><p class="evo-note"><span class="evo-legend-dot"></span> Dias com treino concluído. Toque em uma data para ver os detalhes.</p></section>`;
}

 function renderSummary(){
 const current=periodCount(30),prev=periodCount(30,30),pct=prev?((current-prev)/prev*100):null,streak=streaks(),score=scoreInfo(),vol=sumPeriod(lastN(30),workoutMap());
 const yearTotal=state.sessions.filter(x=>dateKey(x.date||x.endedAt).startsWith(String(new Date().getFullYear()))).length;
 return `<div class="evo-section-intro"><div><span class="evo-kicker">SEU DESEMPENHO</span><h2>Visão geral</h2><p>Resumo das sessões concluídas e da sua constância.</p></div><span class="evo-section-icon" aria-hidden="true">▥</span></div>
 <div class="evo-kpis">
 <div class="evo-kpi"><span>Últimos 30 dias</span><strong>${current}</strong><em>${pct===null?'Sessões registradas':`${pct>=0?'+':''}${fmt(pct,0)}% sobre os 30 dias anteriores`}</em></div>
 <div class="evo-kpi"><span>Este ano</span><strong>${yearTotal}</strong><em>Treinos concluídos</em></div>
 <div class="evo-kpi"><span>Sequência atual</span><strong>${streak.current}</strong><em>Semanas com atividade</em></div>
 <div class="evo-kpi"><span>Melhor sequência</span><strong>${streak.best}</strong><em>Semanas consecutivas</em></div>
 </div>${monthCalendar()}
 <section class="evo-panel evo-score-panel"><div class="evo-panel-heading"><span>EvoluTrainer Score</span><span class="evo-info">0–100 pontos</span></div>${score?`<div class="evo-score" style="--score:${score.total}"><strong>${score.total}</strong><span>de 100</span></div>${progress('Consistência',score.consistency)}${progress('Volume',score.volume)}${progress('Progressão',score.progression)}${progress('Frequência',score.frequency)}<p class="evo-note">Indicador motivacional baseado nos últimos 28 dias, calculado a partir de seus treinos. Não é uma avaliação clínica.</p>`:`<div class="evo-empty">Seu score aparecerá quando você concluir o primeiro treino.</div>`}</section>
 <section class="evo-panel evo-volume-teaser"><div><span class="evo-kicker">VOLUME NOS ÚLTIMOS 30 DIAS</span><strong>${fmt(vol,0)} kg</strong></div><button class="btn secondary" type="button" data-evo-action="section" data-section="volume">Ver análise →</button></section>`;
}

 function volumeSeries(){const days=lastN(period);const map=workoutMap(),size=period<=30?7:period===90?10:15,arr=[];for(let i=0;i<days.length;i+=size){const keys=days.slice(i,i+size),tot=keys.reduce((sum,k)=>sum+(map.get(k)?.volume||0),0);arr.push({label:short(keys.at(-1)),value:tot});}return arr;}
 function groupVolumes(){const groups=new Map();for(const s of state.sessions){if(!lastN(period).includes(dateKey(s.date)))continue;for(const ex of s.exercises||[]){const item=state.exercises.find(x=>x.id===ex.exerciseId);const group=item?.category||'Outros';const vol=(ex.sets||[]).filter(x=>x.done).reduce((acc,x)=>acc+(n(x.weightKg)||0)*(n(x.reps)||0),0);groups.set(group,(groups.get(group)||0)+vol);}}return [...groups].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);}
 function renderVolume(){
 const map=workoutMap(),days=lastN(period),past=lastN(period,period),volume=sumPeriod(days,map),prev=sumPeriod(past,map),change=prev?((volume-prev)/prev*100):null;
 const sessions=state.sessions.filter(x=>days.includes(dateKey(x.date||x.endedAt))),avg=sessions.length?volume/sessions.length:0,big=[...sessions].sort((a,b)=>sessionVolume(b)-sessionVolume(a))[0],groups=groupVolumes(),max=groups[0]?.[1]||1;
 return `<div class="evo-section-intro"><div><span class="evo-kicker">CARGA DE TREINO</span><h2>Evolução do volume</h2><p>Acompanhe a carga movimentada por período.</p></div></div>
 <div class="evo-period"><label for="evo-period">Período</label><select id="evo-period" aria-label="Período de análise"><option value="30" ${period===30?'selected':''}>Últimos 30 dias</option><option value="90" ${period===90?'selected':''}>Últimos 90 dias</option><option value="180" ${period===180?'selected':''}>Últimos 180 dias</option></select><span>${short(days[0])} a ${short(days.at(-1))}</span></div>
 <section class="evo-panel evo-chart-panel"><div class="evo-panel-heading"><span>Histórico de volume</span><span>${sessions.length} sessões</span></div><div class="evo-spark-head"><strong>${fmt(volume,0)} <small>kg</small></strong><span>Volume total no período</span></div>${svgTrend(volumeSeries(),'Volume por intervalo em quilogramas',205)}</section>
 <div class="actions" style="margin-bottom:14px"><button class="btn primary block" data-evo-action="report-form">📄 Gerar relatório de evolução de carga (PDF)</button></div>
 <section class="evo-panel evo-emphasis"><span>VOLUME TOTAL NO PERÍODO</span><strong>${fmt(volume,0)} kg</strong><p>${change===null?'Ainda não existem registros suficientes para comparar períodos.':`${change>=0?'Aumento':'Redução'} de ${fmt(Math.abs(change),1)}% em relação ao período anterior.`}</p></section>
 <div class="evo-kpis evo-vol-kpis"><div class="evo-kpi"><span>Maior sessão</span><strong>${fmt(big?sessionVolume(big):0,0)} <small>kg</small></strong><em>${html(big?.routineName||'Sem registros')}</em></div><div class="evo-kpi"><span>Média por treino</span><strong>${fmt(avg,0)} <small>kg</small></strong><em>Com base em ${sessions.length} sessão(ões)</em></div></div>
 <section class="evo-panel"><div class="evo-panel-heading"><span>Volume por grupo muscular</span><span>${groups.length} grupos</span></div>${groups.length?groups.map(([name,value])=>`<div class="evo-progress group"><div class="evo-progress-head"><strong>${html(name)}</strong><b>${fmt(value,0)} kg</b></div><div class="evo-bar"><span style="width:${Math.min(100,100*value/max)}%"></span></div></div>`).join(''):'<div class="evo-empty">Registre cargas e repetições nas séries concluídas para visualizar a distribuição.</div>'}<p class="evo-note">Volume = carga (kg) × repetições nas séries marcadas como concluídas. Cada exercício conta no grupo muscular principal.</p></section>`;
}

 function goalStats(){const sorted=registeredWeight(),current=sorted.at(-1)?.weight??null,start=positive(profile.startWeight)||sorted[0]?.weight||null,target=positive(profile.targetWeight);if(current===null||start===null||target===null)return {current,start,target,progress:null,remaining:null};const distance=target-start;const progress=Math.abs(distance)<.00001?(Math.abs(current-target)<.25?100:0):Math.min(100,Math.max(0,100*(current-start)/distance));return {current,start,target,progress,remaining:Math.abs(current-target)};}
 function renderGoal(){
 const g=goalStats();let sentence='Registre seu peso e configure uma meta para acompanhar sua evolução.';
 if(g.remaining!==null)sentence=g.remaining<.25?'Você atingiu sua meta de peso!':`Faltam ${fmt(g.remaining,1)} kg para atingir o objetivo.`;
 return `<div class="evo-section-intro"><div><span class="evo-kicker">SUA TRANSFORMAÇÃO</span><h2>Objetivo físico</h2><p>Metas construídas com seus próprios registros.</p></div></div>
 <section class="evo-panel goal"><div class="evo-goal-head"><div><span>PESO ATUAL</span><strong>${g.current!==null?fmt(g.current,1)+' kg':'—'}</strong></div><div><span>META</span><strong>${g.target!==null?fmt(g.target,1)+' kg':'Não definida'}</strong></div></div>
 <div class="evo-progress"><div class="evo-progress-head"><strong>Progresso</strong><b>${g.progress===null?'Configure sua meta':fmt(g.progress,0)+'% da meta'}</b></div><div class="evo-bar"><span style="width:${g.progress||0}%"></span></div></div><p class="evo-goal-hint">✦ ${html(sentence)}</p>
 <button class="btn primary evo-cta" data-evo-action="weight-form">＋ Registrar peso</button><button class="btn secondary evo-cta" data-evo-action="measurements" data-bodytab="weight">Ver peso e medidas →</button><button class="evo-text-button" data-evo-action="goal-form">⚙ Configurar meta e perfil</button></section>
 ${registeredWeight().length?`<section class="evo-panel"><div class="evo-panel-heading"><span>Variação de peso</span><span>${registeredWeight().length} registro(s)</span></div>${svgTrend(registeredWeight().slice(-18).map(x=>({label:short(x.date),value:x.weight})),'Variação do peso corporal',175)}</section>`:''}`;
}

 function bodyNavigation(){
 return `<div class="evo-sub-head"><button type="button" class="evo-back" data-evo-action="overview" aria-label="Voltar para visão geral">←</button><div><h2>Peso e medidas</h2><p>Cada registro conta sua transformação</p></div></div>
 <div class="evo-segments body" role="tablist" aria-label="Acompanhamento corporal">${[['weight','Peso'],['measurements','Medidas'],['composition','Composição']].map(([id,title])=>`<button type="button" role="tab" data-evo-action="body-tab" data-bodytab="${id}" class="${bodyTab===id?'selected':''}" aria-selected="${bodyTab===id}">${title}</button>`).join('')}</div>`;
}

 function renderWeight(){
 const weights=registeredWeight(),target=positive(profile.targetWeight),timeline=[...weights].reverse();
 return `<section class="evo-panel body-chart"><div class="evo-panel-heading"><span>Histórico de peso</span><span>Meta: ${target===null?'—':fmt(target,1)+' kg'}</span></div>${weights.length?svgTrend(weights.slice(-18).map(x=>({label:short(x.date),value:x.weight})),'Evolução de peso',200):'<div class="evo-empty">Você ainda não registrou seu peso. Faça a primeira medição para começar.</div>'}</section>
 <div class="evo-timeline">${timeline.map(r=>`<article class="evo-weight-item"><div><span>${html(longDate(r.date))}${r.kind==='composition'?' · Composição':''}</span><button class="evo-del" data-evo-action="delete" data-id="${html(r.id)}">Remover</button></div><strong>${fmt(r.weight,1)} <small>kg</small></strong></article>`).join('')}</div><button class="btn primary evo-cta fixed-in-flow" data-evo-action="weight-form">＋ Registrar peso</button>`;
}

 function silhouette(side='front'){
 return `<img class="evo-body-svg evo-body-art" src="./assets/anatomia-corporal.svg" alt="Mapa anatômico corporal em destaque" loading="lazy" decoding="async">`;
}
function renderMeasurements(){
 const rec=last('measurements'),rows=rec?.values||{};
 const compact={neck:'Pescoço',chest:'Peitoral/Tórax',armRight:'Braço Dir.',forearmRight:'Antebraço Dir.',thighRight:'Coxa Dir.',calfRight:'Panturrilha Dir.',armLeft:'Braço Esq.',forearmLeft:'Antebraço Esq.',waist:'Cintura',hip:'Quadril',thighLeft:'Coxa Esq.',calfLeft:'Panturrilha Esq.'};
 const position={neck:'neck',chest:'l1',armRight:'l2',forearmRight:'l3',thighRight:'l4',calfRight:'l5',armLeft:'r1',forearmLeft:'r2',waist:'r3',hip:'r4',thighLeft:'r5',calfLeft:'r6'};
 const display=k=>{const v=n(rows[k]);return `<div class="evo-map-label ${position[k]}"><span>${html(compact[k]||measureFields[k])}</span><strong>${v!==null?fmt(measureUnit==='in'?v/2.54:v,1):'0,0'} ${measureUnit}</strong></div>`;};
 const all=getRows('measurements');const waist=all.filter(r=>n(r.values.waist)!==null);
 const guide=`<svg class="evo-map-lines" viewBox="0 0 1000 582" preserveAspectRatio="none" aria-hidden="true">
 <g stroke="rgba(214,193,122,.68)" stroke-width="2" stroke-dasharray="6 8" stroke-linecap="round" fill="none">
  <line x1="143" y1="127" x2="468" y2="138"/><line x1="143" y1="207" x2="454" y2="189"/><line x1="143" y1="304" x2="447" y2="251"/><line x1="143" y1="407" x2="459" y2="340"/><line x1="143" y1="527" x2="472" y2="479"/>
  <line x1="858" y1="110" x2="549" y2="162"/><line x1="858" y1="189" x2="562" y2="221"/><line x1="858" y1="286" x2="566" y2="236"/><line x1="858" y1="388" x2="557" y2="308"/><line x1="858" y1="473" x2="548" y2="377"/><line x1="858" y1="556" x2="536" y2="484"/>
  <line x1="500" y1="37" x2="500" y2="106"/>
 </g>
 <g fill="rgba(240,180,55,.95)"><circle cx="468" cy="138" r="4.7"/><circle cx="454" cy="189" r="4.7"/><circle cx="447" cy="251" r="4.7"/><circle cx="459" cy="340" r="4.7"/><circle cx="472" cy="479" r="4.7"/><circle cx="549" cy="162" r="4.7"/><circle cx="562" cy="221" r="4.7"/><circle cx="566" cy="236" r="4.7"/><circle cx="557" cy="308" r="4.7"/><circle cx="548" cy="377" r="4.7"/><circle cx="536" cy="484" r="4.7"/><circle cx="500" cy="106" r="4.7"/></g>
 </svg>`;
 return `<section class="evo-panel evo-anatomy-panel"><div class="evo-panel-heading"><span>Mapa de medidas corporais</span><span>${rec?html(short(rec.date)):'Sem registros'}</span></div><p class="evo-note">Visualização das últimas circunferências registradas.</p><div class="evo-body-map"><div class="evo-map-stage">${guide}${display('neck')}${display('chest')}${display('armRight')}${display('forearmRight')}${display('thighRight')}${display('calfRight')}<div class="evo-map-figure">${silhouette()}</div>${display('armLeft')}${display('forearmLeft')}${display('waist')}${display('hip')}${display('thighLeft')}${display('calfLeft')}</div></div><div class="evo-measures-unit" aria-label="Unidade de medida"><button type="button" data-evo-action="unit" data-unit="cm" class="${measureUnit==='cm'?'selected':''}">cm</button><button type="button" data-evo-action="unit" data-unit="in" class="${measureUnit==='in'?'selected':''}">pol.</button></div><p class="evo-measure-last">${rec?'Última medição: '+html(longDate(rec.date)):'Nenhuma circunferência cadastrada.'}</p><button class="btn primary evo-cta" data-evo-action="measures-form">＋ Registrar medidas</button></section>
 ${waist.length>1?`<section class="evo-panel"><div class="evo-panel-heading"><span>Evolução da cintura</span><span>cm</span></div>${svgTrend(waist.map(r=>({label:short(r.date),value:n(r.values.waist)})),'Circunferência da cintura',175)}</section>`:''}
 ${all.length?`<section class="evo-panel"><div class="evo-panel-heading"><span>Histórico de medições</span><span>${all.length} registros</span></div>${[...all].reverse().slice(0,8).map(r=>`<div class="evo-history-line"><div><strong>${html(longDate(r.date))}</strong><span>${Object.keys(r.values).length} medidas</span></div><button class="evo-del" data-evo-action="delete" data-id="${html(r.id)}">Remover</button></div>`).join('')}</section>`:''}`;
}

 function renderComposition(){
 const rows=getRows('composition'),rec=rows.at(-1),derived=rec?calcMetrics(rec.values):null;
 return `<section class="evo-panel"><div class="evo-panel-heading"><span>Composição corporal</span><span>${rec?html(short(rec.date)):'Sem avaliação'}</span></div>${rec?`<div class="evo-comp-grid">${Object.entries(compFields).map(([k,label])=>`<div><span>${html(label)}</span><strong>${derived.values[k]===null||derived.values[k]===undefined?'—':fmt(derived.values[k],k==='bmr'||k==='visceral'?0:1)} <small>${units[k]}</small></strong></div>`).join('')}</div><p class="evo-note">Estimados a partir de outros dados: ${html(derived.estimated.map(k=>compFields[k]).join(', ')||'nenhum')}. Os valores medidos têm prioridade.</p><button class="evo-del" data-evo-action="delete" data-id="${html(rec.id)}">Excluir esta avaliação</button>`:'<div class="evo-empty">Registre sua avaliação para acompanhar massa magra, gordura e outros indicadores.</div>'}</section>
 <button class="btn primary evo-cta fixed-in-flow" data-evo-action="composition-form">＋ Registrar composição</button><button class="btn secondary evo-cta" data-evo-action="import-form">⇪ Importar avaliação do EvoluFísico</button>
 ${rows.length>1?`<section class="evo-panel"><div class="evo-panel-heading"><span>Evolução da gordura corporal</span><span>%</span></div>${svgTrend(rows.filter(r=>n(r.values.fatPct)!==null).map(r=>({label:short(r.date),value:n(r.values.fatPct)})),'Evolução do percentual de gordura')}</section>`:''}`;
}


 function openReportForm(){
  if(!state.student){notify('Selecione um cliente antes de emitir o relatório.');return;}
  const end=nowKey(),start=addDays(end,-29);
  openModal('Relatório PDF · Evolução de carga',`<div class="field"><label for="report-start">Início do período</label><input id="report-start" type="date" value="${start}"></div><div class="field"><label for="report-end">Fim do período</label><input id="report-end" type="date" value="${end}"></div><div class="field"><label for="report-focus">Foco do ciclo</label><input id="report-focus" maxlength="130" placeholder="Ex.: Hipertrofia e progressão de carga" value="Acompanhamento de força e sobrecarga"></div><div class="field"><label for="report-trainer">Nome do personal</label><input id="report-trainer" maxlength="120" placeholder="Nome do profissional"></div><div class="field"><label for="report-cref">CREF (opcional)</label><input id="report-cref" maxlength="55" placeholder="Ex.: 000000-G/UF"></div><div class="field"><label for="report-directions">Diretrizes e orientações técnicas do personal</label><textarea id="report-directions" rows="3" maxlength="1800" placeholder="Escreva somente observações realmente verificadas; evite diagnósticos automáticos."></textarea></div><div class="inline-notice">O relatório usa apenas séries concluídas do cliente atual. A maior carga de cada exercício é comparada entre a primeira e a última sessão dentro do período. O PDF será baixado diretamente, sem endereços locais ou cabeçalhos do navegador.</div><button class="btn primary block" data-evo-action="print-report">↗ Baixar relatório PDF</button>`);
 }
 function reportRows(from,to){
  const map=new Map();const inWindow=state.sessions.filter(s=>{const d=dateKey(s.date||s.endedAt);return d>=from&&d<=to;}).sort((a,b)=>new Date(a.date||a.endedAt)-new Date(b.date||b.endedAt));
  for(const s of inWindow){const day=dateKey(s.date||s.endedAt);for(const e of s.exercises||[]){const loads=(e.sets||[]).filter(x=>x.done&&positive(x.weightKg)!==null).map(x=>positive(x.weightKg));if(!loads.length)continue;const weight=Math.max(...loads);const id=e.exerciseId||e.name||'desconhecido';let item=map.get(id);if(!item){item={id,name:state.exercises.find(x=>x.id===id)?.name||e.name||'Exercício',entries:[],notes:[]};map.set(id,item);}item.entries.push({date:day,weight});if(e.notes?.trim())item.notes.push(e.notes.trim());}}
  const rows=[...map.values()].map(x=>{const first=x.entries[0],last=x.entries.at(-1),diff=last.weight-first.weight;return {...x,first,last,diff,pct:first.weight>0?100*diff/first.weight:null,comparable:x.entries.length>=2};}).sort((a,b)=>(b.comparable?1:0)-(a.comparable?1:0)||b.diff-a.diff||a.name.localeCompare(b.name,'pt-BR'));
  return {sessions:inWindow,rows};
 }
 function preparePrintReport(){
  const from=$('#report-start')?.value,to=$('#report-end')?.value,focus=$('#report-focus')?.value.trim()||'Progressão de carga',trainer=$('#report-trainer')?.value.trim()||'Personal responsável',cref=$('#report-cref')?.value.trim()||'',directions=$('#report-directions')?.value.trim()||'';
  if(!validDate(from)||!validDate(to)||from>to){notify('Selecione um período válido.');return false;}
  if(dayDiff(from,to)>366){notify('Selecione um período de até 367 dias.');return false;}
  const {sessions,rows}=reportRows(from,to),matched=rows.filter(x=>x.comparable),gains=matched.filter(x=>x.diff>0),better=[...gains].sort((a,b)=>b.diff-a.diff)[0],betterPct=[...gains].sort((a,b)=>b.pct-a.pct)[0];
  const fmtKg=v=>fmt(v,1)+' kg';const pct=v=>v===null?'—':`${v>=0?'+':''}${fmt(v,1)}%`;
  const totalVolume=sessions.reduce((sum,s)=>sum+sessionVolume(s),0);
  const table=rows.length?`<table class="report-table"><thead><tr><th style="width:24%">Exercício</th><th style="width:12%">Primeiro registro</th><th style="width:12%">Carga inicial</th><th style="width:12%">Último registro</th><th style="width:12%">Carga final</th><th style="width:13%">Evolução</th><th style="width:15%">Obs. registradas</th></tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${html(x.name)}</strong></td><td>${short(x.first.date)}</td><td>${fmtKg(x.first.weight)}</td><td>${short(x.last.date)}</td><td><b>${fmtKg(x.last.weight)}</b></td><td class="${x.comparable?(x.diff>0?'report-gain':x.diff<0?'report-loss':'') :''}">${x.comparable?`${x.diff>=0?'+':''}${fmtKg(x.diff)}<div>${pct(x.pct)}</div>`:'Sem comparativo'}</td><td>${html(x.notes.at(-1)||'—')}</td></tr>`).join('')}</tbody></table>`:'<div class="report-empty">Não há séries com peso concluídas neste período. Conclua sessões registrando carga para produzir o comparativo.</div>';
  const ranked=[...gains].sort((a,b)=>b.diff-a.diff).slice(0,8),max=ranked[0]?.diff||1;
  const bars=ranked.length?`<div class="report-bars">${ranked.map(x=>`<div class="report-bar-row"><span>${html(x.name)}</span><div class="report-bar-track"><div class="report-bar-fill" style="width:${Math.min(100,100*x.diff/max)}%"></div></div><strong>+${fmtKg(x.diff)}</strong></div>`).join('')}</div>`:'<div class="report-empty">Nenhuma progressão positiva de carga com registros comparáveis no período.</div>';
  const root=document.querySelector('#evolutrainer-print-report');if(!root)return false;
  root.innerHTML=`<header class="report-hdr"><div><h1>RELATÓRIO DE EVOLUÇÃO</h1><small>PROGRESSÃO DE SOBRECARGA E FORÇA</small></div><div class="report-logo">EvoluTrainer<br><small>${html(trainer)}${cref?'<br>'+html(cref):''}</small></div></header><section class="report-meta"><div><span>Cliente</span><strong>${html(state.student?.name||'')}</strong></div><div><span>Período</span><strong>${short(from)} a ${short(to)}</strong></div><div><span>Objetivo / foco</span><strong>${html(focus)}</strong></div></section><section class="report-stats"><div><span>Sessões concluídas</span><strong>${sessions.length}</strong></div><div><span>Volume total</span><strong>${fmt(totalVolume,0)} kg</strong></div><div><span>Maior ganho absoluto</span><strong>${better?'+'+fmtKg(better.diff):'—'}</strong><span>${better?html(better.name):'Sem comparativo'}</span></div><div><span>Maior ganho percentual</span><strong>${betterPct?pct(betterPct.pct):'—'}</strong><span>${betterPct?html(betterPct.name):'Sem comparativo'}</span></div></section><div class="report-title">ANÁLISE POR EXERCÍCIO</div>${table}<div class="report-title">GANHOS DE CARGA (KG ADICIONADOS)</div>${bars}${directions?`<div class="report-note"><b>DIRETRIZES PARA O PRÓXIMO PERÍODO (INFORMADAS PELO PERSONAL)</b><p>${html(directions)}</p></div>`:''}<div class="report-note"><b>METODOLOGIA E LIMITAÇÕES</b><p>Comparação da maior carga (kg) em séries concluídas no primeiro e no último registro de cada exercício dentro do período. Volume = soma de carga × repetições das séries concluídas. A comparação não ajusta mudanças de repetições, amplitude, técnica ou equipamento. Exercícios com um único registro não possuem percentual comparável. Ausência de sessão no calendário não comprova falta. Este relatório não equivale a avaliação clínica.</p></div><footer class="report-footer"><span>EvoluTrainer v3.5 · Relatório individual e local · ${html(state.student?.name||'')}</span><span>Gerado em ${html(new Date().toLocaleDateString('pt-BR'))}</span></footer>`;
  if(window.EvoluPDF?.evolution){try{window.EvoluPDF.evolution({clientName:state.student?.name||'Cliente',start:from,end:to,focus,trainer,cref,directions,rows,sessionsCount:sessions.length,volumeKg:totalVolume});root.classList.remove('report-ready');root.innerHTML='';closeModal();return true;}catch(err){console.error(err);notify('Não foi possível gerar o PDF: '+err.message);return false;}}
  root.classList.add('report-ready');closeModal();
  try{window.print();}catch(e){console.error(e);notify('Não foi possível abrir a impressão neste navegador.');return false;}
  return true;
 }

 function render(){
 const root=$('#evo-main');if(!root)return;
 const sections=document.querySelector('#page-evolution > .evo-segments');if(sections)sections.hidden=subpage==='body';
 const heading=document.querySelector('#page-evolution > .evo-heading');if(heading)heading.hidden=subpage==='body';
 document.querySelectorAll('#page-evolution > .evo-segments [data-section]').forEach(b=>{b.classList.toggle('selected',b.dataset.section===section);b.setAttribute('aria-selected',String(b.dataset.section===section));});
 root.innerHTML=subpage==='body'?bodyNavigation()+(bodyTab==='weight'?renderWeight():bodyTab==='measurements'?renderMeasurements():renderComposition()):section==='summary'?renderSummary():section==='volume'?renderVolume():renderGoal();
}

 function openWeightForm(){openModal('Registrar peso',`<div class="field"><label for="ev-date">Data do registro</label><input type="date" id="ev-date" value="${nowKey()}" max="${nowKey()}"></div><div class="field"><label for="ev-weight">Peso em kg</label><input id="ev-weight" inputmode="decimal" type="number" min="10" max="600" step="0.1" placeholder="Ex.: 75,5" value="${latestWeight()??''}"></div><div class="actions"><button class="btn primary" data-evo-action="save-weight">Salvar peso</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);}
 function openGoalForm(){openModal('Meta e perfil corporal',`<p class="hint">A meta é pessoal. Sexo, idade e altura são opcionais e usados somente para estimativas de IMC e metabolismo basal.</p><div class="two-fields"><div class="field"><label>Peso inicial (kg)</label><input id="ev-start-weight" type="number" min="10" max="600" step="0.1" value="${profile.startWeight??''}"></div><div class="field"><label>Meta de peso (kg)</label><input id="ev-target" type="number" min="10" max="600" step="0.1" value="${profile.targetWeight??''}"></div><div class="field"><label>Altura (cm)</label><input id="ev-height" type="number" min="60" max="260" step="0.1" value="${profile.heightCm??''}"></div><div class="field"><label>Idade (anos)</label><input id="ev-age" type="number" min="18" max="110" value="${profile.age??''}"></div><div class="field"><label>Sexo biológico (fórmula)</label><select id="ev-sex"><option value="">Não informado</option><option value="F" ${profile.sex==='F'?'selected':''}>Feminino</option><option value="M" ${profile.sex==='M'?'selected':''}>Masculino</option></select></div></div><div class="actions"><button class="btn primary" data-evo-action="save-goal">Salvar configurações</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);}
 function openMeasuresForm(){
 measureSide='right';
 const common=[['neck','Pescoço'],['chest','Peitoral / tórax'],['waist','Cintura'],['hip','Quadril']];
 const individual=[['arm','Braço'],['forearm','Antebraço'],['thigh','Coxa'],['calf','Panturrilha']];
 const sideHTML=(side,label)=>`<div class="evo-measure-side" data-measure-pane="${side}" ${side==='left'?'hidden':''}>
 <div class="evo-measure-inputs"><div class="evo-measure-list">${(side==='right'?common:[]).concat(individual.map(([k,v])=>[k+(side==='right'?'Right':'Left'),v+' '+(side==='right'?'direito':'esquerdo')])).map(([key,title])=>`<div class="evo-measure-field"><label for="ev-${key}">${html(title)} (cm)</label><input id="ev-${key}" type="number" min="1" max="350" step="0.1" inputmode="decimal" placeholder="—" /></div>`).join('')}</div>${silhouette(side==='right'?'front':'back')}</div></div>`;
 openModal('Registrar medidas',`<p class="hint">Medições em centímetros. Preencha apenas os campos avaliados e mantenha as mesmas referências anatômicas em cada sessão.</p><div class="field"><label for="ev-date">Data da medição</label><input type="date" id="ev-date" value="${nowKey()}" max="${nowKey()}"></div><div class="evo-segments body evo-measure-tabs" role="tablist"><button type="button" class="selected" aria-selected="true" data-evo-action="measure-side" data-side="right">Lado direito</button><button type="button" aria-selected="false" data-evo-action="measure-side" data-side="left">Lado esquerdo</button></div>${sideHTML('right','Direito')}${sideHTML('left','Esquerdo')}<div class="actions"><button class="btn primary evo-cta" data-evo-action="save-measures">Salvar medidas</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);
}

 function openCompositionForm(){
 openModal('Registrar composição',`<p class="hint">Preencha os dados de sua avaliação de bioimpedância. Os campos não medidos podem ficar vazios.</p><div class="field"><label for="ev-date">Data da avaliação</label><input type="date" id="ev-date" value="${nowKey()}" max="${nowKey()}"></div><div class="evo-comp-fields">${Object.entries(compFields).map(([k,label])=>`<div class="evo-comp-field"><label for="ev-${k}"><strong>${html(label)}</strong><span>${units[k]}</span></label><input id="ev-${k}" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Ex.: ${html({weight:'75',fatPct:'22.4',fatKg:'16.2',muscleKg:'32.8',fatFreeKg:'56.3',bmi:'24.1',visceral:'8',bmr:'1620'}[k])}"></div>`).join('')}</div><p class="hint">IMC, massa gorda, massa livre de gordura e TMB podem ser estimados quando os dados forem suficientes. Estimativas não são medições.</p><div class="actions"><button class="btn primary evo-cta" data-evo-action="save-composition">Salvar composição</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);
}

 function validateFormDate(){const date=$('#ev-date')?.value;if(!validDate(date)||date>nowKey()){notify('Informe uma data válida, não futura.');return null;}return date;}
 async function saveBody(kind,values){const date=validateFormDate();if(!date)return;const obj={id:uid('body'),kind,date,values,source:'manual',createdAt:new Date().toISOString()};await put('bodyRecords',obj);await reload();closeModal();subpage='body';bodyTab=kind;render();notify('Registro salvo no navegador.');}
 async function saveWeight(){const weight=positive($('#ev-weight')?.value);if(weight===null||!validRange(weight,10,600)){notify('Informe um peso válido entre 10 e 600 kg.');return;}await saveBody('weight',{weight});}
 async function saveGoal(){let target=positive($('#ev-target').value),start=positive($('#ev-start-weight').value),height=positive($('#ev-height').value),age=positive($('#ev-age').value);if(![target,start].every(x=>validRange(x,10,600))||!validRange(height,60,260)||!validRange(age,18,110)){notify('Revise as faixas de peso, altura e idade.');return;}profile={id:'settings',targetWeight:target,startWeight:start,heightCm:height,age,sex:$('#ev-sex').value,updatedAt:new Date().toISOString()};await put('userProfile',profile);closeModal();subpage='overview';section='goal';render();notify('Meta e perfil salvos.');}
 async function saveMeasures(){const fields={};for(const key of Object.keys(measureFields)){const input=$('#ev-'+key).value.trim();if(input==='')continue;const value=n(input);if(value===null||value<=0||value>350){notify('Revise '+measureFields[key]);return;}fields[key]=value;}if(!Object.keys(fields).length){notify('Preencha pelo menos uma circunferência.');return;}await saveBody('measurements',fields);}
 async function saveComposition(){const fields={};for(const key of Object.keys(compFields)){const input=$('#ev-'+key).value.trim();if(input==='')continue;const value=n(input);const max={weight:600,fatPct:100,fatKg:600,muscleKg:400,fatFreeKg:600,bmi:150,visceral:100,bmr:12000}[key];if(value===null||value<0||value>max){notify('Revise '+compFields[key]);return;}fields[key]=value;}if(!Object.keys(fields).length){notify('Informe pelo menos um dado de bioimpedância.');return;}if(fields.weight!==undefined&&fields.weight<=0){notify('Peso deve ser maior que zero.');return;}await saveBody('composition',fields);}
 function openImportForm(){openModal('Importar avaliações do EvoluFísico',`<p class="hint">Selecione um JSON exportado do EvoluFísico que contenha uma lista <code>avaliacoes</code>. Somente os dados corporais serão importados; fotos, nomes e identificadores de alunos não serão copiados. Arquivos de cofre criptografado não podem ser lidos sem exportação descriptografada.</p><input id="ev-import-file" type="file" accept=".json,application/json"><div class="actions"><button class="btn primary" data-evo-action="import-ef">Importar avaliações</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);}
 async function importEvolufisico(){const file=$('#ev-import-file').files?.[0];if(!file){notify('Selecione o JSON de avaliações.');return;}if(file.size>15_000_000){notify('Arquivo maior que 15 MB.');return;}let data;try{data=JSON.parse(await file.text());}catch{notify('JSON inválido ou criptografado.');return;}const rows=Array.isArray(data)?data:Array.isArray(data.avaliacoes)?data.avaliacoes:Array.isArray(data.dados?.avaliacoes)?data.dados.avaliacoes:null;if(!rows){notify('Formato incompatível: avaliações não encontradas.');return;}if(rows.length>10000){notify('Limite de avaliações excedido.');return;}
 const batch=[];for(const row of rows){const day=dateKey(row.data_avaliacao||row.data||row.date);if(!validDate(day))continue;const bio=row.bioimpedancia||{},peri=row.perimetria||{};const values={weight:positive(bio.peso)||positive(row.peso),fatPct:n(bio.pgordura)??n(row.dobras_resultado?.percGordura),fatKg:n(bio.gordura_kg),muscleKg:n(bio.mme),fatFreeKg:n(row.dobras_resultado?.massaMagra),bmi:n(bio.imc),visceral:n(bio.visceral),bmr:n(bio.tmb)};if(Object.values(values).some(x=>x!==null))batch.push({id:uid('body'),kind:'composition',date:day,values,source:'evolufisico_import',createdAt:new Date().toISOString()});const p={neck:peri.pescoco,chest:peri.torax||peri.peitoral,armRight:peri.braco_dir,armLeft:peri.braco_esq,forearmRight:peri.antebraco_dir,forearmLeft:peri.antebraco_esq,waist:peri.cintura,hip:peri.quadril,thighRight:peri.coxa_dir,thighLeft:peri.coxa_esq,calfRight:peri.panturrilha_dir,calfLeft:peri.panturrilha_esq};const cleaned=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,positive(v)]).filter(([,v])=>v!==null));if(Object.keys(cleaned).length)batch.push({id:uid('body'),kind:'measurements',date:day,values:cleaned,source:'evolufisico_import',createdAt:new Date().toISOString()});}
 if(!batch.length){notify('Nenhuma avaliação corporal válida encontrada.');return;}if(!confirm(`Importar ${batch.length} registros corporais de ${rows.length} avaliações? Os registros atuais serão preservados.`))return;
 await transact(['bodyRecords'],'readwrite',tx=>{const store=tx.objectStore('bodyRecords');for(const row of batch)store.put(row);});await reload();closeModal();subpage='body';bodyTab='composition';render();notify(`${batch.length} registros corporais importados.`);
 }
 async function doAction(button){const action=button.dataset.evoAction;try{switch(action){
  case 'report-form':openReportForm();break;case 'print-report':preparePrintReport();break;
  case 'section':section=button.dataset.section;subpage='overview';render();break;
  case 'overview':subpage='overview';render();break;
  case 'measurements':subpage='body';bodyTab=button.dataset.bodytab||'weight';render();break;
  case 'body-tab':subpage='body';bodyTab=button.dataset.bodytab;render();break;
  case 'unit':measureUnit=button.dataset.unit;render();break;
  case 'measure-side':measureSide=button.dataset.side;document.querySelectorAll('[data-measure-pane]').forEach(el=>el.hidden=el.dataset.measurePane!==measureSide);document.querySelectorAll('[data-evo-action="measure-side"]').forEach(el=>{const sel=el.dataset.side===measureSide;el.classList.toggle('selected',sel);el.setAttribute('aria-selected',String(sel));});break;
  case 'month-prev':{const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=dateKey(new Date(y,m-2,1,12)).slice(0,7);render();break;}
  case 'month-next':{const [y,m]=calendarMonth.split('-').map(Number);calendarMonth=dateKey(new Date(y,m,1,12)).slice(0,7);render();break;}
  case 'calendar-day':{const k=button.dataset.date;const ss=workoutDays().get(k)||[];openModal('Treinos em '+longDate(k),ss.length?ss.map(s=>`<div class="card"><strong>${html(s.routineName||'Treino')}</strong><p class="card-meta">${fmt(sessionVolume(s),1)} kg · ${sessionSetCount(s)} séries concluídas</p></div>`).join(''):'<p>Nenhuma sessão concluída neste dia.</p>');break;}
  case 'weight-form':openWeightForm();break;case 'goal-form':openGoalForm();break;case 'measures-form':openMeasuresForm();break;case 'composition-form':openCompositionForm();break;
  case 'save-weight':await saveWeight();break;case 'save-goal':await saveGoal();break;case 'save-measures':await saveMeasures();break;case 'save-composition':await saveComposition();break;
  case 'import-form':openImportForm();break;case 'import-ef':await importEvolufisico();break;
  case 'delete':if(confirm('Remover este registro corporal?')){await remove('bodyRecords',button.dataset.id);await reload();render();notify('Registro removido.');}break;
 }}catch(err){console.error(err);notify('Erro ao processar a evolução: '+err.message);}}
 function bind(){document.addEventListener('click',e=>{const b=e.target.closest('[data-evo-action]');if(b){e.preventDefault();void doAction(b);}});document.addEventListener('change',e=>{if(e.target.id==='evo-period'){period=Number(e.target.value)||30;render();}});}
 function testCalculations(){const a=calcMetrics({weight:80,fatPct:20},180,{sex:'M',age:30});const ok=Math.abs(a.values.bmi-24.69)<.01&&a.values.fatKg===16&&a.values.fatFreeKg===64&&a.values.bmr===1780;const vol=sessionVolume({exercises:[{sets:[{weightKg:50,reps:10,done:true},{weightKg:60,reps:5,done:false}]}]})===500;return [`${ok?'✓':'✗'} Cálculos IMC, composição e Mifflin-St Jeor`,`${vol?'✓':'✗'} Cálculo de volume apenas das séries concluídas`];}
 bind();
 return {get records(){return records},get profile(){return profile},reload,reset,render,calcMetrics,testCalculations,reportRows,preparePrintReport};
})();

