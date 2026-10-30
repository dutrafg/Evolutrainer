// Recursos complementares inspirados em funcionalidades abertas do openGym.
// Implementação original para o EvoluPersonal/EvoluTrainer; nenhuma mídia do Gym visual é incluída.
// Treinos e histórico existentes são preservados. Cargas internas sempre em kg.
import {id, normalize} from './domain.js';

const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const workSet = set => set && set.type !== 'AQUECIMENTO' && num(set.reps) > 0 && num(set.load) >= 0;
const fmt = n => new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 1}).format(n);
const dateKey = time => {
  const d = new Date(time);
  if (!Number.isFinite(d.getTime())) return '';
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
};

export function estimatedOneRM(load, reps, formula='epley') {
  const kg = Number(load), n = Number(reps);
  if (!Number.isFinite(kg) || kg <= 0 || !Number.isInteger(n) || n < 1 || n > 12) return null;
  if (n === 1) return kg;
  if (formula === 'brzycki') return kg * 36 / (37-n);
  return kg * (1+n/30);
}

export function plateBreakdown(target, bar=20, plates=[25,20,15,10,5,2.5,1.25]) {
  if (![target,bar].every(v=>Number.isFinite(Number(v))) || num(target)<num(bar) || num(bar)<0) throw new Error('Informe uma carga total maior ou igual à barra.');
  if (!Array.isArray(plates) || !plates.every(x=>Number.isFinite(x)&&x>0)) throw new Error('Anilhas inválidas.');
  let remaining=(num(target)-num(bar))/2;
  const sides=[];
  for (const plate of [...new Set(plates)].sort((a,b)=>b-a)) {
    const qty=Math.floor((remaining+1e-7)/plate);
    if(qty>0){sides.push({weight:plate,quantity:qty});remaining=Math.max(0,remaining-qty*plate);}
  }
  const actual=num(target)-2*remaining;
  return {sides,actual,unmatched:Math.round(remaining*2*100)/100};
}

export function exerciseInsights(state, studentId='') {
  const completed=(state.sessions||[]).filter(s=>s.finishedAt && (studentId==='' || (s.studentId||'')===studentId));
  const byExercise=new Map();
  let totalVolume=0,totalSets=0;
  for(const s of completed){
    for(const set of s.sets||[]){
      if(!workSet(set))continue;
      const volume=num(set.reps)*num(set.load);totalVolume+=volume;totalSets++;
      const old=byExercise.get(set.exerciseId)||{id:set.exerciseId,sessions:0,sets:0,volume:0,oneRM:0,last:0,topLoad:0,days:new Set()};
      old.sets++;old.volume+=volume;old.topLoad=Math.max(old.topLoad,num(set.load));
      old.oneRM=Math.max(old.oneRM,estimatedOneRM(set.load,set.reps)||0);
      old.last=Math.max(old.last,s.finishedAt);old.days.add(s.id);
      byExercise.set(set.exerciseId,old);
    }
  }
  for(const value of byExercise.values()){value.sessions=value.days.size;delete value.days;}
  const completedDays=new Set(completed.map(s=>dateKey(s.finishedAt)));
  const today=new Date();today.setHours(0,0,0,0);
  const days=Array.from({length:28},(_,i)=>{
    const d=new Date(today);d.setDate(d.getDate()-27+i);const key=dateKey(d);
    return {date:key,trained:completedDays.has(key)};
  });
  const refs=new Map((state.exercises||[]).map(x=>[x.id,x]));
  const records=[...byExercise.values()].map(x=>({...x,name:refs.get(x.id)?.name||'Exercício removido'})).sort((a,b)=>b.oneRM-a.oneRM||b.volume-a.volume);
  return {sessions:completed.length,volume:totalVolume,sets:totalSets,records,days};
}

