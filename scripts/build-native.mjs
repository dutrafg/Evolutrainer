import {build} from 'esbuild';
await build({entryPoints:['native-entry.js'],bundle:true,format:'esm',outfile:'dist/native.js',minify:true});
