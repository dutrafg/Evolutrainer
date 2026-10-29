import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {verifyGif,packageItems,MediaDownloads,createMediaFetcher} from '../dist/media-manager.js';
const bytes=new Uint8Array(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64'));
const sha=createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex');
const manifest={downloadBase:'https://example.test/',items:[{id:1,sha},{id:2,sha},{id:3,sha:'0'.repeat(40)}]};
const catalog={exercises:[{externalId:1,muscle:'Peitoral'},{externalId:2,muscle:'Costas'},{externalId:3,muscle:'Costas'}]};
function storage(){const data=new Map();return {data,has:async s=>data.has(s),put:async(s,b)=>data.set(s,b),remove:async s=>data.delete(s)};}
test('integridade rejeita HTML, GIF adulterado e aceita arquivo correto',async()=>{assert.equal((await verifyGif(bytes,sha)).length,bytes.length);await assert.rejects(()=>verifyGif(new TextEncoder().encode('<html>login'),sha));await assert.rejects(()=>verifyGif(bytes,'0'.repeat(40)));});
test('pacotes filtram grupo e evitam download duplicado de arquivo reutilizado',()=>{assert.equal(packageItems(manifest,catalog).length,2);assert.equal(packageItems(manifest,catalog,'Peitoral').length,1);assert.equal(packageItems(manifest,catalog,'Costas').length,2);});
test('download valida antes de gravar e retoma sem baixar arquivos concluídos',async()=>{const st=storage();let calls=0;const m=new MediaDownloads({manifest,catalog,storage:st,fetcher:async()=>{calls++;return new Response(bytes);}});await m.download('Peitoral');assert.equal(st.data.size,1);await m.download('Peitoral');assert.equal(calls,1);await m.download('Costas');assert.equal(st.data.size,1);assert.match(m.status,/integridade/);});
test('pausa interrompe o arquivo atual e permite retomada posterior',async()=>{const st=storage();let m;const fetcher=async()=>{m.pause();return new Response(bytes);};m=new MediaDownloads({manifest,catalog,storage:st,fetcher});await m.download('Peitoral');assert.equal(st.data.size,0);assert.match(m.status,/pausado/);m.fetcher=async()=>new Response(bytes);await m.download('Peitoral');assert.equal(st.data.size,1);await m.remove('Peitoral');assert.equal(st.data.size,0);});

test('download padrão conserva o contexto global exigido pelo fetch do navegador',async()=>{
 const original=globalThis.fetch;const st=storage();
 globalThis.fetch=async function(){assert.equal(this,globalThis,'fetch recebeu contexto inválido');return new Response(bytes);};
 try{const m=new MediaDownloads({manifest,catalog,storage:st});await m.download('Peitoral');assert.equal(st.data.size,1);assert.equal(m.status,'Pacote disponível offline.');}finally{globalThis.fetch=original;}
});

test('transporte nativo converte base64 sem alterar bytes e mantém contexto da ponte',async()=>{
 const bridge={isNative:true,async mediaFetch(url){assert.equal(this,bridge);assert.match(url,/\.gif$/);return {status:200,data:Buffer.from(bytes).toString('base64')};}};
 const f=createMediaFetcher(bridge);const r=await f('https://example.test/a.gif');assert.equal(r.ok,true);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);
});
test('transporte nativo preserva status HTTP e respeita pausa antes de salvar',async()=>{
 const c=new AbortController(),f=createMediaFetcher({isNative:true,mediaFetch:async()=>({status:403,data:null})});
 const r=await f('https://example.test/a.gif');assert.equal(r.ok,false);assert.equal(r.status,403);c.abort();await assert.rejects(()=>f('https://example.test/a.gif',{signal:c.signal}),{name:'AbortError'});
});

test('transporte web usa mídia na mesma origem e evita dependência de CORS externo',async()=>{
 const oldFetch=globalThis.fetch,oldLocation=globalThis.location;
 globalThis.location={href:'https://app.example/'};globalThis.fetch=async function(url){assert.equal(this,globalThis);assert.equal(url,'https://app.example/media/'+sha+'.gif');return new Response(bytes);};
 try{const r=await createMediaFetcher()('https://media.example/media/'+sha+'.gif');assert.equal(r.ok,true);}finally{globalThis.fetch=oldFetch;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});