const patterns = {
  peito: /peito|peitoral|supino|crucifixo|flex[aã]o|chest/i,
  costas: /costas|dorsal|remada|puxada|barra fixa|back|lat[ií]ssimo/i,
  pernas: /pernas|quadr[ií]ceps|posterior|agachamento|leg press|afundo|gl[uú]teo|panturrilha/i,
  ombros: /ombros|deltoide|eleva[cç][aã]o lateral|desenvolvimento/i,
  biceps: /b[ií]ceps|rosca/i,
  triceps: /tr[ií]ceps|mergulho|triceps/i,
  abdomen: /abd[oô]men|abdominal|core|prancha/i
};
const recipe = {
  ppl: [
    {title:'Empurrar (Push)',day:1,parts:['peito','ombros','triceps'],sets:3,reps:10},
    {title:'Puxar (Pull)',day:3,parts:['costas','biceps'],sets:3,reps:10},
    {title:'Pernas (Legs)',day:5,parts:['pernas','abdomen'],sets:3,reps:10}
  ],
  upperLower: [
    {title:'Superior A',day:1,parts:['peito','costas','ombros','biceps'],sets:3,reps:10},
    {title:'Inferior A',day:2,parts:['pernas','abdomen'],sets:3,reps:10},
    {title:'Superior B',day:4,parts:['costas','peito','triceps','ombros'],sets:3,reps:10},
    {title:'Inferior B',day:5,parts:['pernas','abdomen'],sets:3,reps:10}
  ],
  fullBody: [
    {title:'Corpo inteiro A',day:1,parts:['pernas','peito','costas','abdomen'],sets:3,reps:10},
    {title:'Corpo inteiro B',day:3,parts:['pernas','costas','ombros','triceps'],sets:3,reps:10},
    {title:'Corpo inteiro C',day:5,parts:['pernas','peito','costas','biceps'],sets:3,reps:10}
  ],
  fiveByFive: [
    {title:'Força 5×5 A',day:1,parts:['pernas','peito','costas'],sets:5,reps:5},
    {title:'Força 5×5 B',day:3,parts:['pernas','ombros','costas'],sets:5,reps:5},
    {title:'Força 5×5 C',day:5,parts:['pernas','peito','costas'],sets:5,reps:5}
  ]
};
export const starterPlans = Object.freeze([
  ['ppl','Empurrar / Puxar / Pernas (3 dias)'],
  ['upperLower','Superior / Inferior (4 dias)'],
  ['fullBody','Corpo inteiro (3 dias)'],
  ['fiveByFive','Força 5×5 (3 dias)']
]);
export function createStarterRoutines(s,which,studentId=''){
  const blocks=recipe[which];if(!blocks)throw new Error('Modelo de treino desconhecido.');
  if(studentId && !s.students.some(x=>x.id===studentId&&x.active))throw new Error('Escolha um aluno ativo.');
  const library=(s.exercises||[]).filter(x=>x?.id && x.name && x.muscle);
  if(!library.length)throw new Error('A biblioteca está vazia. Importe exercícios primeiro.');
  const prepared=blocks.map(b=>{
    const chosen=new Set(),items=[];
    for(const part of b.parts){
      const match=library.find(x=>!chosen.has(x.id) && patterns[part].test(x.muscle+' '+x.name));
      if(!match)continue;
      chosen.add(match.id);items.push({exerciseId:match.id,sets:b.sets,reps:b.reps,repsMax:b.reps,rest:b.reps===5?150:90,method:'NORMAL',block:'',notes:'Modelo inicial: ajuste cargas e volume à pessoa.'});
    }
    if(!items.length)throw new Error('Não há exercícios compatíveis com '+b.title+'. Cadastre exercícios para este grupo.');
    return {id:id(),title:b.title,notes:'Modelo de referência para personalizar. Não é prescrição individual.',studentId:studentId||null,day:b.day,archived:false,items};
  });
  if((s.routines||[]).length+prepared.length>20000)throw new Error('Limite de fichas atingido.');
  s.routines.push(...prepared);
  return prepared.map(x=>x.title);
}

const mapMuscle = x => {
  const word=normalize(x);
  if(/chest|pector/.test(word))return 'Peito';
  if(/back|latiss|lats|trapez|traps|rhomboid/.test(word))return 'Costas';
  if(/quad|hamstring|thigh|glute|calf|leg|hip|soleus|adductor|abductor/.test(word))return 'Pernas';
  if(/shoulder|deltoid|delts/.test(word))return 'Ombros';
  if(/biceps|brachialis/.test(word))return 'Bíceps';
  if(/triceps/.test(word))return 'Tríceps';
  if(/abs|waist|core|oblique|serratus/.test(word))return 'Abdômen';
  return 'Outros';
};

export function importOpenGymText(s,rows){
  if(!Array.isArray(rows)||rows.length>10000)throw new Error('Pacote externo inválido ou excedeu o limite.');
  const existingId=new Set(s.exercises.map(x=>x.id));
  const existingName=new Set(s.exercises.map(x=>normalize(x.name)+'|'+normalize(x.muscle)));
  let added=0,ignored=0;
  for(const item of rows){
    if(!item || !/^[a-zA-Z0-9_-]{1,64}$/.test(String(item.id)) || typeof item.name!=='string'){ignored++;continue;}
    const name=item.name.trim().slice(0,120);
    const muscle=mapMuscle(item.target||item.bodyPart||'');
    const key=normalize(name)+'|'+normalize(muscle);
    const uid='og_'+item.id;
    if(name.length<2||existingId.has(uid)||existingName.has(key)){ignored++;continue;}
    const instructions=Array.isArray(item.instructions)?item.instructions.filter(x=>typeof x==='string').join('\n').slice(0,2000):'';
    const equipment=typeof item.equipment==='string'?item.equipment.slice(0,100):'';
    const secondary=(Array.isArray(item.secondaryMuscles)?item.secondaryMuscles:[]).map(mapMuscle).filter(x=>x!=='Outros'&&x!==muscle).slice(0,10);
    s.exercises.push({id:uid,name,muscle,equipment,instructions,secondary:[...new Set(secondary)],favorite:false});
    existingId.add(uid);existingName.add(key);added++;
  }
  if(s.exercises.length>20000)throw new Error('A biblioteca ultrapassaria o limite de exercícios.');
  return {added,ignored};
}

