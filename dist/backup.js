import {validate} from './domain.js';
import {migrate} from './beta-domain.js';
const encode=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function key(password,salt) {
 if(password.length<8)throw new Error('Use uma senha com pelo menos 8 caracteres.');
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function exportBackup(state,password) {
 validate(state);const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('EvoluPersonal-PWA:1')},await key(password,salt),new TextEncoder().encode(JSON.stringify(state)));
 return JSON.stringify({format:'EvoluPersonal-PWA',version:1,salt:encode(salt),iv:encode(iv),data:encode(new Uint8Array(encrypted))});
}
export async function importBackup(text,password) {
 if(text.length>10*1024*1024)throw new Error('O backup excede 10 MB.');
 try {
  const b=JSON.parse(text);if(b.format!=='EvoluPersonal-PWA'||b.version!==1)throw new Error();
  const salt=decode(b.salt),iv=decode(b.iv);if(salt.length!==16||iv.length!==12)throw new Error();
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('EvoluPersonal-PWA:1')},await key(password,salt),decode(b.data));
  return validate(migrate(JSON.parse(new TextDecoder().decode(plain))));
 } catch {throw new Error('Senha incorreta, arquivo corrompido ou backup incompatível. Os dados atuais foram preservados.');}
}
