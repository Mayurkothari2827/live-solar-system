import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
execFileSync('python3',['build_static.py'],{stdio:'inherit'});
fs.rmSync('native-public',{recursive:true,force:true});fs.mkdirSync('native-public',{recursive:true});
for(const file of fs.readdirSync('public'))if(fs.statSync(path.join('public',file)).isFile()&&!['sw.js'].includes(file))fs.copyFileSync(path.join('public',file),path.join('native-public',file));
fs.mkdirSync('native-public/assets',{recursive:true});
for(const file of ['science-atlas.json','three.min.js','texture-manifest.json','solar-directory.json','planet-properties.json','credits.json'])fs.copyFileSync('assets/'+file,'native-public/assets/'+file);
for(const dir of ['optimized','icons','space'])fs.cpSync('assets/'+dir,'native-public/assets/'+dir,{recursive:true});
for(const file of fs.readdirSync('assets'))if(file.endsWith('.license'))fs.copyFileSync('assets/'+file,'native-public/assets/'+file);
// Preserve legal attributions for the bundled texture derivatives.
fs.cpSync('LICENSES','native-public/LICENSES',{recursive:true});
for(const file of ['CELESTIA-LICENSE.md','CELESTIA-README','CELESTIA-REUSE.toml'])fs.copyFileSync(file,'native-public/'+file);
await build({entryPoints:['native/bridge.js'],bundle:true,format:'iife',target:['es2020'],outfile:'native-public/native-bridge.js',minify:true});
for(const page of ['index.html','space.html']){const file='native-public/'+page;const html=fs.readFileSync(file,'utf8').replace('<script src="/orbit-store.js">','<script src="/native-bridge.js"></script><script src="/orbit-store.js">');fs.writeFileSync(file,html);}
console.log('Bundled native app prepared. No remote server.url; backend requests are explicit HTTPS API calls.');