export function exportWorkoutsCSV(s) {
  const records=[['Data','Treino','Aluno','Exercício','Série','Repetições','Carga (kg)','RIR','RPE','Tipo','Volume (kg)']];
  const byId=new Map(s.exercises.map(x=>[x.id,x.name]));
  for(const session of s.sessions.filter(x=>x.finishedAt)){
    for(let i=0;i<session.sets.length;i++){
      const x=session.sets[i];
      records.push([new Date(x.at).toISOString(),session.title,session.studentName||'Treino pessoal',
        session.items.find(item=>item.exerciseId===x.exerciseId)?.name||byId.get(x.exerciseId)||x.exerciseId,
        i+1,x.reps,x.load,x.rir??'',x.rpe??'',x.type||'NORMAL',num(x.reps)*num(x.load)]);
    }
  }
  const cell=value=>{
    let text=String(value ?? '');
    if(/^[\s]*[=+\-@\t\r]/.test(text)&&!/^-\d+(?:[.,]\d+)?$/.test(text))text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  };
  return '\uFEFF'+records.map(line=>line.map(cell).join(';')).join('\r\n');
}

export function renderGymTools(state){
  const data=exerciseInsights(state);
  const trainer=state.profile?.role!=='student';
  const heat=data.days.map(d=>'<span class="og-day '+(d.trained?'og-trained':'')+'" title="'+safe(d.date)+'" aria-label="'+safe(d.date)+(d.trained?', com treino':', sem treino')+'"></span>').join('');
  const highlights=data.records.slice(0,8).map(x=>'<div class="routine-row"><div><strong>'+safe(x.name)+'</strong><small>'+x.sessions+' sessões · '+x.sets+' séries · '+fmt(x.volume)+' kg acumulados</small></div><span class="badge">'+(x.oneRM?fmt(x.oneRM)+' kg (1RM est.)':'sem 1RM')+'</span></div>').join('')||'<p class="note">Registre treinos para calcular seus recordes.</p>';
  const students=[['','Treino pessoal'],...state.students.filter(x=>x.active).map(x=>[x.id,x.name])];
  return '<div class="page-head"><div><h1>Ferramentas de treinamento</h1><p>Recursos adicionais para planejar, avaliar desempenho e exportar seus registros.</p></div></div>'+
    '<div class="metrics"><div class="metric"><div><b>'+data.sessions+'</b><span>Sessões concluídas</span></div></div><div class="metric"><div><b>'+data.sets+'</b><span>Séries efetivas</span></div></div><div class="metric"><div><b>'+fmt(data.volume)+' kg</b><span>Volume registrado</span></div></div></div>'+
    '<div class="dashboard-grid">'+
      '<section class="panel"><h2>Atividade dos últimos 28 dias</h2><div class="og-heat">'+heat+'</div><p class="note">Dias destacados indicam sessões concluídas. Os dados são locais.</p></section>'+
      '<section class="panel"><h2>Recordes por exercício</h2>'+highlights+'<p class="note">Estimativa de 1RM usa séries de até 12 repetições; não representa teste máximo.</p></section>'+
      '<section class="panel"><h2>Calculadora de 1RM</h2><form data-kind="og:one-rm" class="og-tool-form">'+
        '<label>Carga levantada (kg)<input name="load" type="number" min="0.1" max="1000" step="any" required value="60"></label>'+
        '<label>Repetições (1–12)<input name="reps" type="number" min="1" max="12" step="1" required value="8"></label>'+
        '<button class="primary" type="submit">Calcular</button></form></section>'+
      '<section class="panel"><h2>Calculadora de anilhas</h2><form data-kind="og:plates" class="og-tool-form">'+
        '<label>Carga total (kg)<input name="target" type="number" min="0" max="1000" step="any" required value="80"></label>'+
        '<label>Peso da barra (kg)<input name="bar" type="number" min="0" max="100" step="any" required value="20"></label>'+
        '<button class="primary" type="submit">Distribuir anilhas</button></form><p class="note">Sugestão para ambos os lados, com anilhas de 25, 20, 15, 10, 5, 2,5 e 1,25 kg.</p></section>'+
      (trainer?'<section class="panel"><h2>Modelos de treino</h2><p>Cria fichas novas e editáveis. Não substitui fichas ou sessões anteriores.</p><form data-kind="og:starter" class="og-tool-form"><label>Modelo<select name="model">'+starterPlans.map(([k,label])=>'<option value="'+k+'">'+safe(label)+'</option>').join('')+'</select></label><label>Vincular a<select name="studentId">'+students.map(([k,label])=>'<option value="'+safe(k)+'">'+safe(label)+'</option>').join('')+'</select></label><button class="primary" type="submit">Criar fichas</button></form></section>':'')+
      '<section class="panel"><h2>Dados e catálogo</h2><p>Exporte séries registradas em CSV para análise externa.</p>'+
      '<button class="secondary" type="button" data-cmd="og:export-csv">Exportar treinos (CSV)</button>'+
      (trainer?'<p class="note">O catálogo textual do openGym pode ser preparado com o conversor do projeto. Imagens e GIFs licenciados não são incluídos.</p><button class="secondary" type="button" data-cmd="og:import-text">Importar catálogo textual preparado</button>':'')+'</section>'+
    '</div>';
}
