const CACHE='evolupersonal-media-download-v1';
export async function verifyGif(bytes,sha){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(!['GIF87a','GIF89a'].includes(new TextDecoder().decode(b.slice(0,6))))throw new Error('O servidor não entregou um GIF válido.');
 const head=new TextEncoder().encode(`blob ${b.length}\0`),all=new Uint8Array(head.length+b.length);all.set(head);all.set(b,head.length);
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-1',all))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(hash!==sha)throw new Error('A verificação de integridade do GIF falhou.');return b;
}
export function packageItems(manifest,catalog,group=''){
 const ids=new Set(catalog.exercises.filter(e=>!group||e.muscle===group).map(e=>e.externalId));
 return [...new Map(manifest.items.filter(i=>ids.has(i.id)).map(i=>[i.sha,i])).values()];
}
export class MediaDownloads{
 constructor({manifest,catalog,storage,fetcher=fetch,onChange=()=>{}}){Object.assign(this,{manifest,catalog,storage,fetcher,onChange});this.running=false;this.controller=null;this.status='Pronto para baixar';this.done=0;this.total=0;}
 async download(group=''){
  if(this.running)return;this.running=true;this.controller=new AbortController();this.done=0;const items=packageItems(this.manifest,this.catalog,group);this.total=items.length;
  try{for(const item of items){if(this.controller.signal.aborted)break;if(!await this.storage.has(item.sha)){
   const response=await this.fetcher(this.manifest.downloadBase+item.sha+'.gif',{signal:this.controller.signal,cache:'no-store'});if(!response.ok)throw new Error('Falha de conexão ao baixar o GIF.');const bytes=await verifyGif(await response.arrayBuffer(),item.sha);if(this.controller.signal.aborted)break;await this.storage.put(item.sha,bytes);
  }this.done++;this.status=`${this.done}/${this.total} GIFs disponíveis`;this.onChange();}
  this.status=this.controller.signal.aborted?'Download pausado. Os arquivos concluídos foram preservados.':'Pacote disponível offline.';
  }catch(e){this.status=e.name==='AbortError'?'Download pausado. Os arquivos concluídos foram preservados.':e.message+' Tente retomar para continuar dos arquivos concluídos.';}
  finally{this.running=false;this.onChange();}
 }
 pause(){this.controller?.abort();}
 async remove(group=''){if(this.running)throw new Error('Pause o download antes de remover as mídias.');for(const i of packageItems(this.manifest,this.catalog,group))await this.storage.remove(i.sha);this.status='Mídias removidas. Fichas e histórico foram preservados.';this.onChange();}
}
export function createMediaStorage(bridge){
 const key=sha=>new URL('./downloaded-media/'+sha+'.gif',location.href).href;
 if(bridge?.isNative)return {has:sha=>bridge.mediaHas(sha),put:(sha,b)=>bridge.mediaPut(sha,b),remove:sha=>bridge.mediaRemove(sha),url:sha=>bridge.mediaUrl(sha),size:()=>bridge.mediaSize()};
 return {async has(sha){return !!await (await caches.open(CACHE)).match(key(sha));},async put(sha,b){await (await caches.open(CACHE)).put(key(sha),new Response(b,{headers:{'Content-Type':'image/gif'}}));},async remove(sha){await (await caches.open(CACHE)).delete(key(sha));},async url(sha){const r=await (await caches.open(CACHE)).match(key(sha));return r?URL.createObjectURL(await r.blob()):null;},async size(){const c=await caches.open(CACHE),keys=await c.keys();let bytes=0;for(const k of keys)bytes+=(await (await c.match(k)).blob()).size;return {count:keys.length,bytes};}};
}
