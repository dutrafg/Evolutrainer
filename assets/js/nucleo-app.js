

/* EvoluTrainer v3.3 PT-BR — SPA estática. Nenhum servidor, API ou framework necessário. */
'use strict';
const DB_NAME = 'ReftLocalDB';
const DB_VERSION = 3;
const STORES = ['exercises','routines','sessions'];
const EXTRA_STORES = ['bodyRecords','userProfile'];
const ACTIVE_KEY = 'evolutrainer_v3_treino_aluno_';
const STUDENT_REGISTRY = 'EvoluTrainerAlunos_v1';
const PERSONAL_STORES = ['routines','sessions','bodyRecords','userProfile'];
const MEDIA_CACHE='evolutrainer-media-persistente-v1';
const OFFLINE_KEY='evolutrainer_offline_status_v3';
const SESSION_LOCK_ID='activeWorkoutLock';
const SETTINGS_KEY='evolutrainer_31_preferences';
const safeMedia = s=>typeof s==='string' && ((/^media\/(?:thumbs|steps)\/[a-zA-Z0-9_\-.]+\.(?:webp|gif|jpg|png)$/.test(s))||(s.length<=7_200_000&&/^data:image\/(?:png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(s)))?s:'';
function mediaURL(path){
 const valid=safeMedia(path);
 if(!valid)return '';
 if(valid.startsWith('data:image/'))return valid;
 return './'+valid;
}
const thumb = (ex,eager=false)=>{
 const image=ex?.image&&safeMedia(ex.image)?mediaURL(ex.image):'';
 if(image)return `<img class="ex-thumb" loading="${eager?'eager':'lazy'}" decoding="async" src="${esc(image)}" alt="${String(ex.image).includes('illustracao_')?'Ilustração muscular não instrutiva':'Miniatura da execução'}: ${esc(ex.name)}" title="${String(ex.image).includes('illustracao_')?'Ilustração muscular — não substitui orientação técnica':'Demonstração do exercício'}">`;
 return `<span class="ex-thumb placeholder" aria-label="Miniatura indisponível para este exercício" title="Sem imagem verificada">🏋️</span>`;
};
function sessionExerciseVisual(ex){
 if(!ex)return null;
 // Primeiro preserva o exercício salvo na sessão ou na biblioteca, sem depender de conexão externa.
 const indexed=exerciseById(ex.exerciseId);
 if(indexed?.image&&mediaURL(indexed.image))return indexed;
 if(ex.image&&mediaURL(ex.image))return ex;
 const clean=name=>norm(name).replace(/\b(com|de|do|da|dos|das|em|no|na|nos|nas)\b/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 const source=clean(ex.name||ex.originalName||'');
 if(!source)return indexed||ex;
 const aliasNames={
  'elevacao lateral halter pe':'Elevação Lateral',
  'elevacao lateral halteres pe':'Elevação Lateral',
  'elevacao lateral ombros halteres':'Elevação Lateral de Ombros (Halteres)',
  'rosca direta barra':'Rosca Bíceps (Barra)',
  'remada baixa':'Remada Baixa Sentada (Polia)',
  'crucifixo fly inclinado polia':'Crucifixo Inclinado na Polia',
  'desenvolvimento maquina':'Desenvolvimento Militar na Máquina',
  'puxada polia barra frente aberta':'Puxada Alta com Pegada Aberta',
  'puxada polia triangulo':'Puxada Alta com Triângulo',
  'rosca martelo simultanea halter':'Rosca Martelo',
  'crucifixo inverso cabo alto':'Crucifixo Inverso na Polia',
  'cross over':'Crossover na Polia',
  'panturrilha leg press':'Panturrilha no Leg Press',
  'hack v squat':'Agachamento Hack',
  'triceps polia barra reta':'Tríceps na Polia Alta',
  'triceps coice unilateral cross':'Tríceps Unilateral na Polia',
  'supino inclinado smith':'Supino Inclinado (Smith)',
  'elevação frontal alternada':'Elevação Frontal (Halteres)',
  'elevacao frontal alternada':'Elevação Frontal (Halteres)',
  'rosca inversa':'Rosca Inversa (Barra)',
  'stiff barra':'Levantamento Terra com Pernas Estendidas (Stiff)'
 };
 const explicit=aliasNames[source];
 const matches=state.exercises.filter(item=>(clean(item.name)===source)||(explicit&&norm(item.name)===norm(explicit)));
 const valid=matches.filter(item=>item.image&&mediaURL(item.image));
 return valid.find(item=>!String(item.image).includes('illustracao_'))||valid[0]||indexed||ex;
}

const $ = sel => document.querySelector(sel);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uid = prefix => prefix + '_' + (globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`);
const num = (value, fallback=0) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
const fmtDate = iso => {const d = new Date(iso);return Number.isNaN(+d) ? 'Data inválida' : d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});};
const fmtDuration = s => `${Math.floor(s/3600).toString().padStart(2,'0')}:${Math.floor(s%3600/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
const state = {db:null,registry:null,studentDb:null,student:null,students:[],clientSearch:'',clientStatus:'all',preferredClientId:null,clientSwitching:false,clientCalendarMonth:(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})(),clientCalendarSelectedDate:'',swapIndex:-1,deletingClient:false,pendingDeleteId:null,deletedClientIds:new Set(),folder:null,folderReady:false,folderLabel:'',writeQueue:Promise.resolve(),exercises:[],routines:[],sessions:[],tab:'workouts',organizingRoutines:false,limit:60,draft:null,pickerTerm:'',pickerFilter:'',pendingExercise:null,active:null,toastTimer:null,ticker:null,sessionLock:null,finishing:false,lockWriteQueue:Promise.resolve(),catalogSyncQueue:Promise.resolve(),restChimeContext:null};
const EXERCISE_SEED_VERSION='ptbr-20261012-v58';
let exerciseCatalogSyncPromise=null;
function getExerciseSeedVersion(){try{return localStorage.getItem('et.exerciseSeedVersion')||'';}catch{return '';}}
function setExerciseSeedVersion(version){try{localStorage.setItem('et.exerciseSeedVersion',version);}catch{}}
async function syncExerciseCatalog(options={}){
 const {initial=false,showNotice=false}=options||{};
 if(exerciseCatalogSyncPromise)return exerciseCatalogSyncPromise;
 const gateStatus=document.getElementById('et-role-status');
 if(initial&&gateStatus)gateStatus.textContent='Preparando biblioteca de exercícios no navegador. Você já pode acessar a interface.';
 exerciseCatalogSyncPromise=(async()=>{
  try{
   const updated=await seedExercises();
   await refresh();
   renderFilters();
   renderStudentControls();
   if(typeof render==='function')render();
   if(showNotice)notify(`Biblioteca pronta: ${state.exercises.length} exercícios no navegador.`);
   return updated;
  }catch(err){
   console.error('Não foi possível sincronizar o catálogo',err);
   if(showNotice)notify('Catálogo integrado indisponível; confira o arquivo data/exercises.json.');
   throw err;
  }finally{
   exerciseCatalogSyncPromise=null;
   if(gateStatus&&initial&&gateStatus.textContent.includes('Preparando biblioteca'))gateStatus.textContent='Selecione Aluno ou Personal.';
  }
 })();
 return exerciseCatalogSyncPromise;
}

const notify = message => {const t=$('#toast');t.textContent=message;t.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>t.hidden=true,3600);};
function makeDB(){return new Promise((resolve,reject)=>{if(!('indexedDB' in globalThis)){reject(Error('IndexedDB indisponível'));return;}
 const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;for(const name of [...STORES,...EXTRA_STORES])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Feche outras abas deste aplicativo e atualize a página.'));});}
// Identificadores de aluno são imutáveis; somente exercícios pertencem ao banco global.
const personalStore = store => PERSONAL_STORES.includes(store);
function requiredDB(store){if(!personalStore(store))return state.db;if(!state.studentDb||!state.student)throw Error('Selecione um cliente antes de utilizar seus dados.');return state.studentDb;}
function getAllDB(db,store){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function allFrom(store){return getAllDB(requiredDB(store),store);}
function getFrom(store,id){return new Promise((resolve,reject)=>{const req=requiredDB(store).transaction(store,'readonly').objectStore(store).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function transact(groups,mode,callback){return new Promise((resolve,reject)=>{const names=Array.isArray(groups)?groups:[groups],personal=names.some(personalStore);
 if(personal&&names.some(x=>!personalStore(x))){reject(Error('Dados de alunos e catálogo não podem ser alterados na mesma transação.'));return;}
 if(personal&&(!state.student||!state.folderReady)){reject(Error('É obrigatório selecionar uma pasta gravável e um aluno para salvar os dados.'));return;}
 const database=personal?state.studentDb:state.db;
 let tx;try{tx=database.transaction(names,mode);callback(tx);}catch(err){reject(err);return;}
 tx.oncomplete=()=>{if(personal&&mode==='readwrite'&&state.folder){
   const selected=state.student,root=state.folder,db=database;
   const job=state.writeQueue.catch(()=>{}).then(()=>mirrorStudent(root,selected,db,names));state.writeQueue=job;
   job.then(resolve,err=>{state.folderReady=false;renderStudentControls();reject(Error('Registro salvo no navegador, mas não na pasta: '+err.message+'. Reconecte a pasta para sincronizar.'));});
  }else if(!personal&&mode==='readwrite'&&names.includes('exercises')&&state.folderReady){queueMirrorCatalog().then(resolve,reject);}else resolve();};
 tx.onerror=()=>reject(tx.error||Error('Falha ao gravar'));tx.onabort=()=>reject(tx.error||Error('Transação cancelada'));
 });}
const put=(store,data)=>transact([store],'readwrite',tx=>tx.objectStore(store).put(data));
const remove=(store,id)=>transact([store],'readwrite',tx=>tx.objectStore(store).delete(id));

function openIDB(name,version,stores){return new Promise((resolve,reject)=>{const req=indexedDB.open(name,version);req.onupgradeneeded=()=>{for(const k of stores)if(!req.result.objectStoreNames.contains(k))req.result.createObjectStore(k,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Feche outras abas do EvoluTrainer para atualizar o armazenamento.'));});}
function registryPut(store,value){return new Promise((resolve,reject)=>{const tx=state.registry.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function registryGet(store,id){return new Promise((resolve,reject)=>{const req=state.registry.transaction(store,'readonly').objectStore(store).get(id);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
function registryDelete(store,id){return new Promise((resolve,reject)=>{const tx=state.registry.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function safeSlug(name){return norm(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'cliente';}
function studentFolderName(person){return person.folderName||safeSlug(person.name)+'--'+person.id.replace(/[^a-z0-9_-]/gi,'').slice(-16);}
async function studentFolder(root,person,create=true){const base=await root.getDirectoryHandle(person.baseDir||'alunos',{create});return base.getDirectoryHandle(studentFolderName(person),{create});}
async function writeDiskJSON(dir,name,data){const h=await dir.getFileHandle(name,{create:true}),w=await h.createWritable();try{await w.write(JSON.stringify(data,null,2));}finally{await w.close();}}
async function readDiskJSON(dir,name){try{const file=await(await dir.getFileHandle(name)).getFile();return JSON.parse(await file.text());}catch(err){if(err.name==='NotFoundError')return null;throw err;}}
const diskFiles={routines:'rotinas.json',sessions:'sessoes.json',bodyRecords:'evolucao.json',userProfile:'perfil.json'};
async function mirrorStudent(root,person,db,names=PERSONAL_STORES){if(!root||!person)throw Error('Pasta-base indisponível');const dir=await studentFolder(root,person,true);
 await writeDiskJSON(dir,person.baseDir==='clientes'?'cliente.json':'aluno.json',{schemaVersion:2,id:person.id,nome:person.name,email:person.email||'',telefone:person.phone||'',sexo:person.sex||'',dataNascimento:person.birthDate||'',ativo:person.active!==false,simulado:!!person.demo,criadoEm:person.createdAt});
 for(const store of new Set(names)){if(diskFiles[store])await writeDiskJSON(dir,diskFiles[store],await getAllDB(db,store));}}
async function mirrorCatalog(){
 if(!state.folderReady||!state.folder)return;
 const base=await state.folder.getDirectoryHandle('biblioteca',{create:true});
 const entries=await getAllDB(state.db,'exercises');
 await writeDiskJSON(base,'exercicios.json',{schemaVersion:1,origem:'EvoluTrainer HTML integrado',atualizadoEm:new Date().toISOString(),total:entries.length,exercicios:entries});
}
function queueMirrorCatalog(){
 if(!state.folderReady||!state.folder)return Promise.resolve();
 const task=state.catalogSyncQueue.catch(()=>{}).then(()=>mirrorCatalog());
 state.catalogSyncQueue=task;return task;
}
async function writeRoster(){if(!state.folderReady||!state.folder)return;
 // Preserve the original 'alunos/indice.json' for backwards compatibility.
 for(const path of ['alunos','clientes']){
  const base=await state.folder.getDirectoryHandle(path,{create:true});
  const clients=state.students.filter(p=>(p.baseDir||'alunos')===path);
  await writeDiskJSON(base,'indice.json',{schemaVersion:2,clientes:clients,alunos:clients});
 }
}
async function hydrateFromFolder(root,student,db){
 const dir=await studentFolder(root,student,false).catch(e=>e.name==='NotFoundError'?null:Promise.reject(e));
 if(!dir)return false;
 const files={};let found=false;
 for(const [store,file] of Object.entries(diskFiles)){
  const rows=await readDiskJSON(dir,file);
  if(rows===null)continue;
  if(!Array.isArray(rows))throw Error('Arquivo inválido: '+file);
  files[store]=rows;found=true;
 }
 if(!found)return false;
 // A pasta pode estar desatualizada quando a permissão é revogada temporariamente.
 // Nunca substituir o IndexedDB completo por esse espelho antigo.
 const merged={};let needsSync=false;
 for(const [store,fromDisk] of Object.entries(files)){
  const local=await getAllDB(db,store);
  const byId=new Map(local.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
  for(const row of fromDisk){
   if(!row||typeof row.id!=='string')continue;
   const saved=byId.get(row.id);
   if(!saved){byId.set(row.id,row);continue;}
   const stamp=x=>Date.parse(x?.updatedAt||x?.endedAt||x?.importedAt||x?.createdAt||x?.date||'')||0;
   // Empates favorecem a versão local, porque a pasta é apenas um espelho.
   if(stamp(row)>stamp(saved))byId.set(row.id,row);
  }
  merged[store]=[...byId.values()];
  if(merged[store].length!==fromDisk.length||merged[store].some(row=>!fromDisk.some(d=>d?.id===row.id)))needsSync=true;
 }
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(Object.keys(merged),'readwrite');
  for(const [store,rows]of Object.entries(merged))for(const row of rows)tx.objectStore(store).put(row);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
 if(needsSync){
  // Salva de volta o conteúdo mesclado, para uma próxima abertura não encontrar um arquivo antigo.
  // O IndexedDB é a fonte de verdade para importações mais recentes.
  await mirrorStudent(root,student,db,Object.keys(merged));
 }
 return true;
}
async function startStudents(){state.registry=await openIDB(STUDENT_REGISTRY,1,['students','config']);state.students=(await getAllDB(state.registry,'students')).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const configItems=await getAllDB(state.registry,'config');state.deletedClientIds=new Set(configItems.filter(x=>typeof x.id==='string'&&x.id.startsWith('clientDeleted:')).map(x=>x.id.slice('clientDeleted:'.length)));state.students=state.students.filter(x=>!state.deletedClientIds.has(x.id));state.preferredClientId=configItems.find(x=>x.id==='selectedClient')?.clientId||null;state.sessionLock=configItems.find(x=>x.id===SESSION_LOCK_ID)||null;if(state.sessionLock?.clientId)state.preferredClientId=state.sessionLock.clientId;
 if(!state.sessionLock){
 for(const person of state.students){try{const old=localStorage.getItem(ACTIVE_KEY+person.id);if(!old)continue;const snapshot=JSON.parse(old);if(!snapshot?.startedAt||!Array.isArray(snapshot.exercises))continue;
 state.sessionLock={id:SESSION_LOCK_ID,clientId:person.id,sessionId:snapshot.id,clientName:person.name,folderLabel:'',startedAt:snapshot.startedAt,snapshot};
 await registryPut('config',state.sessionLock);state.preferredClientId=person.id;break;
 }catch(e){console.warn('Falha ao recuperar uma sessão antiga',e);}}
 }const info=configItems.find(x=>x.id==='folder');if(info?.handle){state.folder=info.handle;state.folderLabel=info.label||info.handle.name||'';try{state.folderReady=(await state.folder.queryPermission({mode:'readwrite'}))==='granted';}catch{state.folderReady=false;}}if(!state.folderReady){state.folder=null;state.folderReady=true;state.folderLabel='Navegador (IndexedDB)';}
}
async function chooseStudentFolder(){const pendingLock=await getSessionLock();if(pendingLock?.clientId&&state.folderReady){notify('Finalize e salve a sessão em andamento antes de trocar a pasta do banco.');return;}if(!window.showDirectoryPicker){notify('Seu navegador armazena os dados localmente no IndexedDB. Para backup, use Configurações.');return;}
 let root;try{root=await window.showDirectoryPicker({id:'evolutrainer-banco-clientes',mode:'readwrite'});}catch(err){if(err.name!=='AbortError')notify('Erro ao selecionar pasta: '+err.message);return;}
 try{
 const found=[];let hasIndex=false;
 for(const folder of ['alunos','clientes']){
  let base;try{base=await root.getDirectoryHandle(folder,{create:false});}catch(err){if(err.name!=='NotFoundError')throw err;continue;}
  const index=await readDiskJSON(base,'indice.json');if(!index)continue;
  hasIndex=true;
  const entries=Array.isArray(index.clientes)?index.clientes:Array.isArray(index.alunos)?index.alunos:[];
  for(const item of entries){if(item?.id&&item?.name&&!state.deletedClientIds.has(item.id))found.push({...item,baseDir:item.baseDir||folder});}
 }
 if(!hasIndex&&state.students.length&&!confirm('Esta pasta não contém um cadastro conhecido. Deseja copiar os perfis já registrados neste navegador para ela?'))return;
 for(const person of found){if(!state.students.some(s=>s.id===person.id)){await registryPut('students',person);state.students.push(person);}}
 state.folder=root;state.folderLabel=root.name;state.folderReady=true;
 await registryPut('config',{id:'folder',handle:root,label:root.name});
 for(const person of state.students){const db=await openIDB('EvoluTrainerAluno_'+person.id,1,PERSONAL_STORES);try{const hadFiles=await hydrateFromFolder(root,person,db);if(!hadFiles)await mirrorStudent(root,person,db);}finally{db.close();}}
 await writeRoster();await mirrorCatalog();state.students.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 renderStudentControls();notify('Pasta conectada. Cada cliente tem seus dados isolados.');
 if(state.student&&state.students.some(x=>x.id===state.student.id))await switchStudent(state.student.id);else if(state.preferredClientId&&state.students.some(x=>x.id===state.preferredClientId))await switchStudent(state.preferredClientId);else {renderActiveClientBar();notify('Pasta conectada. Escolha o cliente para iniciar o atendimento.');}
 }catch(err){console.error(err);state.folderReady=false;renderStudentControls();notify('Falha ao preparar a pasta: '+err.message);}
}
function validateClient(values,editingId=null){
 const name=String(values.name||'').trim().replace(/\s+/g,' '),email=String(values.email||'').trim().toLowerCase();
 const rawPhone=String(values.phone||'').replace(/[^\d]/g,'');const phone=rawPhone.startsWith('55')&&rawPhone.length>=12?rawPhone.slice(2):rawPhone;
 const sex=['M','F','O',''].includes(values.sex||'')?(values.sex||''):'';
 const birthDate=String(values.birthDate||'').trim();
 if(name.length<2||name.length>90)throw Error('Nome obrigatório: de 2 a 90 caracteres.');
 if(state.students.some(s=>s.id!==editingId&&norm(s.name)===norm(name)))throw Error('Já existe um cliente com esse nome.');
 if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160))throw Error('Informe um e-mail válido.');
 if(email&&state.students.some(s=>s.id!==editingId&&s.email&&s.email.toLowerCase()===email))throw Error('Este e-mail já está cadastrado.');
 if(phone&&(phone.length<10||phone.length>11))throw Error('Informe telefone com DDD e, se desejar, código 55.');
 if(birthDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||Number.isNaN(new Date(birthDate+'T12:00:00').getTime())||new Date(birthDate+'T12:00:00').toISOString().slice(0,10)!==birthDate||birthDate>new Date().toISOString().slice(0,10)))throw Error('Data de nascimento inválida.');
 return {name,email,phone,sex,birthDate,active:values.active!==false};
}
async function createStudent(name,demo=false,fields={}){
 if((await getSessionLock())?.clientId)throw Error('Finalize e salve o treino atual antes de começar o atendimento de outro cliente.');
 if(!state.folderReady)throw Error('Escolha primeiro a pasta-base de dados.');
 const data=validateClient({...fields,name});
 const id=uid('cliente'),person={id,...data,demo,createdAt:new Date().toISOString(),baseDir:'clientes'};
 person.folderName=studentFolderName(person);
 const db=await openIDB('EvoluTrainerAluno_'+id,1,PERSONAL_STORES);
 try{
  if(state.folder)await mirrorStudent(state.folder,person,db);await registryPut('students',person);
  state.students.push(person);state.students.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));await writeRoster();
 }finally{db.close();}
 await switchStudent(id);return person;
}
async function editClientProfile(id,data){
 if(!state.folderReady)throw Error('Escolha a pasta de dados.');
 const current=state.students.find(x=>x.id===id);if(!current)throw Error('Cliente não encontrado.');
 const validated=validateClient(data,id);
 const updated={...current,...validated,updatedAt:new Date().toISOString()};
 await registryPut('students',updated);
 state.students=state.students.map(x=>x.id===id?updated:x).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 if(state.student?.id===id)state.student=updated;
 const db=state.student?.id===id&&state.studentDb?state.studentDb:await openIDB('EvoluTrainerAluno_'+id,1,PERSONAL_STORES);
 try{if(state.folder)await mirrorStudent(state.folder,updated,db,['userProfile']);await writeRoster();}finally{if(db!==state.studentDb)db.close();}
 renderStudentControls();updateStats();notify('Ficha do cliente atualizada.');return updated;
}
// Exclusão com confirmação dupla: primeiro uma decisão explícita, depois o nome exato.
// A exclusão opera somente na pasta e na base IndexedDB próprias do identificador escolhido.
function showClientDeletionFirst(id){
 if(!state.folderReady||state.deletingClient){notify('Conecte a pasta do banco antes de excluir clientes.');return;}
 const c=state.students.find(x=>x.id===id);if(!c){notify('Cliente não encontrado.');return;}
 state.pendingDeleteId=id;
 openModal('Excluir cliente — etapa 1 de 2',`<div class="delete-client-confirm">
  <div class="delete-client-alert">⚠️ Exclusão permanente do perfil de <strong>${esc(c.name)}</strong>.</div>
  <p>Serão removidos o cadastro, as rotinas, as sessões, o histórico e os dados de Evolução <strong>deste cliente</strong>, incluindo sua subpasta individual no banco selecionado.</p>
  <p>A biblioteca compartilhada e os outros clientes não serão alterados. Esta operação <strong>não pode ser desfeita</strong>; faça um backup do cliente antes, se precisar manter os registros.</p>
  <div class="delete-client-actions"><button class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn danger" data-action="client-delete-stage2">Entendi. Continuar (1/2)</button></div>
 </div>`);
}
function showClientDeletionSecond(){
 const c=state.students.find(x=>x.id===state.pendingDeleteId);
 if(!c||!state.folderReady){closeModal();notify('Cliente ou pasta não disponível.');return;}
 openModal('Excluir cliente — etapa 2 de 2',`<div class="delete-client-confirm">
  <div class="delete-client-alert">🗑 Confirmação final de exclusão</div>
  <p>Para autorizar a remoção permanente, digite <strong>exatamente</strong> o nome abaixo:</p>
  <div class="delete-client-name">${esc(c.name)}</div>
  <label for="delete-client-typed-name">Nome completo para confirmar</label>
  <input id="delete-client-typed-name" autocomplete="off" spellcheck="false" maxlength="90" placeholder="Digite o nome do cliente" aria-describedby="delete-client-warning">
  <p id="delete-client-warning" class="hint">A digitação precisa corresponder ao nome completo, incluindo acentos. Nenhum dado será excluído antes da confirmação final.</p>
  <div class="delete-client-actions"><button class="btn secondary" data-action="close-modal">Cancelar</button><button class="btn danger" data-action="client-delete-confirm">Excluir permanentemente (2/2)</button></div>
 </div>`);
 requestAnimationFrame(()=>$('#delete-client-typed-name')?.focus());
}
function deleteClientIndexedDB(id){return new Promise((resolve,reject)=>{
 const request=indexedDB.deleteDatabase('EvoluTrainerAluno_'+id);
 let finished=false;
 const timer=setTimeout(()=>{if(!finished){finished=true;reject(Error('Banco bloqueado por outra aba; feche as demais abas e tente novamente.'));}},4500);
 request.onsuccess=()=>{if(!finished){finished=true;clearTimeout(timer);resolve();}};
 request.onerror=()=>{if(!finished){finished=true;clearTimeout(timer);reject(request.error||Error('Erro ao apagar banco local.'));}};
 request.onblocked=()=>{console.warn('Banco do cliente bloqueado por outra aba do aplicativo.');};
 });}
async function deleteClientConfirmed(){
 if((await getSessionLock())?.clientId){notify('Finalize e salve o treino em andamento antes de excluir um cliente.');return;}
 const id=state.pendingDeleteId;
 const c=state.students.find(x=>x.id===id);
 if(!c||!state.folderReady||state.deletingClient){notify('Cliente não disponível para exclusão.');return;}
 if($('#delete-client-typed-name')?.value!==c.name){notify('O nome digitado não corresponde ao cliente. Nenhum dado foi excluído.');return;}
 state.deletingClient=true;
 let tombstoned=false,removedFolder=false;
 const marker='clientDeleted:'+id;
 try{
  // Aguarda qualquer sincronização anterior, para evitar recriar a pasta depois de removê-la.
  await state.writeQueue;
  if(state.folder&&state.folder.queryPermission&&await state.folder.queryPermission({mode:'readwrite'})!=='granted')throw Error('A pasta não possui permissão de gravação. Reconecte-a antes de excluir.');
  if(!['alunos','clientes'].includes(c.baseDir||'alunos'))throw Error('Subpasta de clientes inválida.');
  const folderName=studentFolderName(c);
  if(!/^[\w-]+$/.test(folderName)||folderName==='.'||folderName==='..')throw Error('Identificador da pasta inválido.');
  const base=state.folder?await state.folder.getDirectoryHandle(c.baseDir||'alunos',{create:false}):null;
  let clientDir=null;
  try{if(base)clientDir=await base.getDirectoryHandle(folderName,{create:false});}
  catch(err){if(err.name!=='NotFoundError')throw err;}
  if(clientDir){
   const markerFile=c.baseDir==='clientes'?'cliente.json':'aluno.json';
   const owned=await readDiskJSON(clientDir,markerFile);
   if(!owned||owned.id!==id)throw Error('A pasta não corresponde ao ID do cliente. Exclusão cancelada para proteger outros dados.');
  }
  // Marcador persistente impede recriar um cliente apagado por um índice de pasta desatualizado.
  await registryPut('config',{id:marker,clientId:id,clientName:c.name,deletedAt:new Date().toISOString()});
  state.deletedClientIds.add(id);tombstoned=true;
  if(clientDir){await base.removeEntry(folderName,{recursive:true});removedFolder=true;}
  else removedFolder=true; // Perfil órfão; nenhuma pasta do cliente encontrada neste banco.
 }catch(err){
  if(tombstoned&&!removedFolder){
   try{await registryDelete('config',marker);state.deletedClientIds.delete(id);}catch(cleanupErr){console.error('Falha ao reverter bloqueio de exclusão',cleanupErr);}
  }
  state.deletingClient=false;
  console.error('Exclusão cancelada com dados preservados:',err);
  notify('Cliente não excluído: '+err.message);
  return;
 }
 // A subpasta foi apagada. Conclui a limpeza do cadastro e do IndexedDB sem afetar outros perfis.
 const warnings=[];
 try{await registryDelete('students',id);}catch(err){warnings.push('cadastro local: '+err.message);}
 state.students=state.students.filter(x=>x.id!==id);
 try{localStorage.removeItem(ACTIVE_KEY+id);}catch(err){warnings.push('treino em andamento: '+err.message);}
 if(state.student?.id===id){
  state.studentDb?.close();state.studentDb=null;state.student=null;state.active=null;
  state.routines=[];state.sessions=[];state.draft=null;
  state.preferredClientId=null;
  window.Evolution?.reset?.();
  try{await registryDelete('config','selectedClient');}catch(err){warnings.push('seleção atual: '+err.message);}
 }
 try{await writeRoster();}catch(err){warnings.push('índice da pasta: '+err.message);}
 try{await deleteClientIndexedDB(id);}catch(err){warnings.push('cópia no navegador: '+err.message);}
 closeModal();state.deletingClient=false;
 setTab('workouts');renderStudentControls();renderActiveClientBar();
 if(warnings.length){console.warn('Exclusão com pendências:',warnings);notify('Pasta excluída. Verifique pendências no console e feche outras abas antes de usar novamente.');}
 else notify('Cliente "'+c.name+'" e seus dados individuais foram excluídos.');
}
function clientFormValues(){
 const form=$('#client-form');if(!form)throw Error('Formulário de cliente não encontrado.');
 if(!form.reportValidity())throw Error('Confira os campos obrigatórios.');
 return {name:$('#student-name').value,email:$('#client-email').value,phone:$('#client-phone').value,
 sex:$('#client-sex').value,birthDate:$('#client-birth').value,active:$('#client-active').checked};
}
async function saveClientForm(){const data=clientFormValues(),id=$('#client-edit-id').value;
 if(id){await editClientProfile(id,data);}else{await createStudent(data.name,false,data);}
 closeModal();
}
async function migrateLegacyData(){if(!activeRequired())return;
 const previous=(await getAllDB(state.registry,'config')).find(x=>x.id==='legacyMigration');if(previous){notify('Dados antigos já atribuídos a outro cliente. Consulte o backup original.');return;}
 const data={};for(const k of PERSONAL_STORES)data[k]=await getAllDB(state.db,k);
 const quantity=data.routines.length+data.sessions.length+data.bodyRecords.length+data.userProfile.length;
 if(!quantity){notify('Nenhum registro antigo encontrado para migrar.');return;}
 if(!confirm('O banco antigo contém '+quantity+' registros SEM identificação de aluno. Você confirma que TODOS pertencem a '+state.student.name+'? A versão antiga será preservada, mas os registros copiados somente para este aluno.'))return;
 const studentId=state.student.id;
 await transact(PERSONAL_STORES,'readwrite',tx=>{for(const [key,rows]of Object.entries(data)){const store=tx.objectStore(key);for(const row of rows)store.put(key==='userProfile'?row:{...row,studentId});}});
 await registryPut('config',{id:'legacyMigration',studentId,date:new Date().toISOString(),records:quantity});
 await refresh();renderRoutines();notify('Registros antigos atribuídos a '+state.student.name+'.');
}
async function getSessionLock(){
 if(!state.registry)return state.sessionLock;
 state.sessionLock=await registryGet('config',SESSION_LOCK_ID);return state.sessionLock;
}
async function acquireSessionLock(session){
 const lock={id:SESSION_LOCK_ID,clientId:session.studentId,sessionId:session.id,clientName:state.student.name,folderLabel:state.folderLabel,startedAt:session.startedAt,snapshot:structuredClone(session)};
 await new Promise((resolve,reject)=>{
   const tx=state.registry.transaction('config','readwrite'),os=tx.objectStore('config');let conflict=null;
   const req=os.get(SESSION_LOCK_ID);
   req.onsuccess=()=>{if(req.result){conflict=req.result;tx.abort();return;}os.put(lock);};
   tx.oncomplete=resolve;tx.onabort=()=>reject(Error(conflict?'Sessão em andamento de '+conflict.clientName+'. Finalize e salve antes de iniciar outra.':'Falha ao reservar atendimento.'));tx.onerror=()=>reject(tx.error);
 });state.sessionLock=lock;
}
function syncSessionSnapshot(){
 if(!state.active||!state.registry)return;
 const snapshot=structuredClone(state.active);
 const job=state.lockWriteQueue.catch(()=>{}).then(async()=>{
  const existing=await registryGet('config',SESSION_LOCK_ID);
  if(existing?.sessionId===snapshot.id)await registryPut('config',{...existing,snapshot});
 });state.lockWriteQueue=job;
}
async function releaseSessionLock(sessionId){
 await state.lockWriteQueue.catch(()=>{});
 const lock=await registryGet('config',SESSION_LOCK_ID);
 if(lock?.sessionId===sessionId){await registryDelete('config',SESSION_LOCK_ID);state.sessionLock=null;}
}
function sessionLockWarning(lock){
 const owner=lock?.clientName||state.student?.name||'outro cliente';
 notify('Treino de '+owner+' em andamento. Finalize e salve antes de trocar o atendimento.');
 renderActiveClientBar();
}
async function switchStudent(id){
 if(state.clientSwitching||state.deletingClient)return;
 const lock=await getSessionLock();if(lock?.clientId&&lock.clientId!==id){sessionLockWarning(lock);return;}
 if(!state.folderReady){notify('Conecte a pasta-base para acessar os clientes.');renderStudentControls();return;}
 const person=state.students.find(x=>x.id===id);if(!person){notify('Cliente não encontrado.');return;}
 if(state.student?.id===id){renderActiveClientBar();if(etRole==='student')setTab('workouts');else setTab('clients');return;}
 if(state.active&&state.student){sessionLockWarning(lock||{clientName:state.student.name});return;}
 state.clientSwitching=true;renderActiveClientBar();
 try{
  await state.writeQueue;
  persistActive();
  const db=await openIDB('EvoluTrainerAluno_'+person.id,1,PERSONAL_STORES);
  try{if(state.folder)await hydrateFromFolder(state.folder,person,db);}catch(err){db.close();throw Error('Falha ao ler a pasta do cliente: '+err.message);}
  const previous=state.studentDb;
  state.student=person;state.studentDb=db;state.active=null;state.routines=[];state.sessions=[];state.draft=null;state.organizingRoutines=false;state.clientCalendarSelectedDate='';
  if(previous)previous.close();
  await refresh();restoreActive();syncSessionFocus();
  state.preferredClientId=person.id;
  await registryPut('config',{id:'selectedClient',clientId:person.id});
  renderStudentControls();setTab(etRole==='student'?'workouts':'clients');notify('Cliente selecionado: '+person.name);
 }finally{state.clientSwitching=false;renderActiveClientBar();}
}
function activeWorkoutKey(){return ACTIVE_KEY+(state.student?.id||'nenhum');}
function activeRequired(){if(!state.student||!state.folderReady){notify('Selecione a pasta de dados e o cliente para continuar.');setTab('workouts');return false;}return true;}
function clientAge(dob){if(!dob)return '';const d=new Date(dob+'T12:00:00');if(Number.isNaN(d.getTime()))return '';const t=new Date();let v=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))v--;return v>=0?v+' anos':'';}
function renderClientList(){const p=$('#client-list');if(!p)return;const query=norm(state.clientSearch||'');
 const entries=state.students.filter(c=>(state.clientStatus==='all'||(state.clientStatus==='active'?(c.active!==false):(c.active===false)))&&(!query||norm(c.name).includes(query)||norm(c.email||'').includes(query)||String(c.phone||'').includes(query)));
 p.innerHTML=entries.length?entries.map(c=>`<div class="client-list-item ${state.student?.id===c.id?'selected':''}">
 <div class="client-list-primary">
  <div class="client-avatar">${esc((c.name[0]||'C').toUpperCase())}</div>
  <div class="client-list-info"><strong title="${esc(c.name)}">${esc(c.name)}</strong><small>${esc(c.email||'Sem e-mail')} · <span class="client-status ${c.active===false?'inactive':''}">${c.active===false?'Inativo':'Ativo'}</span>${c.demo?' · Simulado':''}</small></div>
 </div>
 <div class="client-list-actions">
  <button class="btn ${state.student?.id===c.id?'secondary':'primary'} small" data-action="client-open" data-id="${esc(c.id)}" ${!state.folderReady?'disabled':''}>${state.student?.id===c.id?'✓ Em atendimento':'▶ Atender'}</button>
  <button class="btn secondary small" data-action="client-pdf-for" data-id="${esc(c.id)}" ${!state.folderReady?'disabled':''}>📄 PDF do treino</button>
  <button class="btn secondary small" data-action="client-edit" data-id="${esc(c.id)}" ${!state.folderReady?'disabled':''} aria-label="Editar ${esc(c.name)}">Editar</button>
  <button class="btn secondary small" data-action="client-start-for" data-id="${esc(c.id)}" ${!state.folderReady||c.active===false?'disabled':''} title="Selecionar ${esc(c.name)} e iniciar treino presencial">▶ Treinar</button>
  <button class="btn danger small" data-action="client-delete-request" data-id="${esc(c.id)}" ${!state.folderReady?'disabled':''} aria-label="Excluir cliente ${esc(c.name)}">Excluir</button>
 </div>
 </div>`).join(''):empty('Nenhum cliente encontrado.');
}

function et43SessionDay(value){
 if(!value)return '';
 const str=String(value);
 if(/^\d{4}-\d{2}-\d{2}$/.test(str))return str;
 const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function et43MonthSessions(month){
 const byDay=new Map();
 for(const session of state.sessions){
  const key=et43SessionDay(session.date||session.endedAt);
  if(!key||!key.startsWith(month+'-'))continue;
  if(!byDay.has(key))byDay.set(key,[]);
  byDay.get(key).push(session);
 }
 return byDay;
}
function clientCalendarHTML(){
 const m=/^(\d{4})-(\d{2})$/.exec(state.clientCalendarMonth||'');if(!m)return '';
 const year=Number(m[1]),month=Number(m[2]);if(!Number.isInteger(year)||month<1||month>12)return '';
 const monthKey=state.clientCalendarMonth;
 const first=new Date(year,month-1,1),offset=(first.getDay()+6)%7,days=new Date(year,month,0).getDate();
 const sessions=et43MonthSessions(monthKey);
 const now=new Date();const todayKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 let selected=state.clientCalendarSelectedDate;
 if(!selected||!selected.startsWith(monthKey+'-')||Number(selected.slice(-2))>days){
  selected=(todayKey.startsWith(monthKey+'-')?todayKey:[...sessions.keys()].sort().at(-1))||`${monthKey}-01`;
  state.clientCalendarSelectedDate=selected;
 }
 const allSessions=[...sessions.values()].flat();
 const totals=allSessions.reduce((sum,x)=>{
  const n=Number(x.totalVolumeKg);
  return sum+(Number.isFinite(n)&&n>=0?n:0);
 },0);
 const hasVolume=allSessions.some(s=>Number.isFinite(Number(s.totalVolumeKg))&&s.totalVolumeKg!==null&&s.totalVolumeKg!==undefined);
 const monthName=first.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,x=>x.toLocaleUpperCase('pt-BR'));
 const dateLabel=new Date(Number(selected.slice(0,4)),Number(selected.slice(5,7))-1,Number(selected.slice(8))).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
 const selectedRows=sessions.get(selected)||[];
 const format=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:1});
 const rows=selectedRows.length?selectedRows.map((session,i)=>{
  const sets=Number(session.totalSets);
  const weight=Number(session.totalVolumeKg);
  const setLabel=session.totalSets!=null&&Number.isFinite(sets)&&sets>=0?format(sets)+' séries':'Séries não informadas';
  const volLabel=session.totalVolumeKg!=null&&Number.isFinite(weight)&&weight>=0?format(weight)+' kg movimentados':'Volume não informado';
  return `<article class="et43-session-item"><div class="et43-session-index" aria-hidden="true">${i+1}</div><div><strong>${esc(session.routineName||'Treino concluído')}</strong><span>${esc(setLabel)} · ${esc(volLabel)}</span>${session.notes?`<p>${esc(session.notes)}</p>`:''}</div><span class="et43-session-check" aria-label="Sessão registrada">✓</span></article>`;
 }).join(''):`<div class="et43-no-session"><div class="et43-no-session-icon" aria-hidden="true">○</div><strong>Nenhum treino registrado</strong><p>Não há sessão salva nesta data. Isso não significa falta.</p></div>`;
 const weekdays=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
 const cells=Array.from({length:offset},()=>'<span class="et43-calendar-gap" aria-hidden="true"></span>');
 for(let day=1;day<=days;day++){
  const key=`${monthKey}-${String(day).padStart(2,'0')}`;
  const count=sessions.get(key)?.length||0;
  const selectedClass=key===selected?' is-selected':'';
  const trainedClass=count?' is-trained':'';
  const todayClass=key===todayKey?' is-today':'';
  cells.push(`<button type="button" class="et43-cal-day${selectedClass}${trainedClass}${todayClass}" data-action="client-calendar-day" data-date="${key}" aria-pressed="${key===selected}" aria-label="${day} de ${esc(monthName)}: ${count?`${count} ${count===1?'treino registrado':'treinos registrados'}`:'sem treino registrado'}${key===todayKey?', hoje':''}"><span class="et43-day-num">${day}</span><span class="et43-day-mark" aria-hidden="true">${count?'●':''}</span></button>`);
 }
 const showToday=monthKey===todayKey.slice(0,7);
 return `<section class="client-calendar-wrap et43-calendar" aria-label="Calendário de treinos de ${esc(state.student?.name||'cliente')}">
  <div class="et43-calendar-head">
   <div class="et43-calendar-heading"><span class="et43-eyebrow">ATIVIDADE DO CLIENTE</span><h2>Calendário de treinos</h2><p>Treinos concluídos e salvos no histórico individual.</p></div>
   <div class="et43-calendar-controls" aria-label="Navegação mensal"><button type="button" data-action="client-calendar-prev" aria-label="Mês anterior"><span aria-hidden="true">‹</span></button><strong>${esc(monthName)}</strong><button type="button" data-action="client-calendar-next" aria-label="Próximo mês"><span aria-hidden="true">›</span></button>${!showToday?'<button type="button" data-action="client-calendar-today" class="et43-today-jump">Hoje</button>':''}</div>
  </div>
  <div class="et43-calendar-metrics"><div class="et43-metric"><span>Sessões no mês</span><strong>${allSessions.length}</strong></div><div class="et43-metric"><span>Dias com treino</span><strong>${sessions.size}</strong></div><div class="et43-metric"><span>Volume registrado</span><strong>${hasVolume?format(totals)+' kg':'—'}</strong></div></div>
  <div class="et43-calendar-layout">
   <div class="et43-calendar-main"><div class="et43-weekdays">${weekdays.map(w=>`<span>${w}</span>`).join('')}</div><div class="et43-calendar-grid">${cells.join('')}</div><div class="et43-calendar-legend"><span><i class="et43-legend-dot trained"></i> Com treino</span><span><i class="et43-legend-dot current"></i> Hoje</span><span><i class="et43-legend-dot blank"></i> Sem registro</span></div></div>
   <aside class="et43-calendar-detail" aria-live="polite"><span class="et43-detail-eyebrow">DIA SELECIONADO</span><h3>${esc(dateLabel.replace(/^./,x=>x.toLocaleUpperCase('pt-BR')))}</h3><div class="et43-detail-count">${selectedRows.length===1?'1 sessão salva':selectedRows.length+' sessões salvas'}</div><div class="et43-session-list">${rows}</div></aside>
  </div>
  <p class="et43-calendar-privacy">Os dados apresentados pertencem exclusivamente a ${esc(state.student?.name||'este cliente')}. Dias sem registro não são classificados como faltas.</p>
 </section>`;
}
function renderWorkoutCalendar(){
 const pane=document.getElementById('workout-calendar');if(!pane)return;
 if(!state.student||!state.folderReady||state.active){pane.hidden=true;pane.innerHTML='';return;}
 pane.hidden=false;
 pane.innerHTML=`<div class="et42-calendar-context"><span class="et42-calendar-dot" aria-hidden="true"></span><div><strong>Treinos de ${esc(state.student.name)}</strong><span>Visão individual de atividade e sessões concluídas.</span></div></div>${clientCalendarHTML()}`;
}
function navigateClientCalendar(delta){
 const [year,month]=(state.clientCalendarMonth||'').split('-').map(Number);
 if(!year||month<1||month>12)return;
 const next=new Date(year,month-1+delta,1);
 state.clientCalendarMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
 state.clientCalendarSelectedDate='';renderWorkoutCalendar();
}
function showClientCalendarDay(key){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key||'')||!key.startsWith(state.clientCalendarMonth+'-'))return;
 state.clientCalendarSelectedDate=key;renderWorkoutCalendar();
 document.querySelector(`#workout-calendar [data-date="${key}"]`)?.focus({preventScroll:true});
}
function returnClientCalendarToday(){
 const d=new Date();state.clientCalendarMonth=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
 state.clientCalendarSelectedDate=`${state.clientCalendarMonth}-${String(d.getDate()).padStart(2,'0')}`;
 renderWorkoutCalendar();
}

function activeClientCard(){const c=state.student;if(!c)return `<div class="client-attention-card"><div class="client-attention-kicker">Nenhum cliente selecionado</div><strong>Quem você vai atender?</strong><p class="hint">Clique em <b>Atender</b> na lista ou use o seletor fixo no topo. Só os dados do cliente escolhido serão exibidos.</p></div>`;
return `<div class="client-attention-card" id="client-attention-card" aria-label="Ficha do cliente em atendimento">
<div class="client-attention-kicker">● CLIENTE EM ATENDIMENTO</div><div class="client-attention-identity"><div class="client-avatar large">${esc((c.name[0]||'C').toUpperCase())}</div><div><strong>${esc(c.name)}</strong><span class="small">${c.email?esc(c.email)+' · ':''}${c.phone?'☎ '+esc(c.phone):''}${!c.email&&!c.phone?'Contatos não informados':''}</span></div><span class="client-status ${c.active===false?'inactive':''}">${c.active===false?'Inativo':'Ativo'}</span></div>
<div class="client-attention-stats"><span><b>${state.routines.length}</b> treinos</span><span><b>${state.sessions.length}</b> sessões concluídas</span><span>Evolução individual</span></div>
<button class="btn primary block client-start-main" data-action="client-start-training" ${c.active===false?'disabled':''}>${state.active?'▶ Continuar treino presencial':'▶ Iniciar treino presencial'}</button>
<div class="client-quick-actions"><button class="btn secondary small" data-action="portable-export-current">📦 Transferir cliente</button><button class="btn secondary small" data-action="client-workouts">🏋️ Treinos</button><button class="btn secondary small" data-action="client-history">📊 Histórico</button><button class="btn secondary small" data-finance-client="${esc(c.id)}">Cobranças</button><button class="btn secondary small" data-action="client-evolution">📈 Evolução</button><button class="btn secondary small" data-action="client-edit" data-id="${esc(c.id)}">✎ Editar ficha</button><button class="btn ${c.active===false?'primary':'secondary'} small" data-action="client-toggle" data-id="${esc(c.id)}">${c.active===false?'✓ Reativar':'⏸ Desativar'}</button><button class="btn danger small" data-action="client-delete-request" data-id="${esc(c.id)}">🗑 Excluir cliente</button></div>
<div class="presential-banner">Atendimento presencial: registre séries, carga, repetições e observações em nome deste cliente. ${c.active===false?'Reative o cliente para iniciar uma sessão.':'Os outros clientes não têm acesso a este histórico.'}</div></div>`;}

// Atendimento do personal: o treino é iniciado exclusivamente no perfil selecionado.
function openWorkoutPdfDialog(){
 if(!activeRequired())return;
 if(!state.routines.length){notify('Cadastre uma rotina para gerar o PDF do cliente.');return;}
 openModal('Exportar PDF de Treino',`<div class="pdf-export-form">
  <p class="muted">Escolha o que deseja incluir no documento de <strong>${esc(state.student.name)}</strong>.</p>
  <label class="pdf-choice"><input type="radio" name="pdf-scope" value="day" checked><span><strong>Somente um dia</strong><small>Selecione o dia/treino específico</small></span></label>
  <div class="field pdf-day-picker"><label for="pdf-routine">Dia a exportar</label><select id="pdf-routine">${state.routines.map(r=>`<option value="${esc(r.id)}">Dia ${esc(r.schedule||'A')} · ${esc(r.name)}</option>`).join('')}</select></div>
  <label class="pdf-choice"><input type="radio" name="pdf-scope" value="all"><span><strong>Treino completo</strong><small>Todos os dias do cliente selecionado</small></span></label>
  <div class="field"><label for="pdf-display-name">Nome no topo do PDF <span class="muted">(opcional)</span></label><input id="pdf-display-name" maxlength="120" placeholder="${esc(state.student.name)}"></div>
  <label class="pdf-toggle"><span><strong>Ocultar pesos</strong><small>Mostra séries e repetições sem cargas</small></span><input type="checkbox" id="pdf-hide-weights"></label>
  <label class="pdf-toggle"><span><strong>Ocultar séries e repetições</strong><small>Mostra somente os exercícios do treino</small></span><input type="checkbox" id="pdf-hide-sets"></label>
  <div class="inline-notice">O PDF é gerado diretamente e baixado, sem os cabeçalhos/rodapés de impressão do navegador e sem mostrar caminhos file:///.</div>
  <div class="actions"><button class="btn primary block" type="button" data-action="export-workout-pdf">📄 Exportar PDF</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>
 </div>`);
}
function downloadWorkoutPdf(){if(!activeRequired())return;const scope=document.querySelector('[name="pdf-scope"]:checked')?.value||'day';const selected=$('#pdf-routine')?.value;const routines=scope==='all'?state.routines:state.routines.filter(r=>r.id===selected);
 if(!routines.length){notify('Não há rotina selecionada para exportar.');return;}
 try{window.EvoluPDF.workout(state.student,routines,{scope,printName:$('#pdf-display-name').value.trim(),hideWeights:$('#pdf-hide-weights').checked,hideSetsReps:$('#pdf-hide-sets').checked});closeModal();notify('PDF do treino gerado e disponível para download.');}catch(err){console.error(err);notify('Falha ao gerar PDF: '+err.message);}}
function openClientTrainingPicker(){
 if(!activeRequired())return;
 const client=state.student;
 if(client.active===false){notify('Este cliente está inativo. Reative-o na ficha antes de iniciar treino.');return;}
 if(state.active){setTab('workouts');document.getElementById('workout-active')?.scrollIntoView({block:'start',behavior:'smooth'});notify('Sessão de '+client.name+' retomada.');return;}
 const routineList=state.routines.filter(r=>Array.isArray(r.exercises)&&r.exercises.length);
 const content=`<div class="presential-picker"><div class="coach-client"><span class="client-attention-kicker">TREINAMENTO PRESENCIAL · CLIENTE CONFIRMADO</span><strong>${esc(client.name)}</strong><small>Todo registro desta sessão será salvo apenas no perfil selecionado.</small></div>
 ${routineList.length?routineList.map(r=>`<div class="presential-routine"><div class="coach-routine-head"><div><strong>${esc(r.name)}</strong><small>Dia ${esc(r.schedule||'A')} · ${r.exercises.length} exercício(s)</small></div><div class="coach-routine-exercises">${r.exercises.slice(0,3).map(re=>thumb(exerciseById(re.exerciseId)||{name:re.name})).join('')}</div></div><button class="btn primary block" data-action="client-start-routine" data-id="${esc(r.id)}">▶ Iniciar este treino</button></div>`).join(''):`<div class="inline-notice">Este cliente ainda não possui rotina com exercícios. Crie um treino para iniciar o atendimento.</div>`}
 <div class="actions"><button class="btn ${routineList.length?'secondary':'primary'}" data-action="client-new-routine">+ Criar treino para ${esc(client.name)}</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div></div>`;
 openModal('Escolher treino presencial',content);
}
function lastClientPerformance(exerciseId){
 for(const session of state.sessions){
  if(session.studentId&&session.studentId!==state.student?.id)continue;
  const ex=Array.isArray(session.exercises)?session.exercises.find(e=>e.exerciseId===exerciseId&&e.sets?.some(s=>s.done)):null;
  if(!ex)continue;
  const completed=ex.sets.filter(s=>s.done);const last=completed.at(-1);
  if(last)return {date:session.date||session.endedAt,sets:completed.length,weightKg:num(last.weightKg),reps:num(last.reps)};
 }
 return null;
}

function exerciseLoadChart(ex){
 const records=state.sessions.slice().reverse().map(s=>{
  const e=(s.exercises||[]).find(x=>x.exerciseId===ex.exerciseId);if(!e)return null;
  const loads=(e.sets||[]).filter(x=>x.done&&Number(x.weightKg)>0).map(x=>Number(x.weightKg));
  return loads.length?{date:s.date||s.endedAt||'',weight:Math.max(...loads),current:false}:null;
 }).filter(Boolean).slice(-5);
 const loads=ex.sets.filter(x=>x.done&&Number(x.weightKg)>0).map(x=>Number(x.weightKg));
 const current=loads.length?{date:new Date().toISOString(),weight:Math.max(...loads),current:true}:null;
 const points=[...records,...(current?[current]:[])];const weights=points.map(p=>p.weight);
 const recent=records.at(-1);const delta=current&&recent?current.weight-recent.weight:null;
 const badge=current?`${current.weight.toLocaleString('pt-BR')} kg${delta===null?'':` · ${delta>=0?'+':''}${delta.toLocaleString('pt-BR')} kg vs. última sessão`}`:recent?`${recent.weight.toLocaleString('pt-BR')} kg (última sessão)`:'Sem registro de carga';
 if(points.length<2)return `<section class="coach-load-panel"><div class="coach-load-head"><strong>📈 Progresso de carga</strong><span>${esc(badge)}</span></div><p class="coach-load-meta">Últimas 5 sessões + execução atual. ${points.length?'Registre mais uma sessão para gerar o gráfico.':'Registre séries com peso para acompanhar a evolução.'}</p></section>`;
 const low=Math.min(...weights),high=Math.max(...weights),pad=Math.max(1,(high-low)*.16);const floor=Math.max(0,low-pad),ceil=high+pad;
 const x=i=>18+(points.length<=1?0:i*284/(points.length-1));const y=w=>108-(w-floor)/(ceil-floor)*85;
 const historical=points.filter(p=>!p.current);const poly=historical.map((p,i)=>`${x(i)},${y(p.weight)}`).join(' ');
 const trend=historical.length>=2?`<polyline points="${poly}" fill="none" stroke="#32c870" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`:'';
 const lastHis=historical.length-1;const dashed=current&&lastHis>=0?`<line x1="${x(lastHis)}" y1="${y(historical[lastHis].weight)}" x2="${x(points.length-1)}" y2="${y(current.weight)}" stroke="#83e3a3" stroke-dasharray="6 5" stroke-width="2.8"/>`:'';
 const dateLabel=date=>{const d=new Date(date);return Number.isFinite(+d)?`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`:'—'};
 return `<section class="coach-load-panel"><div class="coach-load-head"><strong>📈 Progresso de carga</strong><span>${esc(badge)}</span></div><p class="coach-load-meta">Maior peso de uma série concluída em cada sessão, não volume total.</p><svg class="coach-load-svg" viewBox="0 0 320 139" role="img" aria-label="Gráfico da evolução da carga em quilogramas"><line x1="14" y1="111" x2="306" y2="111" stroke="#354154"/>${trend}${dashed}${points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.weight)}" r="5" fill="${p.current?'#121a26':'#39c875'}" stroke="#65e49b" stroke-width="2.4"><title>${esc(dateLabel(p.date))}: ${esc(p.weight)} kg${p.current?' (em andamento)':''}</title></circle><text x="${x(i)}" y="130" fill="${p.current?'#75dfa1':'#9aacc1'}" text-anchor="middle" font-size="9">${dateLabel(p.date)}</text>`).join('')}</svg><div class="coach-load-caption">Linha contínua: treinos anteriores. Linha pontilhada: sessão em andamento.</div></section>`;
}
function toggleExerciseComplete(index){if(!state.active?.exercises[index])return;readVisibleWorkout();const ex=state.active.exercises[index];if(!ex.completed&&!ex.sets.some(s=>s.done)){notify('Marque ao menos uma série concluída antes de finalizar o exercício.');return;}ex.completed=!ex.completed;persistActive();renderActiveWorkout();notify(ex.completed?'Exercício concluído.':'Exercício reaberto.');}
function openSwapPicker(index){if(!state.active?.exercises[index])return;readVisibleWorkout();state.swapIndex=index;const ex=state.active.exercises[index];openModal('Trocar exercício',`<p class="muted">Substituir: <strong>${esc(ex.name)}</strong></p><p class="small muted">Caso já existam séries concluídas, elas serão preservadas no histórico desta sessão e o novo exercício será adicionado em seguida.</p><label for="swap-search">Buscar na biblioteca (1.230 exercícios)</label><input id="swap-search" type="search" autocomplete="off" placeholder="Nome, músculo ou equipamento..."><div id="swap-results" class="coach-swap-picker"></div>`);renderSwapResults();document.getElementById('swap-search')?.focus();}
function renderSwapResults(){const el=$('#swap-results');if(!el)return;const term=norm($('#swap-search')?.value||'');const current=state.active?.exercises[state.swapIndex];const rows=state.exercises.filter(x=>x.id!==current?.exerciseId&&(!term||norm([x.name,x.originalName,x.category,x.equipment].join(' ')).includes(term))).slice(0,45);el.innerHTML=rows.length?rows.map(e=>`<button type="button" class="coach-swap-row" data-action="swap-select-exercise" data-id="${esc(e.id)}">${thumb(e)}<span><strong>${esc(e.name)}</strong><small>${esc(e.category||'Outros')} · ${esc(e.equipment||'Sem equipamento')}</small></span></button>`).join(''):empty('Nenhum exercício encontrado.');}
function swapWorkoutExercise(id){const a=state.active,idx=state.swapIndex;const existing=a?.exercises?.[idx],newEx=exerciseById(id);if(!existing||!newEx)return;readVisibleWorkout();const record=lastClientPerformance(id),setCount=Math.max(1,Math.min(25,existing.sets.length||3)),type=newEx.type||'weight_reps';const fresh={exerciseId:newEx.id,name:newEx.name,type,notes:'',restSeconds:existing.restSeconds||90,sets:Array.from({length:setCount},()=>({weightKg:record?.weightKg||0,reps:record?.reps||10,seconds:60,distanceMeters:0,floors:0,steps:0,done:false}))};const done=existing.sets.filter(x=>x.done);
 if(done.length){existing.sets=done;existing.substituted=true;existing.completed=true;a.exercises.splice(idx+1,0,fresh);}else a.exercises.splice(idx,1,fresh);
 state.swapIndex=-1;persistActive();closeModal();renderActiveWorkout();notify(done.length?'Exercício substituído; séries anteriores preservadas.':'Exercício substituído.');}
function setRestManual(){const el=$('#rest-manual-seconds');if(!el||!state.active)return;const raw=el.value.trim();if(!/^\d+$/.test(raw)){notify('Informe um tempo inteiro em segundos (0 a 1800).');return;}const seconds=Number(raw);if(seconds>1800){notify('Tempo máximo: 1.800 segundos (30 minutos).');return;}if(seconds===0)adjustRest(0);else beginRest(seconds);el.value='';notify(seconds?`Descanso definido: ${restClockLabel(seconds*1000)}`:'Descanso encerrado.');}

const DEFAULT_PREFS={theme:'dark',sound:true,vibration:false,dailyBackup:true};
let prefs={...DEFAULT_PREFS};
function loadPrefs(){try{const x=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');prefs={...DEFAULT_PREFS,...x};}catch{prefs={...DEFAULT_PREFS};}applyTheme();renderPreferences();}
function applyTheme(){const value=prefs.theme==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):prefs.theme;document.documentElement.dataset.theme=value;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=value==='light'?'#f8fafc':'#0b0e14';}
function renderPreferences(){const theme=$('#cfg-theme'),sound=$('#cfg-sound'),vib=$('#cfg-vibration'),daily=$('#cfg-daily-backup');if(theme)theme.value=prefs.theme;if(sound)sound.checked=!!prefs.sound;if(vib)vib.checked=!!prefs.vibration;if(daily)daily.checked=prefs.dailyBackup!==false;refreshVibrationSupport();}
function savePreference(key,value){prefs[key]=value;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(prefs));}catch{}applyTheme();renderPreferences();}
function unlockSound(){try{if(!state.restChimeContext){const AC=window.AudioContext||window.webkitAudioContext;if(AC)state.restChimeContext=new AC();}if(state.restChimeContext?.state==='suspended')void state.restChimeContext.resume();}catch(e){console.warn('Áudio indisponível',e);}}
function playGentleChime(force=false){
 if(!prefs.sound&&!force)return;
 try{unlockSound();const ctx=state.restChimeContext;if(!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime+.025;
  for(const [hz,delay] of [[659.25,0],[783.99,.16]]){
   const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=hz;
   gain.gain.setValueAtTime(.0001,t+delay);gain.gain.exponentialRampToValueAtTime(.038,t+delay+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+delay+.53);
   oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(t+delay);oscillator.stop(t+delay+.55);
  }
 }catch(err){console.warn('Som do descanso indisponível',err);}
}
function requestHaptic(force=false){
 if(!force&&!prefs.vibration)return 'disabled';
 if(typeof navigator.vibrate!=='function')return 'unsupported';
 if(document.visibilityState==='hidden')return 'background';
 try{return navigator.vibrate([100,70,130])?'requested':'rejected';}
 catch(err){console.warn('Vibração indisponível',err);return 'error';}
}
function refreshVibrationSupport(){
 const available=typeof navigator.vibrate==='function';
 const checkbox=$('#cfg-vibration'),line=$('#cfg-vibration-support');
 if(checkbox){checkbox.disabled=!available;checkbox.setAttribute('aria-describedby','cfg-vibration-support');}
 if(line){line.dataset.support=available?'yes':'no';line.textContent=available?'Vibração disponível para teste neste navegador. O aparelho pode ignorar solicitações no modo silencioso ou com restrições do sistema.':'Este navegador não oferece vibração por sites. No iPhone/iOS, use o aviso sonoro; em Android, experimente Chrome ou Samsung Internet.';}
}
function testRestNotification(vibrationOnly=false){
 const result=$('#cfg-alert-result');
 if(!vibrationOnly){unlockSound();playGentleChime(true);}
 const status=requestHaptic(true);
 const messages={requested:'Solicitação de vibração aceita pelo navegador. Se não sentiu, verifique as configurações do aparelho e o modo Não Perturbe.',unsupported:'Vibração não suportada neste navegador. O som continua disponível.',background:'O aplicativo precisa estar visível para solicitar vibração.',rejected:'O navegador recusou a vibração. Toque na tela e tente novamente; confirme as permissões e ajustes do dispositivo.',error:'Não foi possível solicitar a vibração.',disabled:'Vibração desativada nas preferências.'};
 const message=(vibrationOnly?'Teste de vibração: ':'Teste do aviso: ')+(messages[status]||'Alerta executado.');
 if(result)result.textContent=message;
 notify(message);
}
function restFinishedAlert(){
 if(prefs.sound)playGentleChime();
 const vib=requestHaptic();
 document.body.classList.add('et41-rest-finished');setTimeout(()=>document.body.classList.remove('et41-rest-finished'),2200);
 notify('Descanso concluído. Próxima série!'+(prefs.vibration&&vib==='unsupported'?' Vibração indisponível neste navegador.':''));
}
function restClockLabel(remaining){const sec=Math.max(0,Math.ceil(remaining/1000));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function beginRest(seconds){if(!state.active)return;const duration=Math.max(0,Math.min(1800,Math.round(num(seconds,0))));if(duration>0){state.active.restAlertIssued=false;state.active.restDurationMs=duration*1000;state.active.restPausedMs=0;state.active.restUntil=Date.now()+duration*1000;persistActive();updateClock();}}
function toggleRestPause(){if(!state.active)return;const a=state.active;if(num(a.restPausedMs)>0){a.restUntil=Date.now()+a.restPausedMs;a.restDurationMs=Math.max(num(a.restDurationMs),a.restPausedMs);a.restPausedMs=0;}else if(num(a.restUntil)>Date.now()){a.restPausedMs=a.restUntil-Date.now();a.restUntil=0;}persistActive();updateClock();}
function updateFloatingRest(){const bar=$('#rest-floating'),a=state.active;if(!bar)return;const paused=Boolean(a&&num(a.restPausedMs)>0);const remaining=paused?num(a.restPausedMs):Math.max(0,num(a?.restUntil)-Date.now());const show=Boolean(a&&state.tab==='workouts'&&(paused||remaining>0));bar.hidden=!show;document.body.classList.toggle('rest-visible',show);if(!show)return;$('#floating-rest-clock').textContent=restClockLabel(remaining);$('#floating-rest-label').textContent=paused?'DESCANSO PAUSADO':'DESCANSO ENTRE SÉRIES';$('#floating-rest-pause').textContent=paused?'▶ Continuar':'⏸ Pausar';const duration=Math.max(num(a.restDurationMs),remaining,1000);$('#floating-rest-progress').style.width=(Math.max(0,Math.min(100,100*remaining/duration)))+'%';}
function adjustRest(seconds){if(!state.active)return;const a=state.active;if(seconds===0){a.restUntil=0;a.restPausedMs=0;a.restDurationMs=0;}else if(num(a.restPausedMs)>0){a.restPausedMs=Math.max(0,a.restPausedMs+seconds*1000);a.restDurationMs=Math.max(num(a.restDurationMs),a.restPausedMs);}else if(num(a.restUntil)>Date.now()){a.restUntil=Math.max(Date.now(),a.restUntil+seconds*1000);a.restDurationMs=Math.max(0,num(a.restDurationMs)+seconds*1000,a.restUntil-Date.now());}else{beginRest(seconds);return;}persistActive();updateClock();}
function refreshWorkoutProgress(){if(!state.active)return;const done=state.active.exercises.reduce((acc,e)=>acc+e.sets.filter(s=>s.done).length,0),total=state.active.exercises.reduce((acc,e)=>acc+e.sets.length,0);const el=$('#workout-progress');if(el)el.textContent=done+' de '+total+' séries concluídas';}
function renderStudentControls(){const pane=$('#student-controls');if(!pane)return;
 const active=state.students.filter(x=>x.active!==false).length;
 pane.innerHTML=`<div class="card student-panel">
 <div class="card-top"><div><div class="card-title">👥 Clientes</div><div class="card-meta">Cadastre e gerencie clientes. Treinos, histórico e evolução são individuais.</div></div><span class="pill">${state.students.length} CLIENTES · ${active} ATIVOS</span></div>
 <div class="student-folder-status ${state.folderReady?'connected':''}">${state.folderReady?'✓ Dados protegidos: '+esc(state.folderLabel):'⚠ Inicialize o armazenamento local para cadastrar clientes'}</div>
 <div class="actions">${state.folderReady?'<button class="btn primary small" data-action="student-new">＋ Novo cliente</button><button class="btn secondary small" data-action="student-samples">Criar 3 amostras</button>':'<span class="small muted">Armazenamento local disponível. Para exportar os arquivos para uma pasta, abra Configurações.</span>'}</div>
 ${state.folderReady?activeClientCard():''}
 ${state.students.length?`<div class="client-toolbar"><input id="client-search" type="search" placeholder="Buscar cliente por nome, e-mail ou telefone" value="${esc(state.clientSearch||'')}" aria-label="Buscar clientes"><select id="client-filter" aria-label="Filtrar clientes"><option value="all" ${state.clientStatus==='all'?'selected':''}>Todos</option><option value="active" ${state.clientStatus==='active'?'selected':''}>Ativos</option><option value="inactive" ${state.clientStatus==='inactive'?'selected':''}>Inativos</option></select></div><div id="client-list" class="client-list"></div>`:'<div class="empty">Cadastre seu primeiro cliente ou crie as três amostras de demonstração.</div>'}

 <p class="hint">Quando uma pasta física estiver conectada: <code>clientes/NOME--ID/</code> com cadastro, rotinas, sessões e evolução separados. Perfis antigos continuam acessíveis em <code>alunos/</code> sem migração destrutiva.</p></div>`;
 renderClientList();renderActiveClientBar();const bt=$('[data-action="new-routine"]');if(bt)bt.disabled=!state.folderReady||!state.student;
}
function openStudentModal(id=null){if(!state.folderReady){notify('Conecte uma pasta primeiro.');return;}
 const client=id?state.students.find(p=>p.id===id):null;if(id&&!client){notify('Cliente não encontrado.');return;}
 const sex=client?.sex||'',birth=client?.birthDate||'';
 openModal(client?'Editar cliente':'Criar cliente',`<form id="client-form" class="client-form">
 <input id="client-edit-id" type="hidden" value="${esc(client?.id||'')}">
 <div class="field"><label for="student-name">Nome <span class="required">*</span></label><input id="student-name" name="name" required minlength="2" maxlength="90" autocomplete="name" placeholder="Nome completo" value="${esc(client?.name||'')}"></div>
 <div class="field"><label for="client-email">E-mail</label><input id="client-email" name="email" type="email" maxlength="160" autocomplete="email" placeholder="nome@exemplo.com" value="${esc(client?.email||'')}"></div>
 <div class="field"><label for="client-phone">Telefone</label><div class="phone-field"><span>🇧🇷 +55</span><input id="client-phone" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" maxlength="20" placeholder="(11) 99999-9999" value="${esc(client?.phone||'')}"></div></div>
 <div class="two-fields"><div class="field"><label for="client-sex">Sexo</label><select id="client-sex"><option value="">Selecione</option><option value="F" ${sex==='F'?'selected':''}>Feminino</option><option value="M" ${sex==='M'?'selected':''}>Masculino</option><option value="O" ${sex==='O'?'selected':''}>Outro / prefiro não informar</option></select></div>
 <div class="field"><label for="client-birth">Data de nascimento</label><input id="client-birth" name="birthDate" type="date" max="${new Date().toISOString().slice(0,10)}" value="${esc(birth)}"></div></div>
 <label class="client-toggle"><input id="client-active" type="checkbox" ${client?.active===false?'':'checked'}> Cliente ativo</label>
 <p class="hint">${client?'As alterações atualizam a ficha sem apagar treinos ou avaliações.':'Será criada uma base de dados exclusiva para o cliente, com pasta individual quando disponível.'} E-mail e telefone são opcionais.</p>
 <div class="actions client-form-footer"><button type="button" class="btn secondary" data-action="close-modal">Cancelar</button><button type="submit" class="btn primary" data-action="student-save">${client?'Salvar alterações':'Criar cliente'}</button></div>
 </form>`);
 requestAnimationFrame(()=>$('#student-name')?.focus());
}
async function createSamples(){if(!state.folderReady)throw Error('Inicialize o armazenamento local antes de gerar exemplos.');
 const exampleNames=['Cliente Exemplo 01 — Ana','Cliente Exemplo 02 — Bruno','Cliente Exemplo 03 — Carla'];const missing=exampleNames.filter(name=>!state.students.some(x=>x.name===name));
 if(!missing.length){notify('As três amostras já existem.');return;}
 if(!confirm('Criar '+missing.length+' perfis SIMULADOS com rotinas, sessões e avaliações distintas, cada um em sua própria pasta?'))return;
 const recipes={
  [exampleNames[0]]:{mass:64,target:61,days:[2,6,10,16],weights:[65.2,64.6,64],ex:'Agachamento',load:30,reps:12,sex:'F'},
  [exampleNames[1]]:{mass:82,target:85,days:[1,4,8,12,19],weights:[80.5,81.1,82],ex:'Supino',load:65,reps:8,sex:'M'},
  [exampleNames[2]]:{mass:70,target:68,days:[3,7,14],weights:[71,70.5,70],ex:'Remada',load:38,reps:10,sex:'F'}
 };
 for(const name of missing){const s=await createStudent(name,true),v=recipes[name],ex=state.exercises.find(x=>norm(x.name).includes(norm(v.ex)))||state.exercises[0];
  const routine={id:uid('routine'),name:'Treino demonstrativo — '+v.ex,schedule:'A',createdAt:new Date().toISOString(),exercises:[{exerciseId:ex.id,name:ex.name,sets:3,reps:v.reps,weightKg:v.load,restSeconds:90}]};
  const dates=v.days.map(day=>new Date(Date.now()-day*86400000).toISOString());const sessions=dates.map(date=>({id:uid('session'),routineName:routine.name,routineId:routine.id,date,startedAt:date,endedAt:date,durationSeconds:2400,totalSets:3,totalVolumeKg:v.load*v.reps*3,simulado:true,exercises:[{exerciseId:ex.id,name:ex.name,type:'weight_reps',sets:Array.from({length:3},()=>({weightKg:v.load,reps:v.reps,done:true}))}]}));
  const body=v.weights.map((weight,i)=>({id:uid('body'),kind:'weight',date:new Date(Date.now()-(25-i*8)*86400000).toISOString().slice(0,10),values:{weight},source:'simulado',createdAt:new Date().toISOString()}));
  const measures={id:uid('body'),kind:'measurements',date:new Date().toISOString().slice(0,10),values:{waist:v.mass*1.1,armRight:31+(v.mass/30),armLeft:30+(v.mass/30)},source:'simulado',createdAt:new Date().toISOString()};
  await transact(PERSONAL_STORES,'readwrite',tx=>{tx.objectStore('routines').put(routine);sessions.forEach(x=>tx.objectStore('sessions').put(x));body.forEach(x=>tx.objectStore('bodyRecords').put(x));tx.objectStore('bodyRecords').put(measures);tx.objectStore('userProfile').put({id:'settings',targetWeight:v.target,startWeight:v.weights[0],heightCm:170,sex:v.sex,age:28});});
 }
 await refresh();renderStudentControls();notify(missing.length+' cliente(s) de demonstração criado(s) com dados separados.');}

function normalizeExercise(x){if(!x||typeof x!=='object'||!x.id||!(x.name||x.nome))return null;return {
 id:String(x.id).slice(0,120),name:String(x.name||x.nome).trim().slice(0,180),category:String(x.category||x.grupo_muscular||'Outros').trim().slice(0,100),
 equipment:String(x.equipment||x.equipamento||'Outros').trim().slice(0,100),type:String(x.type||x.tipo_registro||'weight_reps'),
 secondary:Array.isArray(x.secondary) ? x.secondary.slice(0,20).map(String) : Array.isArray(x.musculos_secundarios) ? x.musculos_secundarios.slice(0,20).map(String) : [],
 originalName:String(x.originalName||x.nome_original||x.name||x.nome||'').trim().slice(0,180),source:String(x.source||x.origem||'custom'),custom:typeof x.custom==='boolean'?x.custom:Boolean(x.personalizado ?? !String(x.id).startsWith('hevy:')),
 instructions:x.instructions||x.instrucoes||null,instructions_en:Array.isArray(x.instructions_en)?x.instructions_en.slice(0,16).map(s=>String(s).slice(0,1200)):[],image:safeMedia(x.image||x.imagem||''),images:Array.isArray(x.images)?x.images.map(safeMedia).filter(Boolean).slice(0,4):[],exerciseKind:String(x.exerciseKind||'Musculação'),level:String(x.level||''),updatedAt:x.updatedAt||new Date().toISOString()
 };}
async function readSeed(){const inline=$('#exercise-seed');if(inline)return JSON.parse(inline.textContent);if(Array.isArray(globalThis.EXERCISE_SEED))return globalThis.EXERCISE_SEED;
 const resp=await fetch('./data/exercises.json?v=ptbr-20261012',{cache:'no-cache'});if(!resp.ok)throw Error('Catálogo de exercícios indisponível');return resp.json();}
async function seedExercises(){
 const existing=await allFrom('exercises');
 const currentVersion=getExerciseSeedVersion();
 if(existing.length&&currentVersion===EXERCISE_SEED_VERSION)return 0;
 const source=await readSeed();if(!Array.isArray(source))throw Error('Formato de catálogo inválido');
 const byId=new Map(existing.map(e=>[e.id,e]));
 const updates=[];
 for(const row of source){const ex=normalizeExercise(row);if(!ex?.name)continue;
  const previous=byId.get(ex.id);
  if(!previous){updates.push(ex);continue;}
  // Atualiza apenas itens do catálogo fornecido; não altera exercícios personalizados,
  // nem rotinas, séries, histórico ou dados digitados pelo usuário.
  if(previous.custom||!['hevy:','free:'].some(p=>String(ex.id).startsWith(p)))continue;
  if(previous.name!==ex.name||previous.originalName!==ex.originalName||previous.image!==ex.image||JSON.stringify(previous.images||[])!==JSON.stringify(ex.images||[])){
   updates.push({...previous,name:ex.name,originalName:ex.originalName,category:ex.category,
    equipment:ex.equipment,secondary:ex.secondary,type:ex.type,image:ex.image,images:ex.images,level:ex.level,instructions_en:ex.instructions_en});
  }
 }
 if(updates.length)await transact(['exercises'],'readwrite',tx=>{
  const store=tx.objectStore('exercises');for(const e of updates)store.put(e);
 });
 setExerciseSeedVersion(EXERCISE_SEED_VERSION);
 return updates.length;
}
async function refresh(){state.exercises=await allFrom('exercises');[state.routines,state.sessions]=state.studentDb?await Promise.all([allFrom('routines'),allFrom('sessions')]):[[],[]];state.exercises.sort((a,b)=>(a.name||'').localeCompare(b.name||'','pt-BR'));state.routines=getOrderedRoutines(state.routines);state.sessions.sort((a,b)=>(b.date||'').localeCompare(a.date||''));if(state.studentDb)await window.Evolution?.reload();else window.Evolution?.reset?.();updateStats();}
function renderActiveClientBar(){
 const bar=$('#active-client-bar'),select=$('#active-client-select'),label=$('#active-client-label'),summary=$('#active-client-summary');
 if(bar)bar.hidden=['settings','finance'].includes(state.tab);
 if(!select)return;
 const selected=state.student;
 select.innerHTML='<option value="">Selecione um cliente...</option>'+state.students.map(c=>`<option value="${esc(c.id)}" ${selected?.id===c.id?'selected':''}>${esc(c.name)}${c.active===false?' (inativo)':''}</option>`).join('');
 select.value=selected?.id||'';
 select.disabled=!state.folderReady||state.clientSwitching||!state.students.length;
 const lockOwner=state.sessionLock?.clientId;for(const opt of select.options)if(opt.value&&lockOwner&&opt.value!==lockOwner)opt.disabled=true;
 if(label)label.textContent=selected?'CLIENTE EM ATENDIMENTO':'SELECIONE O CLIENTE PARA ATENDER';
 if(summary)summary.textContent=!state.folderReady?'Primeiro conecte a pasta-base de dados.':selected?`${selected.name} · ${state.routines.length} treino(s) · ${state.sessions.length} sessão(ões) · registros exclusivos deste cliente`:'Escolha um cliente na lista ou no seletor acima antes de consultar seus dados.';
 const profileBtn=$('#active-client-profile-btn');
 if(profileBtn)profileBtn.disabled=!state.folderReady||!selected;
 const folderBtn=$('#active-client-folder');
 if(folderBtn)folderBtn.hidden=state.folderReady;
}
function updateStats(){const n=state.exercises.length;$('#db-stats').textContent=`${n} exercícios • ${state.routines.length} rotinas • ${state.sessions.length} sessões registradas`;$('#status-text').textContent=state.tab==='library'?`${n} exercícios no catálogo`:state.student?`Cliente: ${state.student.name}`:`${n} exercícios • escolha o cliente`;renderActiveClientBar();updateSettingsStatus();}
// Acesso inicial Aluno / Personal — restrição da interface, não autenticação.
let etRole=null,etRoleStudentId=null,etRoleGateReady=false;
const ET_STUDENT_ACTIONS=new Set(['start','finish-workout','add-set','toggle-ex-complete','swap-exercise','swap-select-exercise','start-ex-rest','rest-add','rest-sub','rest-manual','rest-skip','rest-pause','close-modal','client-calendar-prev','client-calendar-next','client-calendar-day','client-calendar-today']);
function etShowRoleGate(){
 if(state.active){notify('Finalize e salve o treino em andamento antes de sair.');return;}
 etRole=null;etRoleStudentId=null;
 document.body.classList.remove('role-student','role-personal');document.body.classList.add('role-unselected');
 const gate=document.getElementById('et-role-gate');if(gate){gate.hidden=false;gate.inert=false;}
 const personalSwitch=document.getElementById('et-personal-switch');if(personalSwitch)personalSwitch.hidden=true;
 const box=document.getElementById('et-role-student-box');if(box)box.hidden=true;
 const btn=document.getElementById('et-choose-student');if(btn)btn.setAttribute('aria-pressed','false');
 const status=document.getElementById('et-role-status');if(status)status.textContent='Selecione Aluno ou Personal.';
 document.getElementById('et-enter-personal')?.focus();
}
function etPopulateRoleClients(){
 const select=document.getElementById('et-role-client'),submit=document.getElementById('et-enter-student');
 if(!select)return;
 const candidates=state.students.filter(c=>c.active!==false),lock=state.sessionLock?.clientId;
 select.innerHTML='<option value="">Selecione seu nome...</option>'+candidates.map(c=>`<option value="${esc(c.id)}" ${lock&&c.id!==lock?'disabled':''}>${esc(c.name)}</option>`).join('');
 if(lock&&candidates.some(c=>c.id===lock))select.value=lock;
 if(submit)submit.disabled=!select.value||!etRoleGateReady;
 const status=document.getElementById('et-role-status');
 if(status)status.textContent=candidates.length?'Escolha o cliente para entrar nos treinos.':'Nenhum cliente ativo cadastrado. Peça ao personal para criar o cadastro.';
}
function etApplyRole(){
 const gate=document.getElementById('et-role-gate'),banner=document.getElementById('et-student-banner');
 document.body.classList.remove('role-unselected','role-student','role-personal');
 document.body.classList.add(etRole==='student'?'role-student':'role-personal');
 if(gate){gate.hidden=true;gate.inert=true;}
 if(banner)banner.hidden=etRole!=='student';
 const personalSwitch=document.getElementById('et-personal-switch');if(personalSwitch)personalSwitch.hidden=etRole!=='personal';
 const who=document.getElementById('et-student-name');if(who&&etRole==='student')who.textContent=state.student?.name||'Meus treinos';
 if(etRole==='student')state.organizingRoutines=false;
 setTab('workouts');renderRoutines();
 const heading=document.querySelector('#workout-routines .page-head h1');if(heading)heading.textContent=etRole==='student'?'Meus treinos':'Treinos do cliente';
 syncSessionFocus();
}
async function etEnterStudent(){
 if(!etRoleGateReady)return;
 const id=document.getElementById('et-role-client')?.value;
 const person=state.students.find(s=>s.id===id&&s.active!==false);
 if(!person){notify('Selecione um aluno ativo.');return;}
 const lock=await getSessionLock();if(lock?.clientId&&lock.clientId!==id){notify('Há um treino em aberto de outro cliente. Peça ao personal para finalizar e salvar antes de trocar.');return;}
 const button=document.getElementById('et-enter-student');if(button)button.disabled=true;
 try{
  await switchStudent(id);
  if(state.student?.id!==id)throw Error('Não foi possível abrir o perfil selecionado.');
  etRole='student';etRoleStudentId=id;etApplyRole();
 }catch(err){console.error(err);notify('Não foi possível entrar como aluno: '+err.message);}
 finally{if(button)button.disabled=false;}
}
function etSetupRoleGate(){
 const personal=document.getElementById('et-enter-personal'),choose=document.getElementById('et-choose-student');
 const student=document.getElementById('et-enter-student'),select=document.getElementById('et-role-client');
 personal?.addEventListener('click',()=>{if(!etRoleGateReady)return;etRole='personal';etRoleStudentId=null;etApplyRole();});
 choose?.addEventListener('click',()=>{if(!etRoleGateReady)return;const box=document.getElementById('et-role-student-box');if(box)box.hidden=false;choose.setAttribute('aria-pressed','true');etPopulateRoleClients();select?.focus();});
 select?.addEventListener('change',()=>{if(student)student.disabled=!select.value;});
 student?.addEventListener('click',()=>{void etEnterStudent();});
 document.getElementById('et-student-exit')?.addEventListener('click',etShowRoleGate);
 document.getElementById('et-personal-switch')?.addEventListener('click',etShowRoleGate);
}

// A sessão presencial é o único fluxo disponível até confirmação de persistência.
function syncSessionFocus(){
 const on=!!state.active;
 document.body.classList.toggle('session-focus-mode',on);
 const header=document.querySelector('.topbar'),nav=document.querySelector('.bottom-nav');
 if(header)header.inert=on;
 if(nav)nav.inert=on;
 document.querySelectorAll('main>.page').forEach(page=>{if(page.id!=='page-workouts')page.inert=on;});
 for(const id of ['student-controls','workout-routines','workout-calendar','routine-sort-tools']){
  const item=document.getElementById(id);if(item)item.inert=on;
 }
 const active=document.getElementById('workout-active');
 if(active){active.hidden=!on;active.setAttribute('aria-label',on?'Treino presencial em andamento — navegação bloqueada':'Treino presencial');if(on){active.setAttribute('role','dialog');active.setAttribute('aria-modal','true');active.setAttribute('tabindex','-1');}else{active.removeAttribute('role');active.removeAttribute('aria-modal');active.removeAttribute('tabindex');}}
}
function setTab(tab){
 if(etRole==='student'&&tab!=='workouts'){notify('No modo Aluno, somente seus treinos estão disponíveis.');return;}
 if(state.active&&tab!=='workouts'){
  syncSessionFocus();notify('Atendimento em andamento. Conclua e salve a sessão antes de acessar outro módulo.');return;
 }
 if(['history','evolution'].includes(tab)&&!activeRequired())return;
 state.tab=tab;
 document.body.classList.toggle('library-view',tab==='library');
 document.querySelectorAll('.page').forEach(el=>el.classList.toggle('active',el.id==='page-'+tab));
 document.querySelectorAll('[data-tab]').forEach(el=>{el.classList.toggle('active',el.dataset.tab===tab);el.setAttribute('aria-current',el.dataset.tab===tab?'page':'false');});
 syncSessionFocus();
 if(tab==='clients')renderStudentControls();if(tab==='workouts')renderRoutines();if(tab==='library')renderLibrary();if(tab==='history')renderHistory();if(tab==='evolution')window.Evolution?.render();if(tab==='finance')void window.ETFinance?.show();
 updateStats();updateClock();
 if(state.active){const screen=document.getElementById('workout-active');if(screen)screen.scrollTop=0;}
 else window.scrollTo({top:0,behavior:'instant'});
}
function empty(msg){return `<div class="empty">${esc(msg)}</div>`;}
function trainingDay(r){
 // A letra no título é a fonte principal quando a rotina vem de um PDF.
 const title=String(r?.name||'').match(/^\s*(?:Dia|Treino)\s*([A-G])(?:\b|\s|\s*[-—–:])/i);
 const fallback=String(r?.schedule||'').trim().match(/^([A-G])$/i);
 return (title?.[1]||fallback?.[1]||'').toUpperCase();
}
function automaticRoutineCompare(a,b){
 const dayA=trainingDay(a),dayB=trainingDay(b);
 const rank=day=>day?'ABCDEFG'.indexOf(day):100;
 const diff=rank(dayA)-rank(dayB);
 if(diff)return diff;
 const label=String(a.name||'').localeCompare(String(b.name||''),'pt-BR',{numeric:true,sensitivity:'base'});
 return label||String(a.id||'').localeCompare(String(b.id||''));
}
function getOrderedRoutines(source=state.routines){
 const copy=[...source];
 const custom=copy.some(r=>Number.isInteger(r.manualOrder)&&r.manualOrder>=0);
 return copy.sort((a,b)=>{
  if(custom){
   const i=Number.isInteger(a.manualOrder)&&a.manualOrder>=0?a.manualOrder:Number.POSITIVE_INFINITY;
   const j=Number.isInteger(b.manualOrder)&&b.manualOrder>=0?b.manualOrder:Number.POSITIVE_INFINITY;
   if(i!==j)return i-j;
  }
  return automaticRoutineCompare(a,b);
 });
}
async function moveRoutine(id,direction){
 if(!activeRequired()||state.active)return;
 const ordered=getOrderedRoutines();
 const from=ordered.findIndex(r=>r.id===id),to=from+direction;
 if(from<0||to<0||to>=ordered.length)return;
 [ordered[from],ordered[to]]=[ordered[to],ordered[from]];
 // A gravação de toda a ordem é atômica no banco individual do cliente.
 await transact(['routines'],'readwrite',tx=>{
  const store=tx.objectStore('routines');
  ordered.forEach((r,i)=>store.put({...r,manualOrder:i}));
 });
 await refresh();renderRoutines();
 notify('Nova ordem dos treinos salva para '+state.student.name+'.');
}
async function resetRoutineOrder(){
 if(!activeRequired()||state.active)return;
 await transact(['routines'],'readwrite',tx=>{
  const store=tx.objectStore('routines');
  for(const r of state.routines){const copy={...r};delete copy.manualOrder;store.put(copy);}
 });
 state.organizingRoutines=false;
 await refresh();renderRoutines();
 notify('Treinos reorganizados automaticamente do Dia A ao Dia F.');
}
function renderRoutines(){
 renderWorkoutCalendar();
 if(etRole!=='student')renderStudentControls();
 const toolbar=$('#routine-sort-tools');
 if(!state.student||!state.folderReady){
  if(toolbar)toolbar.hidden=true;
  $('#workout-active').hidden=true;$('#workout-routines').hidden=false;
  $('#routines-list').innerHTML=empty('Selecione ou cadastre um cliente no módulo Clientes para acessar os treinos.');
  return;
 }
 $('#workout-active').hidden=!state.active;$('#workout-routines').hidden=!!state.active;
 if(state.active){if(toolbar)toolbar.hidden=true;syncSessionFocus();renderActiveWorkout();return;}
 const ordered=getOrderedRoutines();
 const manual=ordered.some(r=>Number.isInteger(r.manualOrder)&&r.manualOrder>=0);
 if(toolbar){
  toolbar.hidden=ordered.length<2;
  toolbar.innerHTML=`<div class="routine-order-info"><strong>Ordem dos treinos</strong><span>${manual?'Ordem manual salva neste cliente.':'Ordem automática: Dia A → B → C → D → E → F.'}</span></div><div class="routine-order-actions"><button type="button" class="btn ${state.organizingRoutines?'primary':'secondary'} small" data-action="routine-order-toggle" aria-pressed="${state.organizingRoutines}">${state.organizingRoutines?'✓ Concluir organização':'↕ Organizar manualmente'}</button>${manual?'<button type="button" class="btn secondary small" data-action="routine-order-reset">↺ Restaurar ordem A–F</button>':''}</div>`;
 }
 $('#routines-list').innerHTML=ordered.length?ordered.map((r,i)=>{
  const items=Array.isArray(r.exercises)?r.exercises:[];
  const day=trainingDay(r)||String(r.schedule||'—');
  return `<div class="card routine-card" data-routine-card="${esc(r.id)}">
  <div class="card-top"><div><div class="card-title">${esc(r.name)}</div><div class="card-meta">Dia ${esc(day)} · ${items.length} exercício(s)</div></div><span class="pill">DIA ${esc(day)}</span></div>
  ${state.organizingRoutines?`<div class="routine-move-panel"><div class="routine-move-position">${i+1}º de ${ordered.length}</div><div class="routine-move-buttons"><button type="button" class="btn secondary small" data-action="routine-move-up" data-id="${esc(r.id)}" aria-label="Mover ${esc(r.name)} para cima" ${i===0?'disabled':''}>↑ Subir</button><button type="button" class="btn secondary small" data-action="routine-move-down" data-id="${esc(r.id)}" aria-label="Mover ${esc(r.name)} para baixo" ${i===ordered.length-1?'disabled':''}>↓ Descer</button></div></div>`:''}
  ${items.length?`<div class="routine-preview">${items.map((re,idx)=>{const ex=exerciseById(re.exerciseId);return `<div class="routine-preview-row"><span class="seq">${idx+1}</span>${thumb(ex||{name:re.name})}<div class="routine-preview-main"><strong>${esc(ex?.name||re.name||'Exercício')}</strong><div class="routine-prescription">S${num(re.sets,3)} × R${num(re.reps,10)} <span>· ${re.weightKg===null?'—':num(re.weightKg)+' kg'}</span></div></div></div>`;}).join('')}</div>`:''}
  <button class="btn primary block start-training" data-action="start" data-id="${esc(r.id)}" ${items.length?'':'disabled'}>▶ Iniciar este treino</button>
  <div class="actions"><button class="btn secondary small" data-action="edit-routine" data-id="${esc(r.id)}">Editar exercícios</button><button class="btn secondary small" data-action="duplicate-routine" data-id="${esc(r.id)}">Duplicar</button><button class="btn danger small" data-action="delete-routine" data-id="${esc(r.id)}">Excluir</button></div>
  </div>`;
 }).join(''):empty('Nenhuma rotina cadastrada. Crie seu primeiro treino e escolha os exercícios do catálogo.');
}
function renderFilters(){for(const [selector,key] of [['#filter-muscle','category'],['#filter-equipment','equipment']]){const sel=$(selector);const chosen=sel.value;const unique=[...new Set(state.exercises.map(x=>x[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));sel.innerHTML=`<option value="">${key==='category'?'Todos os músculos':'Todos os equipamentos'}</option>`+unique.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');sel.value=unique.includes(chosen)?chosen:'';}}
const ET5_FAVORITES_KEY='et5_library_favorites';
let et5FavoriteIds=new Set();try{et5FavoriteIds=new Set(JSON.parse(localStorage.getItem(ET5_FAVORITES_KEY)||'[]'));}catch{}
function et5FavHas(id){return et5FavoriteIds.has(id);}
function et5ToggleFav(id){if(et5FavoriteIds.has(id))et5FavoriteIds.delete(id);else et5FavoriteIds.add(id);try{localStorage.setItem(ET5_FAVORITES_KEY,JSON.stringify([...et5FavoriteIds]));}catch{}renderLibrary();}
function filteredExercises(){const term=norm($('#search-exercise').value.trim());const category=$('#filter-muscle').value;const equipment=$('#filter-equipment').value;const source=$('#filter-source').value;return state.exercises.filter(ex=>(!term||norm(ex.name).includes(term)||norm(ex.originalName).includes(term)||norm(ex.category).includes(term)||norm(ex.equipment).includes(term)||norm(ex.secondary?.join(' ')).includes(term))&&(!category||ex.category===category)&&(!equipment||ex.equipment===equipment)&&(!source||(source==='favorites'?et5FavHas(ex.id):(source==='custom'?ex.custom:!ex.custom))));}
function renderLibrary(){const data=filteredExercises();$('#library-count').textContent=`${data.length} exercício(s) encontrado(s) · ${state.exercises.length} no banco`;$('#library-list').innerHTML=data.length?data.slice(0,state.limit).map(ex=>`<div class="card library-card"><div class="card-top"><div class="ex-summary">${thumb(ex)}<div><div class="library-title">${esc(ex.name)}</div><div class="card-meta">${esc(ex.category)} · ${esc(ex.equipment)}</div><span class="pill dim">${ex.custom?'Personalizado':'Catálogo'}</span></div></div><button class="btn primary small" data-action="library-add" data-id="${esc(ex.id)}">+ Treino</button></div><div class="actions"><button class="btn secondary small" type="button" data-et5-favorite="${esc(ex.id)}" aria-pressed="${et5FavHas(ex.id)}" aria-label="${et5FavHas(ex.id)?'Remover dos favoritos':'Adicionar aos favoritos'}">${et5FavHas(ex.id)?'★ Favorito':'☆ Favoritar'}</button><button class="btn secondary small" data-action="view-exercise" data-id="${esc(ex.id)}">Detalhes</button>${ex.custom?`<button class="btn danger small" data-action="delete-exercise" data-id="${esc(ex.id)}">Excluir</button>`:''}</div></div>`).join(''):empty('Nenhum exercício corresponde aos filtros.');$('#load-more').hidden=data.length<=state.limit;}
function openModal(title,html){$('#modal-heading').textContent=title;$('#modal-body').innerHTML=html;$('#modal-overlay').hidden=false;document.body.style.overflow='hidden';}
function closeModal(){$('#modal-overlay').hidden=true;$('#modal-body').innerHTML='';document.body.style.overflow='';state.pendingExercise=null;state.draft=null;state.pendingDeleteId=null;state.customExerciseImage=null;}
const MAIN_GROUPS=['Peito','Costas','Pernas','Ombros','Braços','Core','Cardio'];
const SECONDARY_GROUPS=['Costas','Dorsal','Costas superiores','Lombar','Trapézio','Serrátil','Peito','Quadríceps','Glúteos','Posteriores de coxa','Pernas','Panturrilhas','Adutores','Abdutores','Ombros','Deltoide lateral','Bíceps','Tríceps','Antebraços','Core','Abdômen'];
const EX_EQUIPMENT=['Sem equipamento','Halter','Barra','Máquina','Polia','Elástico','Kettlebell','Smith','Banco','Outro'];
const CHIP_HTML=(labels,kind)=>labels.map(n=>`<button type="button" class="ex-chip" data-ex-${kind}="${esc(n)}" aria-pressed="false">${esc(n)}</button>`).join('');
function openNewExercise(){state.customExerciseImage=null;state.customExerciseMain='';state.customExerciseSecondary=new Set();openModal('Criar exercício',`<div class="exercise-create-form">
 <div class="field"><label for="ex-upload">Imagem do exercício <span class="muted">(opcional)</span></label><label class="ex-upload-surface" for="ex-upload"><span id="ex-upload-empty">▧<small>Toque para escolher uma imagem ou GIF</small></span><img id="ex-upload-preview" alt="Prévia da imagem escolhida" hidden></label><input id="ex-upload" type="file" accept="image/gif,image/png,image/jpeg,.gif,.png,.jpg,.jpeg" class="sr-only"><div class="ex-upload-subrow"><span class="hint">GIF, PNG, JPG ou JPEG · máximo de 5 MB · armazenado offline</span><button type="button" class="btn secondary small" data-action="ex-clear-image">Remover imagem</button></div></div>
 <div class="field"><label for="ex-name">Nome do exercício <span class="required">*</span></label><input id="ex-name" maxlength="180" required placeholder="Ex.: Elevação Lateral com Halteres"></div>
 <div class="two-fields"><div class="field"><label for="ex-kind">Tipo de exercício</label><select id="ex-kind"><option value="Musculação">Musculação</option><option value="Cardio">Cardio</option><option value="Mobilidade">Mobilidade / Alongamento</option><option value="Outro">Outro</option></select></div><div class="field"><label for="ex-type">Controle</label><select id="ex-type"><option value="weight_reps">Peso e repetições</option><option value="reps_only">Somente repetições</option><option value="duration">Tempo</option><option value="distance_duration">Distância e tempo</option><option value="bodyweight_weighted">Peso corporal com carga</option></select></div></div>
 <div class="field"><label for="ex-equipment">Equipamento</label><select id="ex-equipment">${EX_EQUIPMENT.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
 <fieldset class="ex-muscle-fieldset"><legend>Grupo muscular principal <span class="required">*</span></legend><div class="ex-chip-list" id="ex-main-chips" role="group" aria-label="Escolha um grupo principal">${CHIP_HTML(MAIN_GROUPS,'primary')}</div><small class="hint">Selecione um grupo principal.</small></fieldset>
 <fieldset class="ex-muscle-fieldset"><legend>Grupos musculares secundários <span class="muted">(opcional)</span></legend><div class="ex-chip-list" id="ex-secondary-chips" role="group" aria-label="Selecione músculos secundários">${CHIP_HTML(SECONDARY_GROUPS,'secondary')}</div></fieldset>
 <div class="actions ex-create-actions"><button type="button" class="btn primary block" data-action="save-exercise">Criar exercício</button><button type="button" class="btn secondary" data-action="close-modal">Cancelar</button></div></div>`);}
async function readExerciseImage(input){const file=input?.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/gif'].includes(file.type)||file.size>5*1024*1024||file.size===0){notify('Imagem inválida. Escolha PNG, JPG ou GIF de até 5 MB.');input.value='';return;}
 const reader=new FileReader();let data;try{data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});}catch(err){notify('Não foi possível ler a imagem.');return;}
 if(!$('#ex-upload'))return;if(!safeMedia(data)){notify('Arquivo de imagem inválido.');return;}state.customExerciseImage=data;$('#ex-upload-preview').src=data;$('#ex-upload-preview').hidden=false;$('#ex-upload-empty').hidden=true;notify('Imagem pronta para ser incluída no exercício.');}
function changeExerciseChip(button){const kind=button.hasAttribute('data-ex-primary')?'primary':'secondary';const value=button.dataset.exPrimary||button.dataset.exSecondary;if(kind==='primary'){state.customExerciseMain=value;document.querySelectorAll('[data-ex-primary]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}else{if(state.customExerciseSecondary.has(value))state.customExerciseSecondary.delete(value);else state.customExerciseSecondary.add(value);button.setAttribute('aria-pressed',String(state.customExerciseSecondary.has(value)));}}
async function saveExercise(){const name=$('#ex-name')?.value.trim();if(!name){notify('Informe o nome do exercício.');$('#ex-name')?.focus();return;}if(!state.customExerciseMain){notify('Selecione um grupo muscular principal.');return;}
 const image=safeMedia(state.customExerciseImage||'');const ex=normalizeExercise({id:uid('custom'),name,category:state.customExerciseMain,equipment:$('#ex-equipment').value,type:$('#ex-type').value,exerciseKind:$('#ex-kind').value,secondary:[...state.customExerciseSecondary],image,images:image?[image]:[],custom:true,source:'local'});if(!ex){notify('Não foi possível validar o exercício.');return;}
 try{await put('exercises',ex);closeModal();await refresh();renderFilters();renderLibrary();notify('Exercício personalizado cadastrado na Biblioteca.');}catch(err){console.error(err);notify('Erro ao salvar exercício: '+err.message);}}
function exerciseById(id){return state.exercises.find(e=>e.id===id);}
function defaultRoutineEx(ex){return {exerciseId:ex.id,name:ex.name,type:ex.type||'weight_reps',sets:3,reps:10,weightKg:0,restSeconds:90};}
function openRoutine(id=null,initialId=null){const old=state.routines.find(r=>r.id===id);state.draft=old?structuredClone(old):{id:uid('routine'),name:'',schedule:'A',exercises:[],createdAt:new Date().toISOString()};if(!Array.isArray(state.draft.exercises))state.draft.exercises=[];if(initialId){const ex=exerciseById(initialId);if(ex)state.draft.exercises.push(defaultRoutineEx(ex));}renderRoutineEditor();}
function syncRoutineForm(){if(!state.draft||!$('#routine-name'))return;state.draft.name=$('#routine-name').value;state.draft.schedule=$('#routine-schedule').value;document.querySelectorAll('[data-routine-idx]').forEach(row=>{const idx=Number(row.dataset.routineIdx);const ex=state.draft.exercises[idx];if(!ex)return;for(const field of ['sets','reps','restSeconds','weightKg']){const inp=row.querySelector(`[data-field="${field}"]`);if(inp)ex[field]=num(inp.value,ex[field]||0);}row.querySelectorAll('[data-routine-target-row]').forEach(target=>{const si=Number(target.dataset.routineTargetRow.split('.')[1]),goal=ex.setTargets?.[si];if(!goal)return;const w=target.querySelector('[data-target-field="weightKg"]'),r=target.querySelector('[data-target-field="reps"]');if(w)goal.weightKg=w.value===''?null:num(w.value,0);if(r)goal.reps=num(r.value,0);});});}
function renderRoutineEditor(){const d=state.draft;if(!d)return;openModal(d.name?'Editar rotina':'Nova rotina',`<div class="field"><label for="routine-name">Nome do treino</label><input id="routine-name" maxlength="120" value="${esc(d.name)}" placeholder="Ex.: Treino A — Superiores"></div><div class="field"><label for="routine-schedule">Dia / Agenda</label><select id="routine-schedule">${'ABCDEFG'.split('').map(ch=>`<option ${ch===d.schedule?'selected':''}>${ch}</option>`).join('')}</select></div><div class="section-label">Exercícios (${d.exercises.length})</div><div id="routine-items">${d.exercises.length?d.exercises.map((re,idx)=>`<div class="routine-item" data-routine-idx="${idx}"><div class="routine-item-head"><div class="ex-summary">${thumb(exerciseById(re.exerciseId))}<strong>${esc(exerciseById(re.exerciseId)?.name||re.name||'Exercício removido')}</strong></div><button class="btn danger small" data-action="remove-routine-ex" data-index="${idx}">Remover</button></div><div class="two-fields"><div><label>Séries</label><input type="number" min="1" max="25" data-field="sets" value="${num(re.sets,3)}"></div><div><label>Repetições/meta</label><input type="number" min="0" max="10000" data-field="reps" value="${num(re.reps,10)}"></div><div><label>Carga sugerida (kg)</label><input type="number" min="0" max="9999" step="0.5" data-field="weightKg" value="${num(re.weightKg,0)}"></div><div><label>Descanso (segundos)</label><input type="number" min="0" max="3600" data-field="restSeconds" value="${num(re.restSeconds,90)}"></div>${Array.isArray(re.setTargets)&&re.setTargets.length?`<details class="pdf-inline-set-editor"><summary>Editar cargas por série (${re.setTargets.length})</summary>${re.setTargets.map((goal,si)=>`<div class="pdf-set-row" data-routine-target-row="${idx}.${si}"><b>${si+1}</b><label>Carga (kg)<input type="number" min="0" max="9999" step="0.5" placeholder="Sem carga" data-target-field="weightKg" value="${goal.weightKg===null?'':num(goal.weightKg,0)}"></label><label>Repetições<input type="number" min="0" max="10000" data-target-field="reps" value="${num(goal.reps,10)}"></label></div>`).join('')}</details>`:''}</div></div>`).join(''):empty('Adicione exercícios para montar sua rotina.')}</div><div class="actions"><button class="btn secondary" data-action="open-picker">+ Escolher exercícios</button></div><div class="actions" style="margin-top:20px"><button class="btn primary" data-action="save-routine">Salvar rotina</button><button class="btn secondary" data-action="close-modal">Cancelar</button></div>`);}
function openPicker(){syncRoutineForm();state.pickerTerm='';state.pickerFilter='';openModal('Selecionar exercícios',`<div class="field"><input id="picker-search" type="search" placeholder="Pesquisar no catálogo..."></div><div id="picker-list" class="picker-list"></div><div class="actions"><button class="btn secondary" data-action="back-routine">← Voltar à rotina</button></div>`);renderPicker();}
function renderPicker(){const target=$('#picker-list');if(!target)return;const term=norm($('#picker-search').value);const data=state.exercises.filter(ex=>!term||norm(ex.name).includes(term)||norm(ex.originalName).includes(term)||norm(ex.category).includes(term)).slice(0,80);target.innerHTML=data.length?data.map(ex=>`<div class="picker-row">${thumb(ex)}<div class="picker-info"><strong>${esc(ex.name)}</strong><div class="muted">${esc(ex.category)} · ${esc(ex.equipment)}</div></div><button class="btn primary small" data-action="pick-exercise" data-id="${esc(ex.id)}">Adicionar</button></div>`).join(''):empty('Nenhum exercício encontrado.');}
async function saveRoutine(){if(!activeRequired())return;syncRoutineForm();const d=state.draft;d.name=String(d.name||'').trim();if(!d.name){notify('Informe o nome do treino.');return;}if(!d.exercises.length){notify('Adicione pelo menos um exercício.');return;}for(const e of d.exercises){if(Array.isArray(e.setTargets)&&e.setTargets.length!==Number(e.sets)){notify('A contagem de séries foi ajustada. Edite as séries individualmente ou mantenha a quantidade original.');return;}}if(d.exercises.some(e=>num(e.sets)<1||num(e.sets)>25)){notify('Séries devem estar entre 1 e 25.');return;}d.schemaVersion=3;d.studentId=state.student.id;await put('routines',d);closeModal();await refresh();setTab('workouts');notify('Rotina salva com exercícios!');}
function openAddToRoutine(exId){const ex=exerciseById(exId);if(!ex)return;if(!state.routines.length){openRoutine(null,ex.id);notify('Crie uma rotina para incluir o exercício.');return;}state.pendingExercise=exId;openModal('Adicionar à rotina',`<p class="muted">${esc(ex.name)}</p><div class="field"><label for="choose-routine">Escolha um treino</label><select id="choose-routine">${state.routines.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></div><div class="actions"><button class="btn primary" data-action="confirm-add-to-routine">Adicionar exercício</button><button class="btn secondary" data-action="new-routine-with-exercise">Criar nova rotina</button></div>`);}
async function addToRoutine(){const ex=exerciseById(state.pendingExercise),r=state.routines.find(r=>r.id===$('#choose-routine').value);if(!r||!ex)return;const copy=structuredClone(r);if(!Array.isArray(copy.exercises))copy.exercises=[];copy.exercises.push(defaultRoutineEx(ex));await put('routines',copy);closeModal();await refresh();notify('Exercício adicionado à rotina.');}
function viewExercise(id){const ex=exerciseById(id);if(!ex)return;const gallery=(ex.images||[]).filter(safeMedia).map(p=>`<img src="${esc(mediaURL(p))}" loading="lazy" alt="Etapa do movimento: ${esc(ex.name)}">`).join('');openModal(ex.name,`${gallery?`<div class="exercise-gallery">${gallery}</div>`:(ex.image?thumb(ex):'')}<div class="card-meta">${ex.originalName&&ex.originalName!==ex.name?`<strong>Nome original:</strong> ${esc(ex.originalName)}<br>`:''}<strong>Grupo principal:</strong> ${esc(ex.category)}<br><strong>Equipamento:</strong> ${esc(ex.equipment)}<br><strong>Tipo:</strong> ${esc(typeLabel(ex.type))}<br><strong>Músculos secundários:</strong> ${esc(ex.secondary?.join(', ')||'Não informados')}<br><strong>Origem:</strong> ${esc(ex.custom?'Personalizado':ex.source==='hevy_api'?'Catálogo anterior':'Free Exercise DB')}</div>${String(ex.image||"").includes("illustracao_")?`<div class="media-source-note"><strong>Ilustração muscular ilustrativa.</strong> Este exercício ainda não possui fotografia ou GIF de execução verificado. O desenho destaca a região principal, mas <strong>não demonstra a técnica</strong>. Para incluir uma imagem própria, use o cadastro de exercício ou o banco autorizado.</div>`:`<p class="hint">As fotos representam etapas do exercício, não um vídeo técnico completo. Use orientação profissional para executar o movimento corretamente.</p>`}<div class="actions"><button class="btn primary" data-action="library-add" data-id="${esc(ex.id)}">+ Adicionar ao treino</button><button class="btn secondary" data-action="close-modal">Fechar</button></div>`);}
const typeLabel=type=>({weight_reps:'Peso e repetições',reps_only:'Somente repetições',duration:'Duração',distance_duration:'Distância e duração',short_distance_weight:'Distância e peso',floors_duration:'Andares e duração',steps_duration:'Passos e duração',bodyweight_assisted:'Peso corporal assistido',bodyweight_weighted:'Peso corporal com carga'}[type]||type);
const fieldsForType=type=>({'reps_only':[['reps','Reps']],duration:[['seconds','Segundos']],distance_duration:[['distanceMeters','Metros'],['seconds','Segundos']],short_distance_weight:[['distanceMeters','Metros'],['weightKg','Kg']],floors_duration:[['floors','Andares'],['seconds','Segundos']],steps_duration:[['steps','Passos'],['seconds','Segundos']]}[type]||[['weightKg','Kg'],['reps','Reps']]);
async function startWorkout(id){if(!activeRequired())return;const existingLock=await getSessionLock();if(existingLock){sessionLockWarning(existingLock);return;}if(state.student.active===false){notify('Reative o cliente antes de iniciar um treino.');return;}const routine=state.routines.find(r=>r.id===id);if(!routine?.exercises?.length){notify('Esta rotina está sem exercícios.');return;}if(state.active){notify('Finalize e salve o treino em andamento.');return;}const session={id:uid('session'),studentId:state.student.id,clientName:state.student.name,coachMode:etRole!=='student',notes:'',restUntil:0,routineId:id,routineName:routine.name,startedAt:new Date().toISOString(),exercises:routine.exercises.map(re=>{const ex=exerciseById(re.exerciseId);const type=ex?.type||re.type||'weight_reps';return {exerciseId:re.exerciseId,name:ex?.name||re.name||'Exercício',image:sessionExerciseVisual(re)?.image||re.image||'',type,notes:'',restSeconds:num(re.restSeconds,90),sets:Array.from({length:Math.max(1,Math.min(25,Array.isArray(re.setTargets)&&re.setTargets.length?re.setTargets.length:num(re.sets,3)))},(_,i)=>{const prescribed=Array.isArray(re.setTargets)?re.setTargets[i]:null;return {weightKg:prescribed?(prescribed.weightKg===null?null:num(prescribed.weightKg,0)):num(re.weightKg,0),reps:prescribed?num(prescribed.reps,10):num(re.reps,10),seconds:60,distanceMeters:0,floors:0,steps:0,done:false};})};})};await acquireSessionLock(session);state.active=session;persistActive();setTab('workouts');notify('Treino iniciado! Registre e marque as séries.');}
function persistActive(){try{if(state.active){localStorage.setItem(activeWorkoutKey(),JSON.stringify(state.active));syncSessionSnapshot();}else localStorage.removeItem(activeWorkoutKey());}catch(err){console.warn('Não foi possível salvar o treino em andamento',err);}}
function restoreActive(){try{const raw=localStorage.getItem(activeWorkoutKey());if(raw||state.sessionLock?.snapshot?.studentId===state.student?.id){const x=raw?JSON.parse(raw):structuredClone(state.sessionLock.snapshot);if(x&&Array.isArray(x.exercises)&&x.startedAt&&(!x.studentId||x.studentId===state.student?.id)){x.studentId=state.student.id;x.exercises.forEach(ex=>{ex.name=exerciseById(ex.exerciseId)?.name||ex.name;});state.active=x;}}}catch{state.active=null;}}
function renderActiveWorkout(){
 const w=state.active;if(!w)return;
 const done=w.exercises.reduce((sum,e)=>sum+e.sets.filter(x=>x.done).length,0);
 const total=w.exercises.reduce((sum,e)=>sum+e.sets.length,0);
 $('#workout-active').innerHTML=`<div class="session-screen-header" role="banner"><div><div class="session-screen-kicker">${etRole==='student'?'● MEU TREINO EM ANDAMENTO':'● ATENDIMENTO EM ANDAMENTO · NAVEGAÇÃO BLOQUEADA'}</div><h1>${esc(state.student?.name||w.clientName||'Cliente')}</h1><p>${esc(w.routineName)} · Registre as séries para salvar a sessão</p></div><button type="button" class="btn primary" data-action="finish-workout" aria-label="Concluir e salvar sessão atual">✓ Concluir e salvar</button></div><div class="card"><div class="presential-session-header"><div><div class="client-attention-kicker">${etRole==='student'?'● MEU TREINO':'● SESSÃO PRESENCIAL'} · ${esc(state.student?.name||w.clientName||'Cliente')}</div><h1 style="font-size:19px;margin:5px 0 4px">${esc(w.routineName)}</h1><div class="muted small">Tempo de atendimento: <strong id="workout-clock" class="accent">00:00:00</strong></div><strong class="presential-counter" id="workout-progress">${done} de ${total} séries concluídas</strong></div></div>

 <p class="small muted">Registre a execução real de cada série. O descanso é iniciado quando uma série é marcada como concluída.</p></div>
 ${w.exercises.map((ex,ei)=>{const fields=fieldsForType(ex.type);const col=fields.length===3?'cols-three':'';const previous=lastClientPerformance(ex.exerciseId);
 return `<div class="card ${ex.substituted?'coach-ex-substituted':''}"><div class="ex-summary active-ex-heading"><span class="seq">${ei+1}</span>${thumb(sessionExerciseVisual(ex),true)}<div class="card-title">${esc(ex.name)}</div></div><div class="card-meta">${esc(typeLabel(ex.type))} · Descanso ${ex.restSeconds}s</div>
 ${ex.substituted?`<div class="coach-ex-status">↪ Exercício substituído durante a sessão. Séries concluídas preservadas.</div>`:''}
 ${previous?`<div class="presential-last">Última sessão (${esc(fmtDate(previous.date))}): ${previous.sets} série(s) · ${previous.weightKg.toLocaleString('pt-BR')} kg × ${previous.reps} rep.</div>`:''}
 <div class="workout-set ${col}"><div class="set-head">Série</div>${fields.map(f=>`<div class="set-head">${f[1]}</div>`).join('')}<div class="set-head">Feito</div></div>
 ${ex.sets.map((se,si)=>`<div class="workout-set ${col}"><div class="smallcount">${si+1}</div>${fields.map(([key,label])=>`<input aria-label="${esc(label)} série ${si+1}" type="number" inputmode="decimal" min="0" step="${key==='weightKg'?'0.5':'1'}" data-set-ex="${ei}" data-set-no="${si}" data-set-field="${key}" value="${num(se[key])}">`).join('')}<input aria-label="Concluir série ${si+1}" class="set-check" type="checkbox" data-set-ex="${ei}" data-set-no="${si}" data-set-field="done" ${se.done?'checked':''}></div>`).join('')}
 <div class="actions"><button class="btn secondary small" data-action="add-set" data-index="${ei}">+ Adicionar série</button><button class="btn secondary small" data-action="start-ex-rest" data-index="${ei}">⏱ Descansar ${ex.restSeconds}s</button></div>
 <div class="presential-note"><label for="exercise-coach-note-${ei}">Observações técnicas do personal</label><textarea id="exercise-coach-note-${ei}" data-ex-note="${ei}" maxlength="1000" placeholder="Ajuste do banco, amplitude, execução, limitações...">${esc(ex.notes||'')}</textarea></div>
 ${exerciseLoadChart(ex)}
 <div class="coach-ex-actions"><button type="button" class="btn ${ex.completed?'coach-ex-done':'secondary'}" data-action="toggle-ex-complete" data-index="${ei}">${ex.completed?'✓ Exercício concluído · Reabrir':'◯ Marcar exercício como concluído'}</button><button type="button" class="btn secondary" data-action="swap-exercise" data-index="${ei}" ${ex.substituted?'disabled':''}>↪ Trocar exercício</button></div></div>`;
 }).join('')}
 <div class="card"><div class="presential-note"><label for="session-coach-note">Observações do atendimento</label><textarea id="session-coach-note" data-session-note maxlength="2500" placeholder="Resumo da sessão, progresso de cargas, orientações para a próxima aula...">${esc(w.notes||'')}</textarea></div><div class="inline-notice" style="margin-top:13px">Os registros são mantidos temporariamente neste navegador durante a execução e, ao finalizar, são salvos no histórico e na pasta individual de ${esc(state.student?.name||'cliente')}, quando a gravação estiver autorizada.</div><div class="actions"><button class="btn primary" data-action="finish-workout">✓ Concluir e salvar sessão</button></div></div>`;
 updateClock();
}
function updateClock(){if(state.active&&num(state.active.restUntil)>0&&num(state.active.restUntil)<=Date.now()&&!state.active.restAlertIssued){state.active.restAlertIssued=true;const expiredFor=Date.now()-state.active.restUntil;state.active.restUntil=0;state.active.restDurationMs=0;persistActive();if(expiredFor<120000)restFinishedAlert();}const clock=$('#workout-clock');if(clock&&state.active)clock.textContent=fmtDuration(Math.max(0,Math.floor((Date.now()-new Date(state.active.startedAt).getTime())/1000)));updateFloatingRest();}
function saveFieldFromInput(el){if(!state.active)return;const ei=Number(el.dataset.setEx),si=Number(el.dataset.setNo);const field=el.dataset.setField;const ex=state.active.exercises[ei],set=ex?.sets[si];if(!set||!(field in set))return;const wasDone=Boolean(set.done);set[field]=field==='done'?el.checked:num(el.value,0);persistActive();if(field==='done'){if(!wasDone&&set.done)beginRest(ex.restSeconds);refreshWorkoutProgress();}}
function readVisibleWorkout(){document.querySelectorAll('[data-set-field]').forEach(el=>saveFieldFromInput(el));if(state.active){state.active.notes=$('[data-session-note]')?.value||state.active.notes||'';document.querySelectorAll('[data-ex-note]').forEach(el=>{const ex=state.active.exercises[Number(el.dataset.exNote)];if(ex)ex.notes=el.value;});persistActive();}}
function addSet(index){if(!state.active?.exercises[index])return;readVisibleWorkout();const list=state.active.exercises[index].sets;if(list.length>=25){notify('Limite de 25 séries por exercício.');return;}const last=list.at(-1)||{};list.push({...last,done:false});persistActive();renderActiveWorkout();}
async function finishWorkout(){
 if(!state.active||state.finishing)return;
 state.finishing=true;
 try{
  readVisibleWorkout();const a=state.active;
  const completed=a.exercises.flatMap(e=>e.sets.filter(s=>s.done));
  if(!completed.length&&!confirm('Nenhuma série concluída. Deseja FINALIZAR e SALVAR esta sessão sem séries no histórico?'))return;
  const w={...structuredClone(a),coachMode:etRole!=='student',clientName:state.student.name,studentId:state.student.id,restUntil:0,restPausedMs:0,date:new Date().toISOString(),endedAt:new Date().toISOString(),durationSeconds:Math.max(0,Math.floor((Date.now()-new Date(a.startedAt).getTime())/1000)),schemaVersion:2,cancelled:completed.length===0,totalVolumeKg:a.exercises.reduce((acc,ex)=>acc+ex.sets.filter(s=>s.done&&fieldsForType(ex.type).some(([key])=>key==='reps')).reduce((val,set)=>val+num(set.weightKg)*num(set.reps),0),0),totalSets:completed.length};
  await put('sessions',w); // transação aguarda a escrita no IndexedDB E na pasta do cliente
  const verified=await getFrom('sessions',w.id);
  if(!verified||verified.studentId!==state.student.id)throw Error('Falha na verificação do histórico salvo.');
  await releaseSessionLock(w.id);
  state.active=null;persistActive();syncSessionFocus();await refresh();setTab(etRole==='student'?'workouts':'history');
  notify('Treino finalizado, salvo e confirmado. Próximo cliente liberado!');
 }catch(err){console.error('Salvamento falhou, atendimento continua bloqueado',err);notify('Não foi possível confirmar o salvamento. Sessão preservada; reconecte a pasta e tente novamente.');}
 finally{state.finishing=false;}
}
async function discardWorkout(){
 if(!state.active)return;
 notify('Para encerrar o atendimento, finalize e salve a sessão (mesmo sem séries).');
 if(confirm('Não é possível descartar um atendimento aberto. Deseja FINALIZAR e SALVAR agora?'))await finishWorkout();
}
function renderHistory(){const total=state.sessions.length;const vol=state.sessions.reduce((s,x)=>s+num(x.totalVolumeKg),0);$('#history-summary').innerHTML=`<div class="card"><div class="card-title">Resumo</div><div class="card-meta">${total} sessão(ões) · ${vol.toLocaleString('pt-BR',{maximumFractionDigits:1})} kg de volume acumulado</div></div>`;$('#history-list').innerHTML=total?state.sessions.map(s=>`<div class="card"><div class="card-top"><div><div class="card-title">${esc(s.routineName||'Treino')}</div><div class="card-meta">${esc(fmtDate(s.date))}<br>${num(s.totalSets)} séries feitas · ${num(s.totalVolumeKg).toLocaleString('pt-BR',{maximumFractionDigits:1})} kg · ${fmtDuration(num(s.durationSeconds))}</div></div><span class="pill">CONCLUÍDO</span></div>${s.notes?`<p class="small muted">Obs. do atendimento: ${esc(s.notes)}</p>`:''}<details class="history-details"><summary>Ver exercícios e séries</summary>${Array.isArray(s.exercises)?s.exercises.map(ex=>`<p><strong>${esc(exerciseById(ex.exerciseId)?.name||ex.name||'Exercício')}</strong> — ${ex.sets?.filter(x=>x.done).length||0} séries concluídas${ex.notes?`<br><small>Obs.: ${esc(ex.notes)}</small>`:''}</p>`).join(''):''}</details><div class="actions"><button class="btn danger small" data-action="delete-session" data-id="${esc(s.id)}">Excluir sessão</button></div></div>`).join(''):empty('Ainda não há sessões finalizadas. Inicie uma rotina e registre suas séries.');}
async function exportData(){
 const target=await ensureBackupClientContext();if(!target)return;
 await refresh();
 const payload={schemaVersion:4,app:'EvoluTrainer v6.0 PT-BR',studentId:state.student.id,studentName:state.student.name,clientId:state.student.id,clientName:state.student.name,exportedAt:new Date().toISOString(),exercises:state.exercises.filter(x=>x.custom),routines:state.routines,sessions:state.sessions,bodyRecords:window.Evolution?.records||[],userProfile:window.Evolution?.profile||null};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`evolutrainer_${safeSlug(state.student.name)}_${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Backup individual de '+state.student.name+' exportado.');
}
async function importData(){
 const target=await ensureBackupClientContext();if(!target)return;
 const file=$('#import-file').files?.[0];if(!file){notify('Selecione um arquivo JSON primeiro.');return;}
 if(file.size>20_000_000){notify('Arquivo muito grande (limite 20 MB).');return;}
 let raw;try{raw=JSON.parse(await file.text());}catch{notify('O arquivo não contém JSON válido.');return;}
 if(!Array.isArray(raw)&&(raw.clientId||raw.studentId)&&(raw.clientId||raw.studentId)!==state.student.id){notify('Backup pertence a outro cliente. Escolha o perfil correto no seletor de backup individual.');return;}
 if(!Array.isArray(raw)&&!raw.studentId&&!confirm('Importar este backup antigo SEM identificador para '+state.student.name+'? Confira o destinatário antes de continuar.'))return;
 const arrayMode=Array.isArray(raw), exercises=arrayMode?raw:raw.exercises||[],routines=arrayMode?[]:raw.routines||[],sessions=arrayMode?[]:raw.sessions||[],bodyRecords=arrayMode?[]:raw.bodyRecords||[];
 if(![exercises,routines,sessions,bodyRecords].every(Array.isArray)){notify('Formato de JSON não suportado.');return;}
 if(exercises.length>15000||routines.length>5000||sessions.length>25000||bodyRecords.length>15000){notify('Arquivo excede o limite de registros.');return;}
 const items=exercises.map(normalizeExercise).filter(ex=>ex?.name);
 const good=x=>x&&typeof x==='object'&&typeof x.id==='string'&&x.id.length<130;
 const validR=routines.filter(r=>good(r)&&typeof r.name==='string'&&Array.isArray(r.exercises));
 const validS=sessions.filter(s=>good(s)&&typeof s.date==='string');
 const validB=bodyRecords.filter(b=>good(b)&&['weight','measurements','composition'].includes(b.kind)&&/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&b.values&&typeof b.values==='object');
 const profile=(!arrayMode&&raw.userProfile&&raw.userProfile.id==='settings')?raw.userProfile:null;
 if(!items.length&&!validR.length&&!validS.length&&!validB.length&&!profile){notify('Nenhum registro válido encontrado.');return;}
 try{
  if(items.length)await transact(['exercises'],'readwrite',tx=>{const a=tx.objectStore('exercises');for(const e of items)a.put(e);});
  if(validR.length||validS.length||validB.length||profile)await transact(PERSONAL_STORES,'readwrite',tx=>{
   for(const r of validR)tx.objectStore('routines').put({...r,studentId:state.student.id});
   for(const s of validS)tx.objectStore('sessions').put({...s,studentId:state.student.id});
   for(const rec of validB)tx.objectStore('bodyRecords').put({...rec,studentId:state.student.id});
   if(profile)tx.objectStore('userProfile').put(profile);
  });
  await refresh();renderFilters();setTab(validB.length?'evolution':'library');$('#import-file').value='';
  notify(`${items.length} exercícios, ${validR.length} rotinas, ${validS.length} sessões e ${validB.length} avaliações importados para ${state.student.name}.`);
 }catch(e){console.error(e);notify('Não foi possível importar os dados.');}
}

async function syncWholeDisk(){
 if(!state.folderReady||!state.folder){notify('Escolha uma pasta-base primeiro.');return;}
 await state.writeQueue.catch(()=>{});await queueMirrorCatalog();
 for(const client of state.students){
  const owned=state.student?.id===client.id&&state.studentDb?state.studentDb:await openIDB('EvoluTrainerAluno_'+client.id,1,PERSONAL_STORES);
  try{await mirrorStudent(state.folder,client,owned);}finally{if(owned!==state.studentDb)owned.close();}
 }
 await writeRoster();notify('Biblioteca e clientes sincronizados em pastas separadas.');
 updateSettingsStatus();
}
function downloadJSON(content,name){const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);}
async function makeFullBackup(options={}){
 await state.writeQueue.catch(()=>{});
 const clients=[];
 for(const c of state.students){
  const db=state.student?.id===c.id&&state.studentDb?state.studentDb:await openIDB('EvoluTrainerAluno_'+c.id,1,PERSONAL_STORES);
  try{
   const items={};for(const store of PERSONAL_STORES)items[store]=await getAllDB(db,store);
   clients.push({profile:{...c},data:items});
  }finally{if(db!==state.studentDb)db.close();}
 }
 return {kind:'EvoluTrainerFullBackup',schemaVersion:1,version:'5.0',createdAt:new Date().toISOString(),finance:await window.ETFinance?.exportRows()||[],settings:{...prefs},library:{exercises:options.trainingsOnly?(await getAllDB(state.db,'exercises')).filter(e=>e.custom):await getAllDB(state.db,'exercises')},clients};
}

// EvoluTrainer 3.9 — pacote portátil específico por cliente (PC ↔ smartphone).
async function buildPortableClient(clientId){
 const client=state.students.find(c=>c.id===clientId);
 if(!client)throw Error('Cliente de origem não encontrado.');
 await state.writeQueue.catch(()=>{});
 const db=(state.student?.id===clientId&&state.studentDb)?state.studentDb:await openIDB('EvoluTrainerAluno_'+clientId,1,PERSONAL_STORES);
 try{
  const data={};for(const name of PERSONAL_STORES)data[name]=await getAllDB(db,name);
  const referenced=new Set(data.routines.flatMap(r=>(r.exercises||[]).map(e=>e.exerciseId)).concat(data.sessions.flatMap(r=>(r.exercises||[]).map(e=>e.exerciseId))));
  const exercises=(await getAllDB(state.db,'exercises')).filter(x=>x.custom||referenced.has(x.id));
  return {kind:'EvoluTrainerPortableClient',schemaVersion:1,appVersion:'3.9',exportedAt:new Date().toISOString(),profile:{...client},data,exercises};
 }finally{if(db!==state.studentDb)db.close();}
}
function portableTargetId(){
 const id=$('#portable-client-select')?.value||'';
 return state.students.some(c=>c.id===id)?id:(state.student?.id||state.students[0]?.id||'');
}
async function exportPortableClient(id){
 if((await getSessionLock())?.clientId){notify('Finalize e salve a sessão antes de exportar um cliente.');return;}
 const target=id||portableTargetId();if(!target){notify('Escolha um cliente para exportar.');return;}
 const pack=await buildPortableClient(target);
 downloadJSON(pack,`EvoluTrainer_cliente_${safeSlug(pack.profile.name)}_${new Date().toISOString().slice(0,10)}.json`);
 const status=$('#portable-status');if(status)status.textContent=`Pacote gerado: ${pack.profile.name} · ${pack.data.routines.length} treinos · ${pack.data.sessions.length} sessões.`;
 notify('Pacote completo do cliente pronto para transferir ao celular.');
}
function validatePortable(raw){
 if(!raw||raw.kind!=='EvoluTrainerPortableClient'||raw.schemaVersion!==1)throw Error('Formato de pacote portátil não reconhecido.');
 const p=raw.profile;
 if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{5,130}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>180)throw Error('ID ou nome do cliente inválido.');
 if(!raw.data||!PERSONAL_STORES.every(key=>Array.isArray(raw.data[key])&&raw.data[key].length<=25000))throw Error('Registros do cliente inválidos.');
 if(!Array.isArray(raw.exercises)||raw.exercises.length>20000)throw Error('Biblioteca transferida inválida.');
 for(const key of PERSONAL_STORES)for(const x of raw.data[key])if(!x||typeof x.id!=='string'||x.id.length>150)throw Error('Registro inválido em '+key);
 return p;
}
async function importPortableClient(){
 if((await getSessionLock())?.clientId){notify('Conclua e salve a sessão antes de importar dados.');return;}
 const f=$('#portable-import-file')?.files?.[0];if(!f){notify('Selecione o arquivo do cliente enviado pelo outro dispositivo.');return;}
 if(f.size>100_000_000){notify('Pacote muito grande; limite de 100 MB.');return;}
 let raw,person;
 try{raw=JSON.parse(await f.text());person=validatePortable(raw);}catch(err){notify('Pacote inválido: '+err.message);return;}
 const existing=state.students.find(c=>c.id===person.id);
 if(existing){
  if(!confirm(`O cliente ${existing.name} já existe neste dispositivo. Deseja mesclar os dados recebidos? Registros com os mesmos IDs serão atualizados, mas os demais serão preservados.`))return;
 }else if(!confirm(`Criar o cliente ${person.name} com seus treinos, histórico e evolução neste dispositivo?`))return;
 const safe={id:person.id,name:person.name.trim(),email:String(person.email||'').slice(0,180),phone:String(person.phone||'').slice(0,40),sex:String(person.sex||'').slice(0,32),birthDate:String(person.birthDate||'').slice(0,20),active:person.active!==false,demo:!!person.demo,createdAt:person.createdAt||new Date().toISOString(),baseDir:'clientes'};
 safe.folderName=studentFolderName(safe);
 const db=(existing&&state.student?.id===safe.id&&state.studentDb)?state.studentDb:await openIDB('EvoluTrainerAluno_'+safe.id,1,PERSONAL_STORES);
 try{
  const records=raw.data;
  await new Promise((resolve,reject)=>{const tx=db.transaction(PERSONAL_STORES,'readwrite');for(const key of PERSONAL_STORES){const store=tx.objectStore(key);for(const r of records[key])store.put(r);}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  if(state.folder)await mirrorStudent(state.folder,safe,db);
  const known=new Set((await getAllDB(state.db,'exercises')).map(x=>x.id));
  const incoming=raw.exercises.map(normalizeExercise).filter(x=>x?.id&&x.name&&(x.custom||!known.has(x.id)));
  if(incoming.length)await transact(['exercises'],'readwrite',tx=>{const store=tx.objectStore('exercises');for(const ex of incoming)store.put(ex);});
  await registryPut('students',safe);
  state.students=state.students.filter(c=>c.id!==safe.id).concat(safe).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  await writeRoster();
  const s=$('#portable-status');if(s)s.textContent=`Importação concluída para ${safe.name}: ${records.routines.length} rotinas, ${records.sessions.length} sessões e ${records.bodyRecords.length} avaliações.`;
  $('#portable-import-file').value='';
  await refresh();renderStudentControls();updateStats();
  if(!state.student||state.student.id!==safe.id)await switchStudent(safe.id);else{state.student=safe;await refresh();renderRoutines();}
  notify('Cliente importado e pronto para continuar os treinos.');
 }finally{if(db!==state.studentDb)db.close();}
}

// Backup local diário; sem execução em segundo plano com o site fechado.
const DAILY_BACKUP_META='dailyBackupMeta',DAILY_BACKUP_PREFIX='dailyBackup:';
let dailyBackupBusy=false;
function localDateKey(d=new Date()){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
function previousDateKey(d=new Date()){const t=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1);return localDateKey(t);}
async function dailyBackupRun(manual=false){
 if(dailyBackupBusy||!state.registry||!state.db)return;
 dailyBackupBusy=true;
 try{
  const key=localDateKey(),snapshot=await makeFullBackup({trainingsOnly:true});
  snapshot.dailyBackup=true;snapshot.scheduledAt='22:00';snapshot.snapshotLocalDate=key;
  const previous=await registryGet('config',DAILY_BACKUP_META);
  const stamp={id:DAILY_BACKUP_META,lastAt:new Date().toISOString(),lastDate:key,lastScheduledDate:manual?(previous?.lastScheduledDate||null):key,clients:snapshot.clients.length,location:'IndexedDB',fileName:`EvoluTrainer_Treinos_${key}.json`};
  await registryPut('config',{id:DAILY_BACKUP_PREFIX+key,createdAt:stamp.lastAt,snapshot});
  if(state.folder){
   try{
    const dir=await state.folder.getDirectoryHandle('backups',{create:true});
    const days=await dir.getDirectoryHandle('diarios',{create:true});
    await writeDiskJSON(days,stamp.fileName,snapshot);
    stamp.location='Pasta/backups/diarios + IndexedDB';
   }catch(err){stamp.location='IndexedDB (pasta indisponível)';console.warn('Cópia diária não foi escrita na pasta:',err);}
  }
  await registryPut('config',stamp);
  // Reter até sete cópias locais; arquivos exportados em pasta permanecem intactos.
  const archive=(await getAllDB(state.registry,'config')).filter(x=>typeof x.id==='string'&&x.id.startsWith(DAILY_BACKUP_PREFIX)).sort((a,b)=>b.id.localeCompare(a.id));
  for(const old of archive.slice(7))await registryDelete('config',old.id);
  updateDailyBackupStatus();
  if(manual)notify('Backup de todos os treinos realizado.');
  else notify('Backup diário das 22h salvo com sucesso.');
 }catch(err){console.error('Falha no backup diário',err);const status=$('#daily-backup-status');if(status)status.textContent='Falha no último backup: '+err.message;notify('Não foi possível criar o backup diário; verifique espaço e permissões.');}
 finally{dailyBackupBusy=false;}
}
async function updateDailyBackupStatus(){
 const node=$('#daily-backup-status');if(!node||!state.registry)return;
 try{const last=await registryGet('config',DAILY_BACKUP_META);node.textContent=last?`Última cópia: ${new Date(last.lastAt).toLocaleString('pt-BR')} · ${last.clients} cliente(s) · ${last.location}.`:'Ainda não há cópia diária. O primeiro backup ocorrerá às 22h, com o aplicativo aberto.';}catch(e){node.textContent='Estado do backup indisponível: '+e.message;}
}
async function checkDailyBackup(){
 if(!state.registry||!state.db||prefs.dailyBackup===false||dailyBackupBusy)return;
 const now=new Date(),key=localDateKey(now),meta=await registryGet('config',DAILY_BACKUP_META);
 const configured=await registryGet('config','dailyBackupConfigured');
 if(!configured){await registryPut('config',{id:'dailyBackupConfigured',at:now.toISOString()});if(now.getHours()<22){updateDailyBackupStatus();return;}}
 const due=now.getHours()>=22?key:previousDateKey(now);
 if(!meta?.lastDate||meta.lastDate<due)await dailyBackupRun(false);
 else updateDailyBackupStatus();
}
async function downloadDailyBackup(){
 const meta=await registryGet('config',DAILY_BACKUP_META);
 if(!meta){notify('Ainda não há backup diário disponível.');return;}
 const row=await registryGet('config',DAILY_BACKUP_PREFIX+meta.lastDate);
 if(!row?.snapshot){notify('Cópia local não encontrada. Gere um novo backup.');return;}
 downloadJSON(row.snapshot,meta.fileName||'EvoluTrainer_Treinos_'+meta.lastDate+'.json');
 notify('Cópia diária baixada. Guarde-a em um local seguro.');
}
async function backupAllClients(){
 if((await getSessionLock())?.clientId){notify('Finalize e salve o treino aberto antes de criar um backup completo.');return;}
 if(!state.folderReady){notify('Conecte a pasta dos clientes antes do backup.');return;}
 try{const snapshot=await makeFullBackup();downloadJSON(snapshot,'EvoluTrainer_backup_completo_'+new Date().toISOString().slice(0,10)+'.json');$('#backup-status').textContent=`Backup gerado para ${snapshot.clients.length} cliente(s) e ${snapshot.library.exercises.length} exercícios.`;notify('Backup completo disponível para salvar.');}
 catch(e){console.error(e);notify('Falha ao criar backup: '+e.message);}
}
function validateRestore(raw){
 if(!raw||raw.kind!=='EvoluTrainerFullBackup'||raw.schemaVersion!==1||!Array.isArray(raw.clients)||!Array.isArray(raw.library?.exercises))throw Error('Arquivo não é um backup completo compatível.');
 if(raw.clients.length>5000||raw.library.exercises.length>20000)throw Error('Quantidade de registros incompatível.');
 const ids=new Set();let total=0;
 for(const row of raw.clients){
  const p=row?.profile,d=row?.data;
  if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{5,130}$/.test(p.id)||typeof p.name!=='string'||!p.name.trim()||ids.has(p.id))throw Error('Cadastro ou ID de cliente inválido ou repetido.');
  if(!d||!PERSONAL_STORES.every(k=>Array.isArray(d[k])&&d[k].length<=25000))throw Error('Conteúdo de cliente inválido.');
  for(const k of PERSONAL_STORES)for(const item of d[k]){if(!item||typeof item!=='object'||typeof item.id!=='string'||item.id.length>150)throw Error('Registro de cliente inválido em '+k);total++;}
  ids.add(p.id);
 }
 if(total>350000)throw Error('Backup maior que o limite de registros.');
 return {clients:raw.clients.length,exercises:raw.library.exercises.length};
}
async function restoreAllClients(){
 if(!state.folderReady){notify('Armazenamento local indisponível.');return;}
 if((await getSessionLock())?.clientId){notify('Finalize e salve a sessão em andamento antes da restauração.');return;}
 const f=$('#restore-full-file')?.files?.[0];if(!f){notify('Selecione um arquivo de backup completo.');return;}
 if(f.size>80_000_000){notify('Backup excede 80 MB.');return;}
 let raw,meta;try{raw=JSON.parse(await f.text());meta=validateRestore(raw);}catch(e){notify('Backup inválido: '+e.message);return;}
 if(!confirm(`Restaurar ${meta.clients} cliente(s) e ${meta.exercises} exercícios? Registros dos mesmos IDs serão substituídos pelos do backup, mas os demais clientes serão mantidos. Um backup dos dados atuais será baixado antes de continuar.`))return;
 const typed=prompt('Para confirmar a restauração, digite exatamente RESTAURAR:');if(typed!=='RESTAURAR'){notify('Restauração cancelada, sem alterar os dados.');return;}
 try{
  const previous=await makeFullBackup();downloadJSON(previous,'EvoluTrainer_antes_da_restauracao_'+new Date().toISOString().slice(0,10)+'.json');
  await state.writeQueue;
  if(state.studentDb){state.studentDb.close();state.studentDb=null;}state.student=null;state.active=null;
  for(const row of raw.clients){
   const source=row.profile;
   const profile={...source,baseDir:['alunos','clientes'].includes(source.baseDir)?source.baseDir:'clientes'};
   profile.folderName=studentFolderName(profile);
   const db=await openIDB('EvoluTrainerAluno_'+profile.id,1,PERSONAL_STORES);
   try{
    await new Promise((resolve,reject)=>{const tx=db.transaction(PERSONAL_STORES,'readwrite');for(const store of PERSONAL_STORES){const os=tx.objectStore(store);os.clear();for(const item of row.data[store])os.put(item);}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    if(state.folder)await mirrorStudent(state.folder,profile,db);
   }finally{db.close();}
   await registryPut('students',profile);
   if(state.deletedClientIds.has(profile.id)){await registryDelete('config','clientDeleted:'+profile.id);state.deletedClientIds.delete(profile.id);}
   state.students=state.students.filter(x=>x.id!==profile.id).concat(profile);
  }
  await new Promise((resolve,reject)=>{const tx=state.db.transaction('exercises','readwrite');const os=tx.objectStore('exercises');for(const record of raw.library.exercises){const x=normalizeExercise(record);if(x?.id&&x.name)os.put(x);}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
  await mirrorCatalog();await writeRoster();if(Array.isArray(raw.finance))await window.ETFinance?.importRows(raw.finance);if(raw.settings&&typeof raw.settings==='object'){for(const key of ['theme','sound','vibration'])if(Object.hasOwn(raw.settings,key)){if(key==='theme'&&['light','dark','system'].includes(raw.settings.theme)||key!=='theme'&&typeof raw.settings[key]==='boolean')savePreference(key,raw.settings[key]);}renderPreferences();}state.students.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  await refresh();renderFilters();renderStudentControls();renderActiveClientBar();
  $('#restore-full-file').value='';$('#backup-status').textContent=`Restaurados ${meta.clients} clientes e ${meta.exercises} exercícios. Outros perfis não foram removidos.`;
  notify('Restauração concluída. Escolha um cliente para atender.');setTab('settings');
 }catch(e){console.error('Restauração possivelmente parcial:',e);notify('Restauração interrompida: '+e.message+'. Verifique os dados e utilize o backup anterior se necessário.');}
}
function backupTargetId(){
 const sel=$('#backup-client-select');
 const chosen=sel?.value||'';
 if(chosen&&state.students.some(s=>s.id===chosen))return chosen;
 return state.student?.id||state.students[0]?.id||'';
}
async function ensureBackupClientContext(){
 const id=backupTargetId();
 if(!id){notify('Selecione um cliente para o backup individual.');return null;}
 if(state.sessionLock?.clientId&&state.sessionLock.clientId!==id){notify('Finalize e salve a sessão em andamento antes de acessar o backup de outro cliente.');return null;}
 if(!state.student||state.student.id!==id)await switchStudent(id);
 return state.student?.id===id?state.student:null;
}
function updateSettingsStatus(){
 const folder=$('#settings-folder-status'),lock=$('#session-lock-status'),backup=$('#backup-client-select'),portable=$('#portable-client-select');
 if(folder)folder.textContent=state.folder?'Pasta conectada: '+state.folderLabel:'Armazenamento local IndexedDB ativo. Escolher uma pasta física é opcional e disponível em navegadores compatíveis.';
 if(lock)lock.textContent=state.sessionLock?.clientId?'🔒 Atendimento em aberto: '+(state.sessionLock.clientName||'cliente')+'. Finalize e salve para liberar outros clientes.':'🔓 Nenhum treino em andamento. Novo atendimento liberado.';
 if(portable){const cur=portable.value||state.student?.id||'';portable.innerHTML='<option value="">Selecione um cliente...</option>'+state.students.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');portable.value=state.students.some(c=>c.id===cur)?cur:(state.student?.id||state.students[0]?.id||'');portable.disabled=!state.students.length;}
 if(backup){
  const current=backup.value||state.student?.id||'';
  backup.innerHTML='<option value="">Selecione um cliente...</option>'+state.students.map(c=>`<option value="${esc(c.id)}" ${current===c.id?'selected':''}>${esc(c.name)}${c.active===false?' (inativo)':''}</option>`).join('');
  backup.value=(state.students.some(c=>c.id===current)?current:(state.student?.id||state.students[0]?.id||''));
  backup.disabled=!state.students.length;
 }
}

async function selfTest(){const output=$('#test-results');const results=[];try{const objects=state.db.objectStoreNames.contains('exercises')&&!!state.studentDb&&PERSONAL_STORES.every(s=>state.studentDb.objectStoreNames.contains(s));results.push(`${objects?'✓':'✗'} Estrutura do IndexedDB`);if(!activeRequired())return;const [ex,r,s]=await Promise.all(STORES.map(allFrom));results.push(`${ex.length?'✓':'✗'} Leitura do catálogo (${ex.length} itens)`);results.push(`✓ Leitura das rotinas (${r.length}) e sessões (${s.length})`);const unique=new Set(ex.map(e=>e.id));results.push(`${unique.size===ex.length?'✓':'✗'} IDs únicos de exercícios`);const testId=uid('selftest');const dummy={id:testId,name:'AUTOTESTE',category:'Teste',equipment:'Teste',custom:true};await put('exercises',dummy);const found=await getFrom('exercises',testId);await remove('exercises',testId);results.push(`${found?.id===testId?'✓':'✗'} Gravação, leitura e exclusão (teste temporário)`);const brokenR=r.filter(x=>!Array.isArray(x.exercises));results.push(`${brokenR.length?'⚠':'✓'} Formato de rotinas (${brokenR.length} inconsistências)`);const ev=window.Evolution?.testCalculations?.();if(ev)results.push(...ev);output.textContent=results.join('\n');notify('Autoteste concluído.');}catch(e){results.push(`✗ Falha: ${e.message}`);output.textContent=results.join('\n');notify('Falha no autoteste.');}}

function offlineFiles(){const assets=['index.html','assets/css/01-base.css','assets/css/02-componentes.css','assets/css/03-aparencia.css','assets/css/04-responsivo.css','assets/js/pdf-exportacao.js','assets/js/nucleo-app.js','assets/js/pdf-importacao.js','assets/js/evolucao.js','assets/js/cobrancas.js','assets/js/navegacao.js','assets/js/acessibilidade.js','assets/js/precos-servicos.js','assets/anatomia-corporal.svg','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/apple-touch-icon.png','manifest.webmanifest','sw.js','data/exercises.json','LEIA-ME.txt'];for(const ex of state.exercises){if(/^media\//.test(ex.image||''))assets.push(ex.image);for(const p of ex.images||[])if(/^media\//.test(p||''))assets.push(p);}return [...new Set(assets)].sort();}
function showOfflineProgress(current,total,message){const lbl=$('#offline-progress'),meter=$('#offline-meter');if(lbl)lbl.textContent=`${message} — ${current}/${total} (${Math.round(current*100/Math.max(total,1))}%)`;if(meter)meter.value=Math.round(current*100/Math.max(total,1));}
async function installOfflineFolder(){
 if(!state.exercises.length)await syncExerciseCatalog({showNotice:false});
 if(location.protocol==='file:'){notify('Você já está usando uma pasta local offline.');$('#offline-progress').textContent='Os arquivos estão na pasta local. Faça backup JSON dos seus treinos regularmente.';return;}if(!window.showDirectoryPicker){notify('Este navegador não permite escolher pastas. Baixe o ZIP e extraia-o em uma pasta.');$('#offline-progress').textContent='Pasta manual necessária: baixe o ZIP e extraia os arquivos.';return;}
 let dir;
 // Directory picker MUST be called synchronously inside the user click event.
 try{dir=await window.showDirectoryPicker({id:'evolutrainer-offline-dados',mode:'readwrite'});}catch(err){if(err.name!=='AbortError')notify('Não foi possível acessar a pasta: '+err.message);return;}
 const folder=await dir.getDirectoryHandle('EvoluTrainer_Offline',{create:true});
 const files=offlineFiles();let finished=0;
 try{
  // Only copy packaged paths from our allowlisted catalog, no third-party network files.
  for(const pathname of files){const response=await fetch('./'+pathname,{cache:'force-cache'});if(!response.ok)throw Error('Arquivo não encontrado: '+pathname);const parts=pathname.split('/');let target=folder;for(const part of parts.slice(0,-1))target=await target.getDirectoryHandle(part,{create:true});const handle=await target.getFileHandle(parts.at(-1),{create:true});const writable=await handle.createWritable();await writable.write(await response.blob());await writable.close();finished++;if(finished%15===0||finished===files.length){showOfflineProgress(finished,files.length,'Copiando para a pasta offline');await new Promise(resolve=>setTimeout(resolve,0));}}
  localStorage.setItem(OFFLINE_KEY,JSON.stringify({folder:true,files:finished,date:new Date().toISOString()}));notify('Pasta offline instalada!');showOfflineProgress(files.length,files.length,'Instalação concluída. Abra EvoluTrainer_Offline/index.html');
 }catch(err){console.error(err);notify('Falha na cópia: '+err.message);showOfflineProgress(finished,files.length,'Instalação incompleta. Tente novamente');}
}
async function cacheOfflineFiles(){if(!state.exercises.length)await syncExerciseCatalog({showNotice:false});if(!('caches' in window)||!window.isSecureContext){$('#offline-progress').textContent='Para ativar cache, use HTTPS ou localhost. O ZIP funciona sem servidor após extrair.';return;}
 const files=offlineFiles();const cache=await caches.open(MEDIA_CACHE);let n=0;
 try{for(const pathname of files){const url=new URL('./'+pathname,location.href).href;if(!await cache.match(url)){const response=await fetch(url);if(!response.ok)throw Error(pathname);await cache.put(url,response);}n++;if(n%30===0||n===files.length){showOfflineProgress(n,files.length,'Guardando no cache offline');await new Promise(resolve=>setTimeout(resolve,0));}}localStorage.setItem(OFFLINE_KEY,JSON.stringify({cache:true,files:n,date:new Date().toISOString()}));showOfflineProgress(n,n,'Todos os arquivos estão disponíveis neste navegador');notify('Cache offline concluído.');}catch(err){console.error(err);showOfflineProgress(n,files.length,'Cache incompleto. Execute novamente');notify('Não foi possível concluir o cache offline.');}}

async function clickAction(button){
 const action=button.dataset.action,id=button.dataset.id,idx=Number(button.dataset.index);
 if(etRole==='student'&&!ET_STUDENT_ACTIONS.has(action)){notify('Esta função está disponível somente no modo Personal.');return;}
 const permittedDuringSession=new Set(['finish-workout','add-set','toggle-ex-complete','swap-exercise','swap-select-exercise','start-ex-rest','rest-add','rest-sub','rest-manual','rest-skip','rest-pause','close-modal']);
 if(state.active&&!permittedDuringSession.has(action)){
  notify('Treino em andamento: conclua e salve a sessão para acessar as outras funções.');return;
 }
 try{switch(action){
case'pdf-import-open':await window.EvoluPDF.open();break;case'pdf-import-confirm':await window.EvoluPDF.confirm();break;case'student-folder':await chooseStudentFolder();break;case'sync-database':await syncWholeDisk();break;case'backup-full':await backupAllClients();break;case'portable-export':await exportPortableClient();break;case'portable-export-current':await exportPortableClient(state.student?.id);break;case'portable-import':await importPortableClient();break;case'daily-backup-now':await dailyBackupRun(true);break;case'daily-backup-download':await downloadDailyBackup();break;case'restore-full':await restoreAllClients();break;case'test-rest-alert':testRestNotification(false);break;case'test-vibration':testRestNotification(true);break;
case'student-new':openStudentModal();break;
case'student-save':await saveClientForm();break;
case'student-samples':await createSamples();break;
case'student-legacy':await migrateLegacyData();break;
case'client-view-profile':if(activeRequired()){setTab('clients');document.getElementById('client-attention-card')?.scrollIntoView({block:'start',behavior:'smooth'});}break;
case'client-workouts':if(activeRequired())setTab('workouts');break;
case'client-jump-evolution':if(activeRequired())setTab('evolution');break;
case'client-start-training':openClientTrainingPicker();break;
case'client-pdf-for':await switchStudent(id);if(state.student?.id===id)openWorkoutPdfDialog();break;
case'client-start-for':await switchStudent(id);if(state.student?.id===id)openClientTrainingPicker();break;
case'client-start-routine':{const selected=state.routines.find(r=>r.id===id);if(!selected){notify('Treino não encontrado para este cliente.');break;}closeModal();await startWorkout(id);break;}
case'client-new-routine':closeModal();if(activeRequired())openRoutine();break;
case'rest-add':adjustRest(30);break;case'rest-sub':adjustRest(-30);break;case'rest-manual':setRestManual();break;case'rest-skip':adjustRest(0);break;case'rest-pause':toggleRestPause();break;
case'start-ex-rest':{const ex=state.active?.exercises[idx];if(ex)beginRest(ex.restSeconds);break;}
case'client-open':await switchStudent(id);break;
case'client-edit':openStudentModal(id);break;
case'client-evolution':setTab('evolution');break;
case'client-history':setTab('history');break;
case'client-toggle':{const c=state.students.find(s=>s.id===id);if(c&&confirm((c.active===false?'Reativar':'Desativar')+' o cliente '+c.name+'? Os dados serão preservados.'))await editClientProfile(id,{...c,active:c.active===false});break;}
case'client-delete-request':showClientDeletionFirst(id);break;
case'client-delete-stage2':showClientDeletionSecond();break;
case'client-delete-confirm':await deleteClientConfirmed();break;

case'new-routine':if(activeRequired())openRoutine();break;case'edit-routine':openRoutine(id);break;case'duplicate-routine':{const r=state.routines.find(x=>x.id===id);if(!r)break;const copy={...structuredClone(r),id:uid('routine'),name:r.name+' (cópia)',createdAt:new Date().toISOString()};delete copy.manualOrder;await put('routines',copy);await refresh();renderRoutines();notify('Rotina duplicada.');break;}
case'delete-routine':if(confirm('Excluir esta rotina? As sessões históricas serão mantidas.')){await remove('routines',id);await refresh();renderRoutines();notify('Rotina excluída.');}break;
case'new-exercise':openNewExercise();break;case'ex-clear-image':state.customExerciseImage=null;if($('#ex-upload'))$('#ex-upload').value='';if($('#ex-upload-preview')){$('#ex-upload-preview').hidden=true;$('#ex-upload-preview').removeAttribute('src');}if($('#ex-upload-empty'))$('#ex-upload-empty').hidden=false;break;case'save-exercise':await saveExercise();break;case'workout-pdf-form':openWorkoutPdfDialog();break;case'export-workout-pdf':downloadWorkoutPdf();break;case'close-modal':closeModal();break;case'view-exercise':viewExercise(id);break;case'delete-exercise':if(confirm('Excluir exercício personalizado? Rotinas existentes serão mantidas.')){await remove('exercises',id);await refresh();renderFilters();renderLibrary();}break;
case'library-add':if(activeRequired())openAddToRoutine(id);break;case'confirm-add-to-routine':await addToRoutine();break;case'new-routine-with-exercise':{if(!activeRequired())break;const eid=state.pendingExercise;openRoutine(null,eid);break;}
case'open-picker':openPicker();break;case'back-routine':renderRoutineEditor();break;case'pick-exercise':{const ex=exerciseById(id);if(ex&&state.draft){state.draft.exercises.push(defaultRoutineEx(ex));notify('Exercício incluído na edição.');renderRoutineEditor();}break;}
case'remove-routine-ex':syncRoutineForm();state.draft.exercises.splice(idx,1);renderRoutineEditor();break;case'save-routine':await saveRoutine();break;
case'routine-order-toggle':state.organizingRoutines=!state.organizingRoutines;renderRoutines();break;case'routine-move-up':await moveRoutine(id,-1);break;case'routine-move-down':await moveRoutine(id,1);break;case'routine-order-reset':await resetRoutineOrder();break;
case'client-calendar-prev':navigateClientCalendar(-1);break;case'client-calendar-next':navigateClientCalendar(1);break;case'client-calendar-today':returnClientCalendarToday();break;case'client-calendar-day':showClientCalendarDay(button.dataset.date);break;case'toggle-ex-complete':toggleExerciseComplete(idx);break;case'swap-exercise':openSwapPicker(idx);break;case'swap-select-exercise':swapWorkoutExercise(id);break;case'start':await startWorkout(id);break;case'add-set':addSet(idx);break;case'finish-workout':await finishWorkout();break;case'discard-workout':discardWorkout();break;
case'delete-session':if(confirm('Excluir esta sessão do histórico?')){await remove('sessions',id);await refresh();renderHistory();notify('Sessão excluída.');}break;
case'offline-folder':await installOfflineFolder();break;case'offline-cache':await cacheOfflineFiles();break;case'load-more':state.limit+=60;renderLibrary();break;case'export':await exportData();break;case'import':await importData();break;case'self-test':await selfTest();break;}
}catch(err){console.error(err);notify('Ocorreu um erro: '+err.message);}}
// EvoluTrainer: uma só aplicação; apresentação adaptativa por tipo de ponteiro e largura.
const ET43_INTERFACE_KEY='et43_interface_preference';
let et43Preference='auto';
function et43AutomaticMode(){
 const small=window.innerWidth<=760;
 const coarse=window.matchMedia?.('(pointer: coarse)').matches||false;
 const fine=window.matchMedia?.('(pointer: fine)').matches||false;
 const noHover=window.matchMedia?.('(hover: none)').matches||false;
 const touchCapable=Number(navigator.maxTouchPoints||0)>0;
 // Em híbridos, priorize toque em telas compactas e mantenha o ajuste manual disponível.
 return small||coarse||(touchCapable&&(!fine||window.innerWidth<=1024))||(noHover&&!fine)?'touch':'desktop';
}
function et43ApplyInterfaceMode(){
 const resolved=et43Preference==='auto'?et43AutomaticMode():et43Preference;
 document.documentElement.dataset.etUi=resolved;
 document.documentElement.dataset.etUiPreference=et43Preference;
 document.body.dataset.etUi=resolved;
 document.body.dataset.etUiPreference=et43Preference;
 const field=document.getElementById('cfg-ui-mode');
 if(field&&field.value!==et43Preference)field.value=et43Preference;
 const modeStatus=document.getElementById('cfg-ui-mode-status');
 if(modeStatus){
  const compact=window.innerWidth<800;
  const modeLabel=resolved==='touch'?'Toque (controles amplos e navegação inferior)':compact?'Desktop compacto (menu horizontal)':window.innerWidth<1100?'Desktop (barra lateral compacta)':'Desktop (barra lateral)';
  modeStatus.textContent=(et43Preference==='auto'?'Detectado automaticamente: ':'Modo escolhido: ')+modeLabel+'.';
 }
 document.dispatchEvent(new CustomEvent('et:interface-mode',{detail:{mode:resolved,preference:et43Preference}}));
}
function et43BindAdaptation(){
 try{const stored=localStorage.getItem(ET43_INTERFACE_KEY);if(['auto','touch','desktop'].includes(stored))et43Preference=stored;}catch{}
 et43ApplyInterfaceMode();
 const update=()=>{if(et43Preference==='auto')et43ApplyInterfaceMode();};
 window.addEventListener('resize',update,{passive:true});
 window.addEventListener('orientationchange',update,{passive:true});
 for(const query of ['(pointer: coarse)','(pointer: fine)','(hover: none)']){
  const media=window.matchMedia?.(query);if(!media)continue;
  if(media.addEventListener)media.addEventListener('change',update);
  else if(media.addListener)media.addListener(update);
 }
 document.addEventListener('change',event=>{
  if(event.target?.id!=='cfg-ui-mode')return;
  const choice=event.target.value;
  if(!['auto','touch','desktop'].includes(choice))return;
  et43Preference=choice;
  try{localStorage.setItem(ET43_INTERFACE_KEY,choice);}catch{}
  et43ApplyInterfaceMode();
 });
 document.addEventListener('keydown',event=>{
  const button=event.target.closest?.('#workout-calendar [data-action="client-calendar-day"]');
  if(!button||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  const date=button.dataset.date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return;
  event.preventDefault();
  const offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
  const [y,m,d]=date.split('-').map(Number);
  const next=new Date(y,m-1,d+offset);
  state.clientCalendarMonth=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;
  showClientCalendarDay(`${state.clientCalendarMonth}-${String(next.getDate()).padStart(2,'0')}`);
 });
}
function bindEvents(){et43BindAdaptation();document.addEventListener('pointerdown',e=>{if(e.target.closest('#workout-active,#page-settings'))unlockSound();},{passive:true});document.addEventListener('submit',e=>{if(e.target.id==='client-form'){e.preventDefault();void saveClientForm().catch(err=>{console.error(err);notify('Cadastro não salvo: '+err.message);});}});document.addEventListener('click',e=>{const tab=e.target.closest('[data-tab]');if(tab){setTab(tab.dataset.tab);return;}const chip=e.target.closest('[data-ex-primary],[data-ex-secondary]');if(chip){e.preventDefault();changeExerciseChip(chip);return;}const button=e.target.closest('[data-action]');if(button){e.preventDefault();void clickAction(button);}});document.addEventListener('input',e=>{if(e.target.id==='client-search'){state.clientSearch=e.target.value;renderClientList();}if(e.target.id==='search-exercise'){state.limit=60;renderLibrary();}if(e.target.id==='picker-search')renderPicker();if(e.target.id==='swap-search')renderSwapResults();if(e.target.matches('[data-set-field]'))saveFieldFromInput(e.target);if(etRole!=='student'&&state.active&&e.target.matches('[data-session-note]')){state.active.notes=e.target.value;persistActive();}if(etRole!=='student'&&state.active&&e.target.matches('[data-ex-note]')){const ex=state.active.exercises[Number(e.target.dataset.exNote)];if(ex){ex.notes=e.target.value;persistActive();}}});document.addEventListener('change',e=>{if(e.target.id==='ex-upload'){void readExerciseImage(e.target);return;}if(e.target.name==='pdf-scope'){const box=document.querySelector('.pdf-day-picker');if(box)box.hidden=e.target.value==='all';return;}if(e.target.id==='cfg-theme'){savePreference('theme',e.target.value);return;}if(e.target.id==='cfg-sound'){savePreference('sound',e.target.checked);unlockSound();return;}if(e.target.id==='cfg-vibration'){savePreference('vibration',e.target.checked);return;}if(e.target.id==='cfg-daily-backup'){prefs.dailyBackup=e.target.checked;savePreference('dailyBackup',e.target.checked);if(e.target.checked)void checkDailyBackup();return;}if(e.target.id==='active-client-select'){if(etRole==='student'){renderActiveClientBar();return;}const id=e.target.value;if(id)void switchStudent(id).catch(err=>{console.error(err);notify('Erro ao selecionar cliente: '+err.message);renderActiveClientBar();});else renderActiveClientBar();return;}if(e.target.id==='client-filter'){state.clientStatus=e.target.value;renderClientList();return;}if(['filter-muscle','filter-equipment','filter-source'].includes(e.target.id)){state.limit=60;renderLibrary();}if(e.target.matches('[data-set-field]'))saveFieldFromInput(e.target);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal-overlay').hidden)closeModal();});$('#modal-overlay').addEventListener('click',e=>{if(e.target===$('#modal-overlay'))closeModal();});window.addEventListener('pagehide',persistActive);window.addEventListener('beforeunload',e=>{if(state.active){e.preventDefault();e.returnValue='';}});}
async function init(){etSetupRoleGate();bindEvents();loadPrefs();if(window.matchMedia)matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if(prefs.theme==='system')applyTheme();});try{state.db=await makeDB();await startStudents();await refresh();renderFilters();renderStudentControls();if(state.folderReady&&state.preferredClientId&&state.students.some(x=>x.id===state.preferredClientId))await switchStudent(state.preferredClientId);else setTab('workouts');renderActiveClientBar();etRoleGateReady=true;etPopulateRoleClients();state.ticker=setInterval(updateClock,1000);state.dailyBackupTimer=setInterval(()=>{void checkDailyBackup().catch(console.error);},60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void checkDailyBackup().catch(console.error);});void checkDailyBackup().catch(console.error);const needsCatalogSync=!state.exercises.length||getExerciseSeedVersion()!==EXERCISE_SEED_VERSION;if(needsCatalogSync){setTimeout(()=>{void syncExerciseCatalog({initial:!state.exercises.length,showNotice:true}).catch(()=>{});},0);}else notify(`Biblioteca pronta: ${state.exercises.length} exercícios no navegador.`);}catch(err){console.error(err);$('#status-text').textContent='Falha na base local';const gateStatus=document.getElementById('et-role-status');if(gateStatus)gateStatus.textContent='Não foi possível abrir o banco deste navegador. Tente usar uma origem HTTPS ou outro navegador com IndexedDB habilitado.';$('#routines-list').innerHTML=empty(`Falha ao abrir armazenamento local: ${err.message}. Abra o site via HTTPS (Vercel) e permita o IndexedDB.`);notify('O navegador não permitiu abrir o banco local.');}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else void init();


// PWA independente do banco IndexedDB; disponível apenas por HTTPS/localhost.
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('PWA indisponível:',e.message)));
