import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
window.NativeBridge={
 isNative:Capacitor.isNativePlatform(),
 async mediaFetch(url){const u=new URL(url);if(u.origin!=='https://evolupersonal-biblioteca-download.chirpyzebra12.chatgpt.site'||!/^\/media\/[a-f0-9]{40}\.gif$/.test(u.pathname))throw new Error('Endereço de mídia inválido.');const r=await CapacitorHttp.get({url:u.href,responseType:'arraybuffer',headers:{'Accept':'image/gif','x-cap-user-agent':navigator.userAgent},connectTimeout:20000,readTimeout:30000});if(r.status<200||r.status>=300)return {status:r.status,data:null};if(typeof r.data!=='string')throw new Error('Resposta de mídia inválida.');return {status:r.status,data:r.data};},
 async mediaHas(sha){if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Mídia inválida.');try{await Filesystem.stat({path:'exercise-media/'+sha+'.gif',directory:Directory.Data});return true;}catch{return false;}},
 async mediaPut(sha,bytes){if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Mídia inválida.');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const path='exercise-media/'+sha+'.gif';await Filesystem.writeFile({path:path+'.tmp',data:btoa(binary),directory:Directory.Data,recursive:true});await Filesystem.rename({from:path+'.tmp',to:path,directory:Directory.Data});},
 async mediaRemove(sha){if(!/^[a-f0-9]{40}$/.test(sha))throw new Error('Mídia inválida.');try{await Filesystem.deleteFile({path:'exercise-media/'+sha+'.gif',directory:Directory.Data});}catch(e){if(await this.mediaHas(sha))throw e;}},
 async mediaUrl(sha){if(!await this.mediaHas(sha))return null;const r=await Filesystem.getUri({path:'exercise-media/'+sha+'.gif',directory:Directory.Data});return Capacitor.convertFileSrc(r.uri);},
 async mediaSize(){try{const r=await Filesystem.readdir({path:'exercise-media',directory:Directory.Data});const files=r.files.filter(x=>/^[a-f0-9]{40}\.gif$/.test(x.name));return {count:files.length,bytes:files.reduce((n,f)=>n+f.size,0)};}catch{return {count:0,bytes:0};}},
 async saveFile(name,text){const result=await Filesystem.writeFile({path:name,data:text,directory:Directory.Cache,encoding:Encoding.UTF8});await Share.share({title:'EvoluPersonal — arquivo',url:result.uri,dialogTitle:'Salvar ou compartilhar'});},
 async schedule(id,title,body,at){let permission=await LocalNotifications.checkPermissions();if(permission.display!=='granted')permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted')throw new Error('Permissão de notificações não concedida.');await LocalNotifications.schedule({notifications:[{id,title,body,schedule:{at:new Date(at)},channelId:'evolupersonal-agenda'}]});},
 async cancel(id){await LocalNotifications.cancel({notifications:[{id}]});}
};
if(Capacitor.isNativePlatform())LocalNotifications.createChannel({id:'evolupersonal-agenda',name:'Agenda e treinos',importance:4,visibility:0}).catch(()=>{});
