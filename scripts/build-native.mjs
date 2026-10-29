import {build} from 'esbuild';
await build({entryPoints:['native-entry.js'],bundle:true,format:'esm',outfile:'dist/native.js',minify:true});

import {cp,mkdir,rm} from 'node:fs/promises';
await rm('native-dist',{recursive:true,force:true});await mkdir('native-dist',{recursive:true});
await cp('dist','native-dist',{recursive:true,filter:src=>!src.split('/').includes('media')});
