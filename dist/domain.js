import {advancedEmpty,migrate,validateAdvanced,validatePrescription,prescription,enforceStudent,validateBlocks} from './beta-domain.js';
export const VERSION = '0.1.0-beta.8';
export const goals = ['Hipertrofia', 'Emagrecimento', 'Manutenção', 'Definição muscular', 'Condicionamento', 'Força'];
export const emptyState = () => ({schema:2,advanced:advancedEmpty(),rev:0,profile:null,students:[],exercises:[],routines:[],sessions:[]});
export const id = () => {
 if(crypto.randomUUID)return crypto.randomUUID();
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
export const normalize = s => String(s).normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR').trim();
const assert = (ok, message) => {if(!ok) throw new Error(message);};
const str = (s,min,max) => typeof s==='string' && s.trim().length>=min && s.length<=max;
const num = (n,min,max) => typeof n==='number' && Number.isFinite(n) && n>=min && n<=max;
const integer = (n,min,max) => Number.isInteger(n) && num(n,min,max);
export function validate(s) {
 assert(s && s.schema===2 && integer(s.rev,0,Number.MAX_SAFE_INTEGER),'Formato de dados incompatível.');
 for(const k of ['students','exercises','routines','sessions']) {
  assert(Array.isArray(s[k]) && s[k].length<=20000,'Quantidade de registros inválida.');
  assert(s[k].every(x=>x && str(x.id,1,80)&&/^[A-Za-z0-9_-]+$/.test(x.id)) && new Set(s[k].map(x=>x.id)).size===s[k].length,'IDs ausentes ou duplicados.');
 }
 if(s.profile) assert(str(s.profile.name,2,60) && ['light','dark'].includes(s.profile.theme) && ['kg','lb'].includes(s.profile.weightUnit||'kg') && ['cm','in'].includes(s.profile.lengthUnit||'cm') && ['Iniciante','Intermediário','Avançado'].includes(s.profile.experience||'Iniciante') && integer(s.profile.defaultRest??90,0,3600) && str(s.profile.equipment||'',0,200) && str(s.profile.goal||'',0,100),'Perfil inválido.');
 const students = new Set(s.students.map(x=>x.id)), exercises = new Set(s.exercises.map(x=>x.id));
 s.students.forEach(x=>assert(str(x.name,2,80) && str(x.goal,1,100) && str(x.equipment,0,200) && str(x.availability,0,200) && str(x.notes,0,1000) && typeof x.active==='boolean','Cadastro de aluno inválido.'));
 s.exercises.forEach(x=>assert(str(x.name,2,120) && str(x.muscle,2,50) && str(x.equipment,0,100) && str(x.instructions,0,2000) && typeof x.favorite==='boolean' && (x.secondary===undefined || Array.isArray(x.secondary)&&x.secondary.length<=10&&x.secondary.every(m=>str(m,2,50))),'Exercício inválido.'));
 function items(list) {
  assert(Array.isArray(list) && list.length<=100 && new Set(list.map(x=>x.exerciseId)).size===list.length,'Itens de treino inválidos ou duplicados.');
  list.forEach(x=>assert(x && exercises.has(x.exerciseId) && integer(x.sets,1,15) && integer(x.reps,1,1000) && integer(x.rest,0,3600),'Séries, repetições ou descanso inválidos.'));
 }
 s.routines.forEach(x=>{assert(str(x.title,2,60) && str(x.notes,0,1000) && integer(x.day,0,7) && (x.studentId===null || students.has(x.studentId)) && typeof x.archived==='boolean','Ficha inválida.');items(x.items);});
 const routines=new Set(s.routines.map(x=>x.id));
 assert(s.sessions.filter(x=>x.finishedAt===null).length<=1,'Já existe mais de uma sessão aberta.');
 s.sessions.forEach(x=>{
  assert(routines.has(x.routineId) && (x.studentId===null || students.has(x.studentId)) && num(x.startedAt,1,Number.MAX_SAFE_INTEGER) && (x.finishedAt===null || num(x.finishedAt,x.startedAt,Number.MAX_SAFE_INTEGER)) && str(x.title,2,60) && str(x.studentName,0,80),'Sessão inválida.');
  items(x.items);assert(Array.isArray(x.sets) && x.sets.length<=2000,'Séries inválidas.');
  x.sets.forEach(t=>assert(x.items.some(i=>i.exerciseId===t.exerciseId) && integer(t.reps,1,1000) && num(t.load,0,1000) && (t.rir===null || integer(t.rir,0,10)) && num(t.at,x.startedAt,Number.MAX_SAFE_INTEGER) && (t.rpe===undefined||t.rpe===null||integer(t.rpe,1,10)) && (t.type===undefined||['NORMAL','AQUECIMENTO','BACKOFF','DROP','FALHA'].includes(t.type)) && (t.notes===undefined||str(t.notes,0,180)),'Valores da série inválidos.'));
  assert(num(x.restUntil,0,Number.MAX_SAFE_INTEGER),'Descanso inválido.');
 });
 return validateAdvanced(s);
}
export function change(state, action) {
 const s=structuredClone(state);action(s);s.rev=state.rev+1;enforceStudent(state,s);return validate(s);
}
export function saveStudent(s, draft) {
 const existing=s.students.find(x=>x.id===draft.id);
 const value={...draft,id:existing?.id || id(),active:existing?.active ?? true};
 if(existing) Object.assign(existing,value);else s.students.push(value);
}
export function saveExercise(s, draft) {
 assert(!s.exercises.some(x=>x.id!==draft.id && [x.name,x.muscle,x.equipment].map(normalize).join('|')===[draft.name,draft.muscle,draft.equipment].map(normalize).join('|')),'Já existe esse exercício com o mesmo músculo e equipamento.');
 const existing=s.exercises.find(x=>x.id===draft.id);const value={...draft,id:existing?.id || id(),favorite:existing?.favorite ?? false};
 if(existing) Object.assign(existing,value);else s.exercises.push(value);
}
export function saveRoutine(s, draft) {
 const existing=s.routines.find(x=>x.id===draft.id);
 assert(!s.sessions.some(x=>!x.finishedAt && x.routineId===draft.id),'Conclua a sessão antes de alterar esta ficha.');
 assert(draft.studentId===null || s.students.some(x=>x.id===draft.studentId && x.active),'Selecione um aluno ativo.');
 const value={...draft,id:existing?.id || draft.id || id(),archived:existing?.archived ?? false,items:existing?.items || []};
 if(existing) Object.assign(existing,value);else s.routines.push(value);
}
export function startSession(s,routineId,now=Date.now()) {
 assert(!s.sessions.some(x=>!x.finishedAt),'Retome a sessão aberta antes de iniciar outra.');
 const r=s.routines.find(x=>x.id===routineId);assert(r && !r.archived && r.items.length,'Adicione exercícios a uma ficha ativa.');
 const student=s.students.find(x=>x.id===r.studentId);assert(!r.studentId || student?.active,'Reative o aluno para iniciar uma sessão.');
 validateBlocks(r.items);
 const items=r.items.map(i=>({...prescription(i),secondary:s.exercises.find(e=>e.id===i.exerciseId).secondary||[],name:s.exercises.find(e=>e.id===i.exerciseId).name,muscle:s.exercises.find(e=>e.id===i.exerciseId).muscle}));
 s.sessions.push({id:id(),routineId:r.id,studentId:r.studentId,studentName:student?.name || '',title:r.title,items,sets:[],startedAt:now,finishedAt:null,restUntil:0,pausedAt:0,pausedMs:0,events:[],timer:null,fatigue:null});
}
export function recordSet(s,sessionId,exerciseId,draft,now=Date.now()) {
 const session=s.sessions.find(x=>x.id===sessionId && !x.finishedAt);assert(session,'A sessão já foi encerrada.');assert(!session.pausedAt,'Retome a sessão antes de registrar.');
 const item=session.items.find(x=>x.exerciseId===exerciseId);assert(item&&!item.replaced,'Exercício fora da sessão ou substituído.');
 session.sets.push({exerciseId,...draft,at:now});session.restUntil=now+item.rest*1000;
}
export function finishSession(s,sessionId,now=Date.now()) {
 const session=s.sessions.find(x=>x.id===sessionId && !x.finishedAt);assert(session?.sets.length,'Registre uma série antes de concluir.');if(session.pausedAt){session.pausedMs+=Math.max(0,now-session.pausedAt);session.pausedAt=0;}session.finishedAt=now;session.restUntil=0;session.timer=null;
}
export const sessionVolume = session => session.sets.reduce((n,x)=>n+x.reps*x.load,0);
export const initials = name => name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();

export const toKg=(value,unit='kg')=>unit==='lb'?value*.45359237:value;
export const fromKg=(value,unit='kg')=>unit==='lb'?value/.45359237:value;

