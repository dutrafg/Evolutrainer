// Converte somente dados textuais do openGym para a biblioteca opcional.
// Não copia catalogue/media, GIFs, vídeos, fotos nem links de mídia.
// Uso: node scripts/import-opengym-catalog.mjs /caminho/para/openGym
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const upstream = resolve(process.argv[2] || '../openGym');
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/catalog-open-gym.json');
const equipment = {
  'body weight':'Peso corporal','dumbbell':'Halteres','cable':'Polia','barbell':'Barra',
  'leverage machine':'Máquina articulada','band':'Faixa elástica','kettlebell':'Kettlebell',
  'resistance band':'Faixa de resistência','weighted':'Com carga',
  'suspension trainer':'Treinador de suspensão','smith machine':'Máquina Smith',
  'stability ball':'Bola suíça','medicine ball':'Bola medicinal','ez barbell':'Barra W',
  'roller':'Rolo','sled machine':'Trenó','massage ball':'Bola de massagem',
  'weight plate':'Anilha','rope':'Corda','assisted':'Assistido','landmine':'Landmine',
  'bosu ball':'Bosu','sandbag':'Saco de areia','trap bar':'Barra hexagonal',
  'olympic barbell':'Barra olímpica','stationary bike':'Bicicleta ergométrica',
  'elliptical machine':'Elíptico','wheel roller':'Roda abdominal','macebell':'Macebell',
  'tire':'Pneu','upper body ergometer':'Ergômetro de braços','skierg machine':'SkiErg',
  'hammer':'Martelo','stepmill machine':'Escada ergométrica'
};

const source = await readFile(join(upstream,'frontend/src/lib/exercises-data.js'),'utf8');
const match = source.match(/export const EXDB=JSON\.parse\('((?:\\.|[^'\\])*)'\)/s);
if(!match)throw new Error('Não foi possível localizar a lista EXDB gerada do openGym.');
const exercises = JSON.parse(match[1].replace(/\\'/g,"'"));
const translations = JSON.parse(await readFile(join(upstream,'catalogue/i18n/pt-BR.json'),'utf8'));
if(!Array.isArray(exercises)||exercises.length<1000)throw new Error('Catálogo aberto incompleto.');
const ids=new Set();
const rows=exercises.map(x=>{
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(x.id)||ids.has(x.id))throw new Error('ID ausente ou repetido: '+x.id);
  ids.add(x.id);
  const pt=translations[x.id]||{};
  if(!pt.name)throw new Error('Nome pt-BR não disponível: '+x.id);
  return {
    id:x.id, name:pt.name, bodyPart:x.bp||'', target:x.tg||'',
    equipment:equipment[x.eq]||x.eq||'',
    secondaryMuscles:x.sm||[],
    instructions:Array.isArray(pt.instructions)?pt.instructions:[]
  };
});
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(rows)+'\n');
console.log('Catálogo textual criado: '+rows.length+' exercícios; '+rows.filter(x=>x.instructions.length).length+' com instruções em pt-BR.');
console.log('Arquivo: '+output);
console.log('ATENÇÃO: manter as licenças do openGym/ExerciseDB e NÃO copiar catalogue/media.');
