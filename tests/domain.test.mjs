import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {emptyState,change,saveStudent,saveExercise,saveRoutine,startSession,recordSet,finishSession,validate,toKg,fromKg} from '../dist/domain.js';
import {prescription,validatePrescription,pauseSession,substitute,timerPhase,createWeeks,applyWeek,performance,muscleVolume,studentBundle,mergeStudentFeedback,migrate,filterExercises,validateBlocks,sessionProgress,startMethod,correctSet} from '../dist/beta-domain.js';
import {exportBackup,importBackup} from '../dist/backup.js';
function seed(){const s=emptyState();s.profile={name:'Personal Teste',theme:'light'};saveStudent(s,{id:'',name:'Maria',goal:'Força',equipment:'Halteres',availability:'Segundas',notes:''});saveStudent(s,{id:'',name:'José',goal:'Força',equipment:'Cabo',availability:'Quartas',notes:''});saveExercise(s,{id:'',name:'Remada',muscle:'Costas',equipment:'Cabo',instructions:'Controle',secondary:['Bíceps']});saveExercise(s,{id:'',name:'Puxada',muscle:'Costas',equipment:'Cabo',instructions:'Controle'});saveRoutine(s,{id:'',title:'Treino A',studentId:s.students[0].id,day:1,notes:''});s.routines[0].items=[{exerciseId:s.exercises[0].id,sets:1,reps:8,repsMax:10,rest:90,load:20}];return validate(s);}
test('salvamento preserva o estado original e valida os limites',()=>{const s=seed();const next=change(s,x=>{x.students[0].name='Maria editada';});assert.equal(s.students[0].name,'Maria');assert.equal(next.rev,1);assert.throws(()=>change(s,x=>{x.students[0].name='A';}));});
test('duplicação normalizada de exercícios é bloqueada',()=>{const s=seed();assert.throws(()=>saveExercise(s,{name:' REMÁDA ',muscle:'costas',equipment:'cabo',instructions:''}));});
test('apenas uma sessão, aluno inativo bloqueado e ficha preservada',()=>{const s=seed();s.students[0].active=false;assert.throws(()=>startSession(s,s.routines[0].id));s.students[0].active=true;startSession(s,s.routines[0].id,1000);assert.throws(()=>startSession(s,s.routines[0].id));s.exercises[0].name='Alterado';assert.equal(s.sessions[0].items[0].name,'Remada');});
test('pausa impede séries e desloca relógio ao retomar',()=>{let s=seed();startSession(s,s.routines[0].id,1000);s.sessions[0].timer={start:1000,work:40,rest:20,rounds:3};pauseSession(s,true,5000);assert.throws(()=>recordSet(s,s.sessions[0].id,s.exercises[0].id,{reps:10,load:20,rir:2},6000));pauseSession(s,false,15000);assert.equal(s.sessions[0].pausedMs,10000);assert.equal(s.sessions[0].timer.start,11000);});
test('substituição mantém histórico anterior e não muda ficha',()=>{const s=seed();startSession(s,s.routines[0].id,1000);recordSet(s,s.sessions[0].id,s.exercises[0].id,{reps:10,load:20,rir:3},2000);substitute(s,s.exercises[0].id,s.exercises[1].id,3000);assert.equal(s.routines[0].items[0].exerciseId,s.exercises[0].id);assert.equal(s.sessions[0].sets[0].exerciseId,s.exercises[0].id);assert.equal(s.sessions[0].items[0].replaced,true);validate(s);});
test('limites de métodos e transições do relógio',()=>{assert.throws(()=>validatePrescription({sets:3,reps:10,rest:90,method:'EMOM'}));assert.throws(()=>validatePrescription({sets:3,reps:10,rest:90,method:'TRI',block:''}));assert.equal(timerPhase({start:1000,work:40,rest:20,rounds:2},41000).label,'Intervalo');assert.equal(timerPhase({start:1000,work:40,rest:20,rounds:2},101000).label,'Concluído');});
test('encerramento vazio é bloqueado e séries inválidas não são salvas',()=>{const s=seed();startSession(s,s.routines[0].id,1000);assert.throws(()=>finishSession(s,s.sessions[0].id));assert.throws(()=>change(s,x=>recordSet(x,x.sessions[0].id,x.exercises[0].id,{reps:0,load:20,rir:2},2000)));assert.equal(s.sessions[0].sets.length,0);});
test('catálogo contém os 500 IDs canônicos válidos, sem mídia presumida aprovada',()=>{const c=JSON.parse(fs.readFileSync(new URL('../dist/catalog.json',import.meta.url)));assert.equal(c.exercises.length,500);const s=emptyState();s.exercises=c.exercises;validate(s);assert.equal(new Set(c.exercises.map(x=>x.externalId)).size,500);assert.equal(c.review.missing,55);assert.equal(c.review.pending,155);});
test('semanas aplicadas viram cópias independentes e não se repetem',()=>{const s=seed(),r=s.routines[0];s.advanced.plans.push({id:'plan',title:'Plano',studentId:s.students[0].id,start:'2026-10-29',model:'LINEAR',archived:false,weeks:createWeeks([r.id],4,'LINEAR')});applyWeek(s,'plan',3);assert.equal(s.advanced.plans[0].weeks[3].kind,'DELOAD');assert.equal(s.routines[1].items[0].load,18);assert.equal(r.items[0].load,20);assert.throws(()=>applyWeek(s,'plan',3));validate(s);});
test('volume direto e indireto usa músculo preservado na sessão',()=>{const s=seed();startSession(s,s.routines[0].id,1000);recordSet(s,s.sessions[0].id,s.exercises[0].id,{reps:10,load:20,rir:3},2000);finishSession(s,s.sessions[0].id,3000);s.exercises[0].muscle='Alterado';const v=muscleVolume(s,s.students[0].id,4000);assert.equal(v.find(x=>x.muscle==='Costas').direct,1);assert.equal(v.find(x=>x.muscle==='Bíceps').indirect,1);});
test('progressão não ignora sessão recente sem séries tradicionais',()=>{const s=seed(),r=s.routines[0],student=r.studentId,e=s.exercises[0].id;for(let i=0;i<3;i++){startSession(s,r.id,1000+i*1000);recordSet(s,s.sessions.at(-1).id,e,{reps:10,load:20,rir:3,type:'NORMAL'},1100+i*1000);finishSession(s,s.sessions.at(-1).id,1200+i*1000);}assert.equal(performance(s,student,e).action,'Considerar aumento');startSession(s,r.id,5000);recordSet(s,s.sessions.at(-1).id,e,{reps:10,load:20,rir:3,type:'DROP'},5100);finishSession(s,s.sessions.at(-1).id,5200);assert.equal(performance(s,student,e).action,'Revisar manualmente');});
test('pacote do aluno exclui finanças, avaliações e outros cadastros',()=>{const s=seed();s.advanced.payments.push({id:'p',studentId:s.students[0].id,month:'2026-10',amountCents:10000,status:'pending',notes:''});const packet=validate(studentBundle(s,s.students[0].id));assert.equal(packet.students.length,1);assert.equal(packet.advanced.payments.length,0);assert.equal(packet.advanced.assessments.length,0);assert.equal(packet.profile.role,'student');assert.throws(()=>change(packet,x=>{x.routines[0].title='Mudou';}));});
test('retorno do aluno acrescenta mensagens sem sobrescrever dados',()=>{const s=seed(),packet=studentBundle(s,s.students[0].id);packet.advanced.messages.push({id:'m',studentId:s.students[0].id,sender:'student',text:'Concluído',at:1000});mergeStudentFeedback(s,packet);mergeStudentFeedback(s,packet);assert.equal(s.advanced.messages.length,1);});
test('avaliação rejeita foto sem consentimento e valor financeiro inválido',()=>{const s=seed();s.advanced.assessments.push({id:'a',studentId:s.students[0].id,at:1000,weight:70,height:null,waist:null,bodyFat:null,photo:'data:image/png;base64,AAAA',consent:false,notes:'',habits:'',energy:3,sleep:3});assert.throws(()=>validate(s));s.advanced.assessments=[];s.advanced.payments.push({id:'p',studentId:s.students[0].id,month:'2026-10',amountCents:-1,status:'paid',notes:''});assert.throws(()=>validate(s));});
test('migração v1 mantém identidade e preenche somente dados novos',()=>{const s=seed(),old={...s,schema:1};delete old.advanced;const next=migrate(old);assert.equal(next.students[0].id,s.students[0].id);assert.equal(next.schema,2);assert.equal(next.advanced.plans.length,0);});
test('backup criptografado restaura todas as tabelas e rejeita senha e adulteração',async()=>{const s=seed();const file=await exportBackup(s,'senha-segura');assert.deepEqual(await importBackup(file,'senha-segura'),s);await assert.rejects(()=>importBackup(file,'errada123'));const b=JSON.parse(file);b.data=b.data.slice(0,-4)+'AAAA';await assert.rejects(()=>importBackup(JSON.stringify(b),'senha-segura'));});

