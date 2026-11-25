import { mkdtemp, writeFile, rm, appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { PublisherRepository } from './publisher-repository.mjs';
import { PACKAGE_NAMES, digest, jsonBytes, archiveDirectory, decryptPackage, dueRegistrations, assertDate, checkedPackage } from './publisher-batch.mjs';
import { resumeDailyPublication } from './daily-publish.mjs';
import { publicationRecoveryHistory, publicationFailureState, publicationSuccessState, ControlledPublicationInterruption, publicationFailureSummary, publicationFailureAnnotation } from '../src/platform/publicationRecovery.mjs';

export function proveArchive(repo,ref,source) {
  const prefix=archiveDirectory(source.date), paths=repo.paths(ref,prefix);
  if(!paths.length)return null;
  if([...paths].sort().join('\n')!==PACKAGE_NAMES.map(n=>prefix+'/'+n).sort().join('\n'))throw new Error('Existing archive date is incomplete or contains extra files.');
  for(const name of PACKAGE_NAMES)if(!repo.bytes(ref,prefix+'/'+name)?.equals(source.files.get(name)))throw new Error('Existing archive conflicts with approved bytes.');
  const commit=repo.g(['log','-1','--format=%H',ref,'--',prefix]).trim();
  const parents=repo.g(['rev-list','--parents','-n','1',commit]).trim().split(/\s+/);
  const changes=repo.g(['diff-tree','--no-commit-id','--name-status','-r',commit]).trim().split('\n');
  if(parents.length!==2||changes.length!==5||changes.some(p=>!p.startsWith('A\t'))||changes.map(p=>p.slice(2)).sort().join('\n')!==[...paths].sort().join('\n'))throw new Error('Archive was not introduced by an exclusive five-file commit.');
  for(const name of PACKAGE_NAMES)if(!repo.bytes(commit,prefix+'/'+name)?.equals(source.files.get(name)))throw new Error('Original archive bytes changed.');
  return commit;
}
export async function verifyScheduledHttps(repo,source,{fetchImpl=fetch,wait=delay,attempts=8}={}) {
  const url=new URL(archiveDirectory(source.date)+'/',repo.config.baseUrl);
  for(let attempt=0;attempt<attempts;attempt++) {
    try {
      const checksums={};
      for(const name of PACKAGE_NAMES) {
        const response=await fetchImpl(new URL(name,url),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
        if(!response.ok){await response.body?.cancel();throw new Error('Public HTTPS returned '+response.status+' for '+name);}
        const bytes=Buffer.from(await response.arrayBuffer());
        if(!bytes.equals(source.files.get(name)))throw new Error('Public HTTPS bytes differ for '+name);
        checksums[name]=digest(bytes);
      }
      return {url:String(new URL('manifest.json',url)),checksums};
    } catch(error) { if(attempt===attempts-1)throw error;await wait(5000); }
  }
}
export async function waitScheduledDeployment(repo,source,state,save,{wait=delay,timeout=20*60_000}={}) {
  let intent=state.deploymentIntent;
  let runs=repo.api('actions/workflows/'+repo.config.pagesWorkflow+'/runs?event=workflow_dispatch&branch=main&per_page=100').workflow_runs;
  let run=intent&&runs.find(r=>r.display_title==='GitHub Pages · '+intent.correlation);
  if(run?.status==='completed'&&run.conclusion!=='success'){run=null;intent=null;}
  if(!intent) {
    intent={correlation:randomUUID(),requestedAt:new Date().toISOString()};
    await save('DEPLOYMENT_PENDING',{deploymentIntent:intent});
  }
  if(!run) {
    repo.api('actions/workflows/'+repo.config.pagesWorkflow+'/dispatches',{method:'POST',data:{ref:'main',inputs:{publication_correlation:intent.correlation}}});
  }
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline) {
    runs=repo.api('actions/workflows/'+repo.config.pagesWorkflow+'/runs?event=workflow_dispatch&branch=main&per_page=100').workflow_runs;
    run=runs.find(r=>r.display_title==='GitHub Pages · '+intent.correlation);
    if(run?.status==='completed') {
      if(run.conclusion!=='success')throw new Error('Pages deployment '+run.conclusion+': '+run.html_url);
      if(!proveArchive(repo,run.head_sha,source))throw new Error('Deployment does not contain the approved archive.');
      return {status:'success',url:run.html_url,runId:run.id,commit:run.head_sha,completedAt:run.updated_at};
    }
    await wait(5000);
  }
  throw new Error('Pages deployment remains pending; retry will reconcile the existing workflow run.');
}

/** Existing five-file publication state machine, with a scheduled repository adapter. */
export async function releaseDuePackages(repo,{today=new Date().toISOString().slice(0,10),keyring,deploy=waitScheduledDeployment,verify=verifyScheduledHttps,checkpoint=async()=>{},absent}={}) {
  assertDate(today);const ref=repo.fetch();repo.assertOwner(ref);
  const registrations=repo.paths(ref,'daily-publish-queue/batches').map(path=>repo.json(ref,path));
  const due=dueRegistrations(registrations,today),completed=[];
  for(const entry of due) {
    const statePath='daily-publish-queue/state/'+entry.date+'.json';
    const receiptPath='daily-publish-queue/receipts/'+entry.date+'.json';
    let head=repo.fetch();repo.assertOwner(head);
    const previous=repo.json(head,statePath);
    let state={...previous,recoveryHistory:publicationRecoveryHistory(previous),date:entry.date,packageId:entry.packageId,batchId:entry.batchId,mode:'scheduled',
      schedulerRunId:/^actions-\d+$/.test(repo.owner||'')?Number(repo.owner.slice(8)):null};
    const save=async(phase,details={})=>{
      state={...state,...details,state:phase,updatedAt:new Date().toISOString()};
      // The shared pipeline checkpoints a prepared, unpushed commit. Advancing
      // main here would invalidate that commit's parent and its fenced push.
      if(!(phase==='PUBLISHING'&&details.commit))repo.mutate(new Map([[statePath,jsonBytes(state)]]),'Daily release '+entry.date+': '+phase);
      await checkpoint(phase,entry,state);
    };
    let directory;
    try {
    const bytes=repo.bytes(head,entry.path);
    if(!bytes||digest(bytes)!==entry.sha256)throw new Error('Pending encrypted file checksum mismatch.');
    const envelope=JSON.parse(bytes);
    if(envelope.date!==entry.date||envelope.packageId!==entry.packageId)throw new Error('Pending envelope identity mismatch.');
    const receipt=repo.json(head,receiptPath);
    const files=receipt?checkedPackage(new Map(PACKAGE_NAMES.map(n=>[n,repo.bytes(head,archiveDirectory(entry.date)+'/'+n)])),entry.date,entry.packageId):decryptPackage(envelope,keyring);
    const source={date:entry.date,files};
    if(receipt) {
      if(receipt.packageId!==entry.packageId||receipt.state!=='PUBLISHED_VERIFIED'||receipt.deployment?.status!=='success'||PACKAGE_NAMES.some(n=>receipt.checksums?.[n]!==digest(files.get(n)))||receipt.commit!==proveArchive(repo,head,source)||!receipt.verifiedAt)throw new Error('Historical release receipt conflicts; investigation required.');
      continue;
    }
      directory=await mkdtemp(join(tmpdir(),'lft-approved-'));
      for(const [name,value] of files)await writeFile(join(directory,name),value,{flag:'wx',mode:0o600});
      let publicProof;
      const transport={
        inspect:async()=>{const head=repo.fetch();repo.assertOwner(head);const commit=proveArchive(repo,head,source);return commit?{commit,remote:true}:null;},
        prepare:async()=>{
          const head=repo.fetch();repo.assertOwner(head);
          // Require genuine public absence before first release; temporary errors stop safely.
          if(absent)await absent(source);
          else for(const name of PACKAGE_NAMES){const response=await fetch(new URL(archiveDirectory(entry.date)+'/'+name,repo.config.baseUrl),{redirect:'error',signal:AbortSignal.timeout(20000)});await response.body?.cancel();if(response.status!==404)throw new Error('Expected unpublished HTTP 404 for '+name+'; got '+response.status);}
          return repo.commit(head,new Map(PACKAGE_NAMES.map(n=>[archiveDirectory(entry.date)+'/'+n,files.get(n)])),'Publish official Daily Puzzles for '+entry.date);
        },
        push:async commit=>{repo.assertOwner(repo.fetch());repo.push(commit);await checkpoint('AFTER_PUSH',entry,state);},
        deployment:async()=>deploy(repo,source,state,save),
        verify:async()=>{publicProof=await verify(repo,source);return publicProof.url;},
      };
      const result=await resumeDailyPublication(directory,repo.root,{transport,checkpoint:save,retryDeployment:true});
      await checkpoint('AFTER_VERIFY',entry,state);
      const record=publicationSuccessState({...state,...result,checksums:publicProof.checksums,state:'PUBLISHED_VERIFIED',publishedAt:result.deployment.completedAt||result.verifiedAt});
      repo.mutate(new Map([[receiptPath,jsonBytes(record)]]),'Verify scheduled Daily Puzzles for '+entry.date,{immutable:true});
      await save('PUBLISHED_VERIFIED',record);completed.push(record);
    } catch(error) {
      await save('FAILED',publicationFailureState(state,error,{at:new Date().toISOString()}));
      throw error;
    } finally { if(directory)await rm(directory,{recursive:true,force:true}); }
  }
  return completed;
}
async function main() {
  const repo=new PublisherRepository(resolve('.'));
  if(process.env.GITHUB_REPOSITORY!==repo.config.repository||process.env.GITHUB_REF!=='refs/heads/main')throw new Error('Scheduled publishing is restricted to the intended default branch.');
  const override=process.env.LFT_TEST_UTC_DATE;
  if(override && (!repo.config.testOnly||!/^2199-/.test(override)))throw new Error('Clock overrides are restricted to disposable test repositories and 2199 dates.');
  let keyring;
  try{keyring=JSON.parse(process.env.DAILY_QUEUE_PRIVATE_KEYS||'{}');}catch{throw new Error('Invalid decryption secret configuration.');}
  delete process.env.DAILY_QUEUE_PRIVATE_KEYS;
  const owner='actions-'+process.env.GITHUB_RUN_ID;
  await repo.acquire({owner,kind:'actions',runId:process.env.GITHUB_RUN_ID});
  try {
    const fault=process.env.LFT_TEST_FAILURE;
    if(fault&&!repo.config.testOnly)throw new Error('Fault injection is restricted to disposable repositories.');
    const results=await releaseDuePackages(repo,{today:override||undefined,keyring,checkpoint:async(phase,entry)=>{
      if(fault===entry.date+':'+phase)throw new ControlledPublicationInterruption(entry.date,phase);
    }});
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,'### Daily release complete\n'+results.map(r=>'- '+r.date+' · '+r.commit+' · five HTTPS files verified').join('\n')+'\n');
  } catch(error) {
    if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,publicationFailureSummary(error));
    throw error;
  } finally {await repo.release();}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(publicationFailureAnnotation(error));process.exitCode=1;});
