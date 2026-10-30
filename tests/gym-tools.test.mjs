import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {emptyState, validate} from '../dist/domain.js';
import {
  estimatedOneRM, plateBreakdown, createStarterRoutines, exerciseInsights,
  importOpenGymText, exportWorkoutsCSV, renderGymTools
} from '../dist/gym-tools.js';

globalThis.crypto ||= webcrypto;
const exercise = (id,name,muscle)=>({id,name,muscle,equipment:'Livre',instructions:'',secondary:[],favorite:false});

test('estimativas de 1RM usam a faixa de repetições segura',()=>{
  assert.equal(estimatedOneRM(100,1),100);
  assert.ok(Math.abs(estimatedOneRM(100,5)-116.6667)<0.01);
  assert.ok(Math.abs(estimatedOneRM(100,5,'brzycki')-112.5)<0.01);
  assert.equal(estimatedOneRM(100,13),null);
  assert.equal(estimatedOneRM(0,8),null);
});
test('anilhas são distribuídas igualmente e indicam peso que falta',()=>{
  const p=plateBreakdown(100,20);
  assert.equal(p.actual,100);
  assert.deepEqual(p.sides,[{weight:25,quantity:1},{weight:15,quantity:1}]);
  assert.equal(p.unmatched,0);
  assert.throws(()=>plateBreakdown(10,20));
  assert.ok(plateBreakdown(22,20).unmatched>0);
});
test('importação textual separa a identificação, preserva existentes e nunca cria campos de mídia',()=>{
  const s=emptyState();
  s.exercises.push(exercise('manual','Supino reto','Peito'));
  const rows=[
    {id:'0025',name:'Supino reto',target:'pectorals',equipment:'Barra',instructions:['Pressione a barra.']},
    {id:'0044',name:'Remada baixa',target:'lats',equipment:'Polia',secondaryMuscles:['biceps'],instructions:['Puxe em direção ao tronco.']},
    {id:'0044',name:'Remada baixa',target:'lats',equipment:'Polia'}
  ];
  const r=importOpenGymText(s,rows);
  assert.deepEqual(r,{added:1,ignored:2});
  assert.equal(s.exercises[0].id,'manual');
  assert.equal(s.exercises[1].id,'og_0044');
  assert.equal(s.exercises[1].muscle,'Costas');
  assert.equal(s.exercises[1].instructions,'Puxe em direção ao tronco.');
  assert.equal('media' in s.exercises[1],false);
  validate(s);
});
test('modelos PPL geram fichas com IDs novos e sem apagar o histórico',()=>{
  const s=emptyState();
  s.exercises.push(exercise('e1','Supino com barra','Peito'));
  s.exercises.push(exercise('e2','Remada com halteres','Costas'));
  s.exercises.push(exercise('e3','Agachamento livre','Pernas'));
  const names=createStarterRoutines(s,'ppl');
  assert.equal(names.length,3);
  assert.equal(s.routines.length,3);
  assert.ok(s.routines.every(x=>x.items.length&&x.items.every(i=>i.exerciseId)));
  assert.equal(s.routines[0].day,1);
  assert.equal(s.sessions.length,0);
  validate(s);
});
test('resumo e CSV excluem aquecimentos da análise de volume',()=>{
  const s=emptyState();
  s.exercises.push(exercise('e1','Supino','Peito'));
  s.routines.push({id:'r1',title:'Treino A',notes:'',day:1,studentId:null,archived:false,items:[{exerciseId:'e1',sets:3,reps:10,rest:90}]});
  s.sessions.push({
    id:'s1',routineId:'r1',studentId:null,studentName:'',title:'Treino A',
    startedAt:1700000000000,finishedAt:1700000010000,restUntil:0,
    items:[{exerciseId:'e1',sets:3,reps:10,rest:90,name:'Supino',muscle:'Peito'}],
    sets:[
      {exerciseId:'e1',at:1700000001000,reps:10,load:20,rir:null,type:'AQUECIMENTO'},
      {exerciseId:'e1',at:1700000002000,reps:8,load:40,rir:2,type:'NORMAL'}
    ],pausedAt:0,pausedMs:0,events:[],timer:null
  });
  validate(s);
  const stats=exerciseInsights(s);
  assert.equal(stats.sets,1);
  assert.equal(stats.volume,320);
  assert.equal(stats.records[0].name,'Supino');
  assert.ok(exportWorkoutsCSV(s).includes('Treino A'));
  assert.ok(renderGymTools(s).includes('Ferramentas de treinamento'));
});
