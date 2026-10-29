const CACHE='evolupersonal-pwa-shell-0.1.0-beta.7';
const FILES=['./','./index.html','./student.html','./beta.js','./beta-domain.js','./native.js','./media-manager.js','./catalog.json','./media-manifest.json','./styles.css','./app.js','./domain.js','./storage.js','./backup.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{
 for(const path of FILES){const response=await fetch(new Request(path,{cache:'reload'}));if(!response.ok||response.redirected)throw new Error('Instalação offline incompleta');await cache.put(path,response);}
})));
self.addEventListener('message',event=>{if(event.data?.type==='APPLY_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('evolupersonal-pwa-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const allowed=new Set(FILES.map(x=>new URL(x,self.registration.scope).pathname));if(!allowed.has(url.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(url.pathname)||await fetch(event.request);})());
});

