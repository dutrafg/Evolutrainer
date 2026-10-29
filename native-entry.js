import {Capacitor} from '@capacitor/core';
import {LocalNotifications} from '@capacitor/local-notifications';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
window.NativeBridge={
 isNative:Capacitor.isNativePlatform(),
 async saveFile(name,text){const result=await Filesystem.writeFile({path:name,data:text,directory:Directory.Cache,encoding:Encoding.UTF8});await Share.share({title:'EvoluPersonal — arquivo',url:result.uri,dialogTitle:'Salvar ou compartilhar'});},
 async schedule(id,title,body,at){let permission=await LocalNotifications.checkPermissions();if(permission.display!=='granted')permission=await LocalNotifications.requestPermissions();if(permission.display!=='granted')throw new Error('Permissão de notificações não concedida.');await LocalNotifications.schedule({notifications:[{id,title,body,schedule:{at:new Date(at)},channelId:'evolupersonal-agenda'}]});},
 async cancel(id){await LocalNotifications.cancel({notifications:[{id}]});}
};
if(Capacitor.isNativePlatform())LocalNotifications.createChannel({id:'evolupersonal-agenda',name:'Agenda e treinos',importance:4,visibility:0}).catch(()=>{});
