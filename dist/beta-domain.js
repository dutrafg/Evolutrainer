import {id,normalize,sessionVolume} from './domain.js';
export const methods={NORMAL:'Tradicional',SUPER:'Supersérie',BI:'Bi-set',TRI:'Tri-set',DROP:'Dropset',REST_PAUSE:'Rest-pause',CLUSTER:'Cluster',CIRCUIT:'Circuito',HIIT:'HIIT',EMOM:'EMOM',AMRAP:'AMRAP'};
export const advancedEmpty=()=>({plans:[],appointments:[],assessments:[],payments:[],messages:[],reviews:[],preferences:{recoveryHours:48,hideMoney:false}});
const ok=(v,m='Confira os dados informados.')=>{if(!v)throw new Error(m);};
const str=(v,max,min=0)=>typeof v==='string'&&v.trim().length>=min&&v.length<=max;
const int=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const num=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export const prescription=i=>({repsMax:i.reps,load:null,rir:null,rpe:null,cadence:'',seconds:0,notes:'',method:'NORMAL',block:'',rounds:1,work:30,interval:15,...i});
export function validatePrescription(i){const p=prescription(i);ok(int(p.repsMax,p.reps,1000)&& (p.load===null||num(p.load,0,1000))&&(p.rir===null||int(p.rir,0,10))&&(p.rpe===null||int(p.rpe,1,10))&&str(p.cadence,30)&&int(p.seconds,0,7200)&&str(p.notes,1000)&&Object.hasOwn(methods,p.method)&&str(p.block,30)&&int(p.rounds,1,100)&&int(p.work,1,3600)&&int(p.interval,0,3600),'Prescrição inválida.');ok(!['SUPER','BI','TRI','CIRCUIT'].includes(p.method)||p.block.trim(),'Informe o bloco de exercícios associados.');ok(p.method!=='EMOM'||p.work+p.interval===60,'O EMOM precisa totalizar 60 segundos por rodada.');ok(p.method!=='AMRAP'||p.seconds>0,'Defina a duração do AMRAP.');return p;}
export function migrate(s){if(s?.schema===1)return {...s,schema:2,advanced:advancedEmpty(),sessions:s.sessions.map(x=>({...x,pausedAt:0,pausedMs:0,events:[],timer:null}))};return s;}
export function validateAdvanced(s){
 ok(s.advanced&&typeof s.advanced==='object','Dados complementares ausentes.');const a=s.advanced;
 const studentIds=new Set(s.students.map(x=>x.id)),routineIds=new Set(s.routines.map(x=>x.id)),exerciseIds=new Set(s.exercises.map(x=>x.id));
 for(const k of ['plans','appointments','assessments','payments','messages','reviews'])ok(Array.isArray(a[k])&&a[k].length<=20000&&a[k].every(x=>str(x.id,100,1))&&new Set(a[k].map(x=>x.id)).size===a[k].length,'Registros complementares inválidos.');
 ok(int(a.preferences?.recoveryHours,12,168)&&typeof a.preferences.hideMoney==='boolean','Preferências inválidas.');
 const student=x=>ok(x===null||studentIds.has(x),'Aluno não encontrado.');
 a.appointments.forEach(x=>{student(x.studentId);ok(str(x.title,100,2)&&num(x.at,1,Number.MAX_SAFE_INTEGER)&&['planned','done','missed','cancelled'].includes(x.status)&&int(x.remindMinutes,0,10080));});
 a.assessments.forEach(x=>{student(x.studentId);ok(x.studentId!==null&&num(x.at,1,Number.MAX_SAFE_INTEGER)&&[x.weight,x.height,x.waist,x.bodyFat].every((v,i)=>v===null||num(v,[1,30,10,0][i],[500,250,300,80][i]))&&str(x.notes,2000)&&str(x.habits,1000)&&int(x.energy,1,5)&&int(x.sleep,1,5)&&typeof x.consent==='boolean'&&(x.photo===null||(x.consent&&str(x.photo,1500000)&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.photo))),'Avaliação inválida ou foto sem consentimento.');});
 a.payments.forEach(x=>{student(x.studentId);ok(x.studentId!==null&&/^\d{4}-\d{2}$/.test(x.month)&&int(x.amountCents,0,100000000)&&['pending','paid'].includes(x.status)&&str(x.notes,1000));});
 a.messages.forEach(x=>{student(x.studentId);ok(x.studentId!==null&&['professional','student'].includes(x.sender)&&str(x.text,2000,1)&&num(x.at,1,Number.MAX_SAFE_INTEGER));});
 a.reviews.forEach(x=>ok(exerciseIds.has(x.id)&&['approved','rejected','pending'].includes(x.status)&&str(x.note,1000)));
 a.plans.forEach(x=>{student(x.studentId);ok(str(x.title,60,2)&&/^\d{4}-\d{2}-\d{2}$/.test(x.start)&&Number.isFinite(Date.parse(x.start))&&['LINEAR','WAVE','CUSTOM'].includes(x.model)&&typeof x.archived==='boolean'&&Array.isArray(x.weeks)&&x.weeks.length>=1&&x.weeks.length<=52);x.weeks.forEach(w=>ok(['NORMAL','DELOAD','RECOVERY'].includes(w.kind)&&int(w.volume,10,200)&&int(w.load,10,150)&&Array.isArray(w.routines)&&w.routines.length>0&&w.routines.length<=14&&new Set(w.routines).size===w.routines.length&&w.routines.every(r=>routineIds.has(r))&&Array.isArray(w.applied)&&w.applied.every(r=>routineIds.has(r))));});
 s.routines.forEach(r=>r.items.forEach(validatePrescription));
 s.sessions.forEach(x=>{ok(num(x.pausedAt,0,Number.MAX_SAFE_INTEGER)&&num(x.pausedMs,0,Number.MAX_SAFE_INTEGER)&&Array.isArray(x.events)&&x.events.length<=20000&&x.events.every(e=>str(e,500)));if(x.timer)ok(num(x.timer.start,0,Number.MAX_SAFE_INTEGER)&&int(x.timer.work,1,7200)&&int(x.timer.rest,0,3600)&&int(x.timer.rounds,1,100));x.items.forEach(validatePrescription);});
 if(s.profile?.role==='student')ok(studentIds.size===1&&studentIds.has(s.profile.studentId)&&s.routines.every(r=>r.studentId===s.profile.studentId)&&s.sessions.every(x=>x.studentId===s.profile.studentId)&&a.payments.length===0&&a.assessments.length===0&&a.plans.length===0,'Pacote do aluno contém dados não permitidos.');
 return s;
}
export function pauseSession(s,paused,now=Date.now()){const x=s.sessions.find(x=>!x.finishedAt);ok(x,'Não há sessão aberta.');if(paused&&!x.pausedAt){x.pausedAt=now;x.events.push(`${now} · Pausa`);}else if(!paused&&x.pausedAt){const gap=Math.max(0,now-x.pausedAt);x.pausedMs+=gap;x.restUntil+=x.restUntil?gap:0;if(x.timer)x.timer.start+=gap;x.pausedAt=0;x.events.push(`${now} · Retomada`);}}
export function substitute(s,exerciseId,replacementId,now=Date.now()){const x=s.sessions.find(x=>!x.finishedAt);ok(x&&!x.pausedAt,'Retome a sessão primeiro.');ok(!x.items.some(i=>i.exerciseId===replacementId),'Exercício já está na sessão.');const replacement=s.exercises.find(e=>e.id===replacementId),item=x.items.find(i=>i.exerciseId===exerciseId);ok(replacement&&item&&!item.replaced,'Exercício já substituído.');x.events.push(`${now} · ${item.name} substituído por ${replacement.name}`);const copy={...structuredClone(item),exerciseId:replacement.id,name:replacement.name,muscle:replacement.muscle,secondary:[...(replacement.secondary||[])],replaced:false,substituteOf:exerciseId};x.items.push(copy);item.replaced=true;}
export function timerPhase(timer,now){if(!timer)return null;const elapsed=Math.max(0,Math.floor((now-timer.start)/1000)),cycle=timer.work+timer.rest,total=cycle*timer.rounds-(timer.includeFinalRest?0:timer.rest);if(elapsed>=total)return {label:'Concluído',remaining:0,round:timer.rounds};const part=elapsed%cycle;return {label:part<timer.work?'Execução':'Intervalo',remaining:part<timer.work?timer.work-part:cycle-part,round:Math.floor(elapsed/cycle)+1};}
export function createWeeks(ids,count,model){ok(int(count,1,52));return Array.from({length:count},(_,i)=>{const deload=i>0&&(i+1)%4===0;return {kind:deload?'DELOAD':'NORMAL',volume:deload?60:model==='LINEAR'?Math.min(200,100+i*5):model==='WAVE'?[100,110,90][i%3]:100,load:deload?90:model==='LINEAR'?Math.min(150,100+i*2):model==='WAVE'?[100,95,105][i%3]:100,routines:[...ids],applied:[]};});}
export function editPlanWeek(s,planId,index,draft){
 const p=s.advanced.plans.find(p=>p.id===planId),w=p?.weeks[index];
 ok(p&&!p.archived&&Number.isInteger(index)&&w&&!w.applied.length,'Semana indisponível, arquivada ou já aplicada.');
 ok(['NORMAL','DELOAD','RECOVERY'].includes(draft.kind)&&int(draft.volume,10,200)&&int(draft.load,10,150),'Fatores semanais inválidos.');
 const ids=draft.routines;
 ok(Array.isArray(ids)&&ids.length>=1&&ids.length<=14&&new Set(ids).size===ids.length,'Selecione de uma a 14 fichas diferentes.');
 ok(ids.every(id=>s.routines.some(r=>r.id===id&&!r.archived&&r.items.length&&(!r.studentId||r.studentId===p.studentId))),'Selecione fichas ativas com exercícios, pessoais ou do aluno do plano.');
 Object.assign(w,{kind:draft.kind,volume:draft.volume,load:draft.load,routines:[...ids]});
}
export function applyWeek(s,planId,index){const plan=s.advanced.plans.find(x=>x.id===planId),w=plan?.weeks[index];ok(plan&&!plan.archived&&w&&!w.applied.length,'Semana indisponível ou já aplicada.');ok(!plan.studentId||s.students.some(x=>x.id===plan.studentId&&x.active),'Reative o aluno antes de aplicar.');w.applied=w.routines.map(rid=>{const r=s.routines.find(r=>r.id===rid);ok(r&&!r.archived&&r.items.length&&(!r.studentId||r.studentId===plan.studentId),'Ficha indisponível ou de outro aluno.');const copy={...structuredClone(r),id:id(),title:`${plan.title.slice(0,24)} S${index+1} · ${r.title}`.slice(0,60),studentId:plan.studentId,planId,planWeek:index,items:r.items.map(i=>{const p=prescription(i),load=p.load===null?null:p.load*w.load/100;ok(load===null||load<=1000,'A carga ultrapassaria 1000 kg.');return {...p,sets:Math.min(15,Math.max(1,Math.round(p.sets*w.volume/100))),load};})};s.routines.push(copy);return copy.id;});}
export function performance(s,studentId,exerciseId){const sessions=s.sessions.filter(x=>x.finishedAt&&x.studentId===studentId&&x.items.some(i=>i.exerciseId===exerciseId)).sort((a,b)=>a.finishedAt-b.finishedAt);const points=sessions.map(x=>{const work=x.sets.filter(t=>t.exerciseId===exerciseId&&t.type!=='AQUECIMENTO');return {at:x.finishedAt,volume:work.reduce((n,t)=>n+t.load*t.reps,0),load:work.length?Math.max(...work.map(t=>t.load)):null,e1rm:work.some(t=>t.reps<=10&&t.load>0)?Math.max(...work.filter(t=>t.reps<=10&&t.load>0).map(t=>t.load*(1+t.reps/30))):null};});let action='Dados insuficientes',reason='Registre três sessões comparáveis com séries tradicionais completas e RIR.';let suggested=null;const recent=sessions.slice(-3);if(recent.length===3){const ps=recent.map(x=>prescription(x.items.find(i=>i.exerciseId===exerciseId))),groups=recent.map(x=>x.sets.filter(t=>t.exerciseId===exerciseId&&t.type!=='AQUECIMENTO'));if(recent.some(x=>x.fatigue>=4)||ps.some(p=>p.replaced||p.substituteOf)){action='Revisar manualmente';reason='Há fadiga alta relatada ou substituição do exercício nas sessões recentes.';}else if(ps.some(p=>p.method!=='NORMAL')||groups.some(g=>g.some(t=>(t.type||'NORMAL')!=='NORMAL'))||ps.some(p=>['sets','reps','repsMax','rest','cadence','seconds','rounds','work','interval'].some(k=>p[k]!==ps[0][k]))){action='Revisar manualmente';reason='Há métodos especiais ou prescrições diferentes.';}else if(groups.every(g=>g.length===ps[0].sets&&g.every(t=>t.rir!==null))){const loads=[...new Set(groups.flat().map(t=>t.load))];if(loads.length===1&&loads[0]>0){const load=loads[0];if(groups.every(g=>g.every(t=>t.reps>=ps[0].repsMax&&t.rir>=2))){action='Considerar aumento';reason='Três sessões completas na mesma carga, no limite superior e RIR ≥2. Referência de +2%, sem alteração automática.';suggested=Math.min(1000,load*1.02);}else if(groups.slice(-2).every(g=>g.every(t=>t.reps<ps[0].reps||t.rir===0))){action='Considerar redução';reason='Duas sessões recentes abaixo da faixa ou sem reserva. Referência de −5%, sujeita à revisão.';suggested=load*.95;}else{action='Manter e observar';reason='Os critérios consistentes para aumento ou redução não foram atingidos.';suggested=load;}}else{action='Revisar manualmente';reason='As cargas variam entre as séries.';}}}return {points,action,reason,suggested};}
export function muscleVolume(s,studentId,now=Date.now()){const hits=new Map();for(const session of s.sessions.filter(x=>x.finishedAt&&x.studentId===studentId&&x.finishedAt>=now-7*86400000&&x.finishedAt<=now)){for(const t of session.sets.filter(t=>t.type!=='AQUECIMENTO')){const i=session.items.find(i=>i.exerciseId===t.exerciseId);if(!i)continue;for(const [muscle,direct] of [[i.muscle,true],...[...new Map((i.secondary||[]).filter(m=>normalize(m)!==normalize(i.muscle)).slice().reverse().map(m=>[normalize(m),m])).values()].map(m=>[m,false])]){const k=normalize(muscle),g=hits.get(k)||{muscle,direct:0,indirect:0,last:0,days:new Set(),fatigue:null};g[direct?'direct':'indirect']++;g.days.add(new Date(session.finishedAt).toLocaleDateString('pt-BR'));if(session.finishedAt>=g.last){g.last=session.finishedAt;g.fatigue=session.fatigue??null;}hits.set(k,g);}}}return [...hits.values()].map(g=>({...g,days:[...g.days],status:g.fatigue>=4?'Fadiga alta relatada: revisar próximo estímulo':(now-g.last)/3600000<s.advanced.preferences.recoveryHours?'Intervalo de referência ainda não atingido':'Intervalo de referência atingido'}));}
export function studentBundle(s,studentId){const x=s.students.find(x=>x.id===studentId);ok(x,'Aluno não encontrado.');const routines=s.routines.filter(r=>r.studentId===studentId),sessions=s.sessions.filter(r=>r.studentId===studentId),used=new Set([...routines,...sessions].flatMap(r=>r.items.map(i=>i.exerciseId)));return {...s,rev:0,profile:{name:x.name,theme:s.profile.theme,role:'student',studentId},students:[structuredClone(x)],exercises:s.exercises.filter(e=>used.has(e.id)),routines:structuredClone(routines),sessions:structuredClone(sessions),advanced:{...advancedEmpty(),messages:s.advanced.messages.filter(m=>m.studentId===studentId),appointments:s.advanced.appointments.filter(m=>m.studentId===studentId)}};}
export function mergeStudentFeedback(s,packet){ok(packet.profile?.role==='student','Selecione um pacote do aluno.');const owner=packet.profile.studentId;ok(s.students.some(x=>x.id===owner),'Aluno fora deste cadastro.');for(const message of packet.advanced.messages.filter(x=>x.sender==='student')){ok(message.studentId===owner,'Mensagem de outro aluno.');if(!s.advanced.messages.some(x=>x.id===message.id))s.advanced.messages.push(structuredClone(message));}for(const session of packet.sessions){ok(session.studentId===owner&&s.routines.some(r=>r.id===session.routineId&&r.studentId===owner),'Sessão fora do compartilhamento.');const previous=s.sessions.find(x=>x.id===session.id);if(!previous)s.sessions.push(structuredClone(session));else if(JSON.stringify(previous)!==JSON.stringify(session))throw new Error('Há uma sessão com o mesmo ID e conteúdo diferente. Revise sem substituir o histórico.');}}
export function enforceStudent(previous,next){if(previous.profile?.role!=='student')return;for(const k of ['students','exercises','routines'])ok(JSON.stringify(previous[k])===JSON.stringify(next[k]),'Edição disponível apenas no espaço profissional.');for(const k of ['plans','payments','assessments','appointments','reviews','preferences'])ok(JSON.stringify(previous.advanced[k])===JSON.stringify(next.advanced[k]),'Acesso restrito ao profissional.');ok(previous.profile.studentId===next.profile.studentId&&next.profile.role==='student','Perfil do aluno inválido.');const oldMessages=new Map(previous.advanced.messages.map(x=>[x.id,x]));ok(previous.advanced.messages.every(x=>JSON.stringify(x)===JSON.stringify(next.advanced.messages.find(m=>m.id===x.id))));ok(next.advanced.messages.filter(x=>!oldMessages.has(x.id)).every(x=>x.sender==='student'&&x.studentId===previous.profile.studentId));}

