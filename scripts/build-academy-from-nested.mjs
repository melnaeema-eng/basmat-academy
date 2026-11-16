// Compatibility entry point for existing Cloudflare Pages projects whose
// configured root directory is basmat-academy/. Keep one canonical app at /src.
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {cpSync,mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const npm=process.platform==='win32'?'npm.cmd':'npm';
for(const args of [['ci','--ignore-scripts'],['run','build']]){
 const run=spawnSync(npm,args,{cwd:root,stdio:'inherit',env:process.env});
 if(run.error)throw run.error;
 if(run.status!==0)process.exit(run.status??1);
}
const target=path.join(root,'basmat-academy','dist');
rmSync(target,{recursive:true,force:true});
mkdirSync(target,{recursive:true});
cpSync(path.join(root,'dist'),target,{recursive:true});
console.log('Built canonical academy source and copied output to basmat-academy/dist');