test("ficha nova conserva o ID usado pela navegação",()=>{const s=seed();saveRoutine(s,{id:"routine_ui",title:"Ficha nova",studentId:null,day:1,notes:""});assert.ok(s.routines.find(x=>x.id==="routine_ui"));});
test("conversão de libras preserva carga canônica",()=>{assert.equal(toKg(100,"lb"),45.359237);assert.ok(Math.abs(fromKg(toKg(73.5,"lb"),"lb")-73.5)<1e-10);assert.equal(toKg(20,"kg"),20);});

test('busca combina nome músculo e equipamento sem depender de acentos',()=>{
 const exercises=[{id:'a',name:'Supino inclinado',muscle:'Peitoral',equipment:'Halteres'},{id:'b',name:'Rosca bíceps',muscle:'Bíceps',equipment:'Cabo'}];
 assert.deepEqual(filterExercises(exercises,'supino halteres').map(x=>x.id),['a']);
 assert.deepEqual(filterExercises(exercises,'biceps cabo').map(x=>x.id),['b']);
 assert.equal(filterExercises(exercises,'inexistente').length,0);
 assert.equal(filterExercises(exercises,'','peitoral').length,1);
});
test('blocos normalizam nomes e rejeitam mistura de métodos e participantes incompletos',()=>{
 const p={sets:3,reps:10,rest:90,method:'SUPER',block:'Bloco A'};
 assert.equal(validateBlocks([p,{...p,block:' bloco a '}]).length,2);
 assert.throws(()=>validateBlocks([p]));
 assert.throws(()=>validateBlocks([p,{...p,method:'BI'}]));
 assert.throws(()=>validateBlocks([p,{...p},{...p}]));
 assert.equal(validateBlocks([p,p,p].map(x=>({...x,method:'TRI'}))).length,3);
});

