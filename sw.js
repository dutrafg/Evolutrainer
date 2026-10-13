/* EvoluTrainer v6.3 · PWA offline · nenhum dado pessoal passa pelo Service Worker */
'use strict';
const VERSION='v6.3';
const CACHE_SHELL=`evolutrainer-${VERSION}-shell`;
const CACHE_MEDIA='evolutrainer-media-persistente-v1';
const CACHE_PREFIX='evolutrainer-v6.';
const SHELL_FILES=["./", "./index.html", "./manifest.webmanifest", "./data/exercises.json", "./assets/icon.svg", "./assets/icon-192.png", "./assets/icon-512.png", "./assets/apple-touch-icon.png", "./assets/anatomia-corporal.svg", "./assets/css/01-base.css", "./assets/css/02-componentes.css", "./assets/css/03-aparencia.css", "./assets/css/04-responsivo.css", "./assets/css/05-programas.css", "./assets/css/06-identidade-calendarios.css", "./assets/js/pdf-exportacao.js", "./assets/js/nucleo-app.js", "./assets/js/pdf-importacao.js", "./assets/js/evolucao.js", "./assets/js/cobrancas.js", "./assets/js/navegacao.js", "./assets/js/acessibilidade.js", "./assets/js/precos-servicos.js", "./assets/js/meus-programas.js"];
const scopeURL=self.registration.scope;
const normalized=path=>new URL(path,scopeURL);
const isMedia=url=>/\/media\/(thumbs|steps)\/[a-zA-Z0-9_.-]+\.(webp|gif|png|jpg)$/.test(url.pathname);
const isShell=url=>SHELL_FILES.some(p=>normalized(p).href===url.href);
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_SHELL).then(cache=>cache.addAll(SHELL_FILES.map(path=>normalized(path).href))));
 // Não assumir controle automaticamente durante um treino ativo.
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
   for(const key of await caches.keys()){
     if(key.startsWith(CACHE_PREFIX)&&key!==CACHE_SHELL&&key!==CACHE_MEDIA)await caches.delete(key);
   }
   await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.href.startsWith(scopeURL))return;
 if(request.mode==='navigate'){
   event.respondWith((async()=>{
     try{const fresh=await fetch(request);if(fresh.ok){const c=await caches.open(CACHE_SHELL);await c.put(normalized('./index.html'),fresh.clone());}return fresh;}
     catch{const c=await caches.open(CACHE_SHELL);return await c.match(normalized('./index.html'))||Response.error();}
   })());return;
 }
 if(isMedia(url)){
   event.respondWith((async()=>{
     const c=await caches.open(CACHE_MEDIA);
     const existing=await c.match(request);if(existing)return existing;
     const response=await fetch(request);
     if(response.ok)await c.put(request,response.clone());
     return response;
   })());return;
 }
 if(isShell(url)){
   event.respondWith((async()=>{
     const c=await caches.open(CACHE_SHELL);
     const existing=await c.match(request);
     if(existing)return existing;
     const response=await fetch(request);
     if(response.ok)await c.put(request,response.clone());
     return response;
   })());
 }
});
