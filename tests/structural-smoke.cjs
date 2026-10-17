#!/usr/bin/env node
// Testes estruturais sem dependências externas; não substituem testes no navegador.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),sw=read('sw.js');
const cssRefs=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="\.\/([^"]+)"/g)].map(m=>m[1]);
const jsRefs=[...html.matchAll(/<script\b[^>]*\bsrc="\.\/([^"]+)"[^>]*>/g)].map(m=>m[1]);
assert(cssRefs.length>=3,'CSS modular não carregado');
assert(jsRefs.length>=8,'JavaScript modular incompleto');
assert(!/<style\b/i.test(html),'Estilos inline ainda presentes');
assert(/<html\b/i.test(html)&&/<\/html>/i.test(html),'HTML incompleto');
const files=[...new Set([...cssRefs,...jsRefs])];
for(const file of files){
  assert(!file.includes('..'),'Referência de caminho insegura');
  const contents=read(file);
  assert(contents.trim(),'Arquivo vazio: '+file);
  assert(sw.includes('./'+file),'Arquivo ausente no precache: '+file);
  if(file.endsWith('.js'))new vm.Script(contents,{filename:file});
}
assert(sw.includes('CACHE_SHELL'),'Service Worker sem cache shell');
console.log('PASSOU: '+cssRefs.length+' CSS, '+jsRefs.length+' JS, sintaxe e precache.');
console.log('PENDENTE: testes funcionais, offline real, backup/restauração e Android.');
