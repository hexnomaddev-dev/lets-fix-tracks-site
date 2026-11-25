import { readdir, lstat, access } from 'node:fs/promises';
import { join } from 'node:path';
import { readOfficialDailyPackageDirectory } from './daily-package.mjs';
const exists=path=>access(path).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
async function walk(path,parts=[]) {
  if(!(await exists(path)))return;
  if(!(await lstat(path)).isDirectory())throw new Error('Archive path is not a real directory.');
  for(const entry of await readdir(path,{withFileTypes:true})){
    if(parts.length<2){
      if(!entry.isDirectory()||!(parts.length===0?/^\d{4}$/:/^\d{2}$/).test(entry.name))throw new Error('Invalid archive directory.');
      await walk(join(path,entry.name),[...parts,entry.name]);
    }else{
      if(!entry.isDirectory()||!/^\d{2}$/.test(entry.name))throw new Error('Invalid archive date.');
      const result=await readOfficialDailyPackageDirectory(join(path,entry.name));
      if(!result.ok)throw new Error(result.errors.join('\n'));
      if(JSON.parse(result.files.get('manifest.json')).date!==[...parts,entry.name].join('-'))throw new Error('Archive folder and manifest date differ.');
    }
  }
}
await walk('daily-puzzles');
if(process.argv.includes('--artifact'))for(const path of ['daily-publish-queue','daily-publisher','daily-publish-config.json','.daily-publisher-lock.json','.github'])if(await exists(join('dist',path)))throw new Error('Private-to-Pages publishing data leaked into artifact: '+path);
console.log('Archive validation passed; pending queue excluded from artifact.');
