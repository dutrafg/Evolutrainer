import {emptyState,validate} from './domain.js';
import {migrate} from './beta-domain.js';
const DB='evolupersonal-pwa-v1';
let opening;
function open() {
 return opening ||= new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>r.result.createObjectStore('documents');
  r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};
  r.onerror=()=>{opening=null;reject(new Error('Não foi possível abrir os dados locais. Verifique as permissões do navegador.'));};
  r.onblocked=()=>reject(new Error('Feche outras abas do aplicativo e tente novamente.'));
 });
}
export async function readState() {
 const db=await open();return new Promise((resolve,reject)=>{
  const r=db.transaction('documents').objectStore('documents').get(location.pathname.endsWith('/student.html')?'student-state':'state');
  r.onsuccess=()=>{try{resolve(r.result ? validate(migrate(r.result)):emptyState());}catch(e){reject(e);}};r.onerror=()=>reject(r.error);
 });
}
export async function writeState(next,expectedRevision) {
 validate(next);const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('documents','readwrite'), store=tx.objectStore('documents');let conflict=false;
  const r=store.get(location.pathname.endsWith('/student.html')?'student-state':'state');r.onsuccess=()=>{
   if((r.result?.rev ?? 0)!==expectedRevision){conflict=true;tx.abort();return;}
   store.put(next,location.pathname.endsWith('/student.html')?'student-state':'state');
  };
  tx.oncomplete=()=>resolve(next);
  tx.onabort=()=>reject(new Error(conflict?'Os dados mudaram em outra aba. Guarde o rascunho e reabra esta página antes de salvar.':'Não foi possível salvar. O formulário foi mantido para nova tentativa.'));
  tx.onerror=()=>{};
 });
}
