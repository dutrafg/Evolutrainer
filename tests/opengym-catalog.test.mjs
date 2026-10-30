import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {emptyState,validate} from '../dist/domain.js';
import {importOpenGymText} from '../dist/gym-tools.js';

globalThis.crypto ||= webcrypto;
const raw=JSON.parse(readFileSync(new URL('../dist/catalog-open-gym.json',import.meta.url),'utf8'));

test('catálogo brasileiro possui 5632 nomes e não contém mídia ou endereços de mídia',()=>{
  assert.equal(raw.length,5632);
  assert.equal(new Set(raw.map(x=>x.id)).size,5632);
  assert.equal(raw.filter(x=>x.instructions.length).length,1324);
  for(const row of raw){
    assert.ok(typeof row.name==='string' && row.name.trim().length>=2);
    assert.ok(!('img' in row) && !('gif' in row) && !('media' in row));
    assert.ok(!('url' in row) && !('video' in row));
    assert.ok(Array.isArray(row.instructions));
  }
});
test('importação completa é validada na base atual e preserva identificadores',()=>{
  const state=emptyState();
  const result=importOpenGymText(state,raw);
  assert.ok(result.added>=5500);
  assert.equal(result.added+result.ignored,5632);
  assert.ok(state.exercises.every(x=>x.id.startsWith('og_')));
  assert.doesNotThrow(()=>validate(state));
});