export function filterExercises(exercises,query='',muscle=''){
 const terms=normalize(query).split(/\s+/).filter(Boolean);
 return exercises.filter(e=>(!muscle||normalize(e.muscle)===normalize(muscle))&&terms.every(t=>normalize([e.name,e.muscle,e.equipment].join(' ')).includes(t)));
}
export function validateBlocks(items){
 const planned=items.map(validatePrescription);
 for(const p of planned){
  if(!['SUPER','BI','TRI','CIRCUIT'].includes(p.method))continue;
  const group=planned.filter(x=>normalize(x.block)===normalize(p.block));
  ok(group.every(x=>x.method===p.method),'Use o mesmo método em todos os exercícios do bloco '+p.block+'.');
  const count=group.length;
  ok(p.method==='TRI'?count===3:p.method==='CIRCUIT'?count>=2:count===2,'Confira o bloco '+p.block+': bi/supersérie = 2, tri-set = 3 e circuito ≥2.');
 }
 return planned;
}

export function sessionProgress(session){
 const items=session.items.filter(i=>!i.replaced);
 const planned=items.reduce((n,i)=>n+i.sets,0);
 const completed=items.reduce((n,i)=>n+Math.min(i.sets,session.sets.filter(t=>t.exerciseId===i.exerciseId&&t.type!=='AQUECIMENTO').length),0);
 return {planned,completed,missing:planned-completed};
}
export function startMethod(s,exerciseId,now=Date.now()){
 const x=s.sessions.find(x=>!x.finishedAt);ok(x&&!x.pausedAt,'Retome o treino.');
 const item=x.items.find(i=>i.exerciseId===exerciseId&&!i.replaced);ok(item,'Exercício indisponível.');const p=validatePrescription(item);
 x.timer={start:now,exerciseId,work:p.method==='AMRAP'?p.seconds:p.method==='NORMAL'&&p.seconds?p.seconds:p.work,rest:p.method==='AMRAP'?0:p.interval,rounds:p.method==='AMRAP'?1:p.rounds,includeFinalRest:p.method==='EMOM'};
}
export function correctSet(s,index,draft,now=Date.now()){
 const x=s.sessions.find(x=>!x.finishedAt);ok(x&&!x.pausedAt,'Retome o treino para corrigir.');
 ok(Number.isInteger(index)&&index>=0&&index<x.sets.length,'Série não encontrada.');
 const t=x.sets[index];const before=`${t.reps} rep. × ${t.load} kg · RIR ${t.rir??'—'} · RPE ${t.rpe??'—'} · ${t.type||'NORMAL'} · ${t.notes||''}`;
 Object.assign(t,{reps:draft.reps,load:draft.load,rir:draft.rir,rpe:draft.rpe,type:draft.type,notes:draft.notes});
 x.events.push(`${now} · Série ${index+1} corrigida. Antes: ${before}`);
}