test('aquecimento e exercício substituído não inflam a conclusão planejada',()=>{
 const s=seed();startSession(s,s.routines[0].id,1000);const x=s.sessions[0],e=s.exercises[0].id;
 recordSet(s,x.id,e,{reps:5,load:10,rir:4,type:'AQUECIMENTO'},2000);
 assert.equal(sessionProgress(x).missing,1);
 substitute(s,e,s.exercises[1].id,3000);assert.equal(sessionProgress(x).planned,1);
 assert.throws(()=>recordSet(s,x.id,e,{reps:10,load:20,rir:2},4000));
 recordSet(s,x.id,s.exercises[1].id,{reps:10,load:20,rir:2},4000);assert.equal(sessionProgress(x).missing,0);
});
test('substituição preserva os músculos secundários corretos e rejeita repetição',()=>{
 const s=seed();s.exercises[1].secondary=['Antebraços'];startSession(s,s.routines[0].id,1000);
 substitute(s,s.exercises[0].id,s.exercises[1].id,2000);
 assert.deepEqual(s.sessions[0].items.at(-1).secondary,['Antebraços']);
 assert.deepEqual(s.sessions[0].items[0].secondary,['Bíceps']);
});
test('EMOM respeita o minuto inteiro da última rodada e AMRAP a duração total',()=>{
 const s=seed();s.routines[0].items[0]={...s.routines[0].items[0],method:'EMOM',rounds:2,work:40,interval:20};
 startSession(s,s.routines[0].id,1000);startMethod(s,s.exercises[0].id,1000);
 assert.equal(timerPhase(s.sessions[0].timer,101000).label,'Intervalo');
 assert.equal(timerPhase(s.sessions[0].timer,121000).label,'Concluído');
 s.sessions[0].items[0].method='AMRAP';s.sessions[0].items[0].seconds=120;startMethod(s,s.exercises[0].id,1000);
 assert.equal(timerPhase(s.sessions[0].timer,120000).remaining,1);
 assert.equal(timerPhase(s.sessions[0].timer,121000).label,'Concluído');
});
test('correção registra valor anterior, valida limites e bloqueia sessão concluída',()=>{
 let s=seed();startSession(s,s.routines[0].id,1000);recordSet(s,s.sessions[0].id,s.exercises[0].id,{reps:10,load:20,rir:3},2000);
 s=change(s,x=>correctSet(x,0,{reps:8,load:22,rir:2,rpe:8,type:'NORMAL',notes:'Correção'},3000));
 assert.equal(s.sessions[0].sets[0].load,22);assert.match(s.sessions[0].events[0],/20 kg/);
 assert.throws(()=>change(s,x=>correctSet(x,0,{reps:0,load:22,rir:2,rpe:8,type:'NORMAL',notes:''})));
 assert.equal(s.sessions[0].sets[0].reps,8);finishSession(s,s.sessions[0].id,4000);
 assert.throws(()=>correctSet(s,0,{},5000));
});
test('conclusão durante pausa fecha relógios e contabiliza tempo pausado',()=>{
 const s=seed();startSession(s,s.routines[0].id,1000);recordSet(s,s.sessions[0].id,s.exercises[0].id,{reps:8,load:20,rir:2},2000);
 startMethod(s,s.exercises[0].id,2000);pauseSession(s,true,3000);finishSession(s,s.sessions[0].id,6000);
 assert.equal(s.sessions[0].pausedMs,3000);assert.equal(s.sessions[0].pausedAt,0);assert.equal(s.sessions[0].timer,null);validate(s);
});