export const methodGuides={
 NORMAL:'Execute as séries prescritas e registre cada uma. Use a duração-alvo quando o exercício for por tempo.',
 SUPER:'Alterne os dois exercícios do mesmo bloco; registre cada série no exercício correspondente.',
 BI:'Execute os dois exercícios do mesmo bloco em sequência; registre cada um separadamente.',
 TRI:'Execute os três exercícios do bloco em sequência; registre cada um separadamente.',
 CIRCUIT:'Siga a ordem dos exercícios do bloco em cada rodada e registre cada estação.',
 DROP:'Após reduzir a carga, registre cada etapa como série Drop com sua carga e repetições.',
 REST_PAUSE:'Registre cada esforço e use execução/intervalo para guiar as pausas curtas prescritas.',
 CLUSTER:'Registre cada minissérie; configure as rodadas e o intervalo entre esforços.',
 HIIT:'Configure execução, intervalo e rodadas. O relógio guia as fases; registre o resultado manualmente.',
 EMOM:'Execução e intervalo devem somar 60 segundos. O relógio completa todos os minutos prescritos.',
 AMRAP:'Configure a duração total e registre manualmente os esforços realizados dentro desse tempo.'
};

export function mergeLinkedCatalog(s,catalog){
 if(s.profile?.role==='student')return 0;
 let changed=0;
 for(const source of catalog.exercises.filter(e=>e.media?.sha)){
  let e=s.exercises.find(x=>x.id===source.id)||s.exercises.find(x=>x.externalId===source.externalId&&x.origin==='MD500')||s.exercises.find(x=>normalize(x.name)===normalize(source.name)&&normalize(x.muscle)===normalize(source.muscle));
  if(!e){s.exercises.push(structuredClone(source));changed++;continue;}
  if(JSON.stringify(e.media)!==JSON.stringify(source.media)||e.externalId!==source.externalId){e.media=structuredClone(source.media);e.externalId=source.externalId;e.origin='MD500';changed++;}
 }
 return changed;
}
