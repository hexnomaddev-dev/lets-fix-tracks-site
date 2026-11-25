import { execFileSync } from 'node:child_process';
import { realpathSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { jsonBytes } from './publisher-batch.mjs';

const git=process.platform==='win32'?'C:/Program Files/Git/cmd/git.exe':'git';
const gh=process.platform==='win32'?'C:/Program Files/GitHub CLI/gh.exe':'gh';
const LOCK='.daily-publisher-lock.json';
export class PublisherRepository {
  constructor(root,{testRemote,clock=()=>new Date()}={}) {
    this.root=realpathSync(root);this.clock=clock;this.testRemote=testRemote;
    this.config=JSON.parse(this.g(['show','HEAD:daily-publish-config.json']));
    const c=this.config;
    if(c.format!=='lft.publisher-config'||c.version!==1||c.branch!=='main'||!/^[-\w]+\/[-\w]+$/.test(c.repository)||c.pagesWorkflow!=='pages.yml')throw new Error('Unsupported Publisher configuration.');
    const official=c.repository==='hexnomaddev-dev/lets-fix-tracks-site';
    const disposable=/^hexnomaddev-dev\/lft-batch-live-test-[a-z0-9-]+$/.test(c.repository)&&c.testOnly===true;
    if(!official&&!disposable&&!testRemote)throw new Error('Publisher repository is not an authorized target.');
    if(official&&c.testOnly)throw new Error('Production cannot enable a test clock.');
    if(c.baseUrl!==`https://${c.repository.split('/')[0]}.github.io/${c.repository.split('/')[1]}/`&&!testRemote)throw new Error('Unexpected Pages URL.');
    for(const args of [['remote','get-url','origin'],['remote','get-url','--push','origin']]) {
      const actual=this.g(args).trim();
      if(testRemote?realpathSync(actual)!==realpathSync(testRemote):!['https://github.com/'+c.repository+'.git','https://github.com/'+c.repository,'git@github.com:'+c.repository+'.git'].includes(actual))throw new Error('Repository origin differs from trusted configuration.');
    }
    if(this.g(['branch','--show-current']).trim()!==c.branch)throw new Error('Publisher requires the main checkout.');
  }
  g(args,{input,encoding='utf8',env={}}={}) { return execFileSync(git,['-c','core.longpaths=true',...args],{cwd:this.root,encoding,input,env:{...process.env,...env},windowsHide:true,stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024}); }
  api(endpoint,{method='GET',data}={}) {
    const args=['api','--method',method,'repos/'+this.config.repository+'/'+endpoint];
    if(data)args.push('--input','-');
    const raw=execFileSync(gh,args,{cwd:this.root,encoding:'utf8',input:data?JSON.stringify(data):undefined,windowsHide:true,stdio:['pipe','pipe','pipe']});
    return raw.trim()?JSON.parse(raw):null;
  }
  fetch() { this.g(['fetch','--no-tags','origin',this.config.branch]);return this.g(['rev-parse','FETCH_HEAD']).trim(); }
  bytes(ref,path) {
    const line=this.g(['ls-tree',ref,'--',path]).trim();if(!line)return null;
    if(!/^100644 blob [a-f0-9]{40}\t/.test(line)||line.split('\t')[1]!==path)throw new Error('Expected a regular repository file: '+path);
    // Avoid Git for Windows probing revision:path as an overlong filesystem path.
    const blob=line.match(/^100644 blob ([a-f0-9]{40})\t/)[1];
    return this.g(['cat-file','blob',blob],{encoding:'buffer'});
  }
  json(ref,path) { const value=this.bytes(ref,path);return value?JSON.parse(value):null; }
  paths(ref,prefix) { return this.g(['ls-tree','-r','--name-only',ref,'--',prefix]).trim().split('\n').filter(Boolean); }
  // An isolated index never stages, overwrites or resets the user's checkout.
  commit(parent,files,message) {
    const index=join(this.g(['rev-parse','--absolute-git-dir']).trim(),'lft-index-'+randomUUID());const env={GIT_INDEX_FILE:index};
    try {
      this.g(['read-tree',parent],{env});
      for(const [path,bytes] of files) {
        if(!/^(?:daily-publish-queue\/(?:packages|batches|state|receipts)\/[-a-zA-Z0-9_/.]+|daily-puzzles\/\d{4}\/\d{2}\/\d{2}\/(?:easy|medium|hard|expert|manifest)\.json|\.daily-publisher-lock\.json)$/.test(path)||path.split('/').includes('..'))throw new Error('Disallowed Publisher path.');
        const blob=this.g(['hash-object','-w','--stdin'],{input:bytes}).trim();
        this.g(['update-index','--add','--cacheinfo','100644',blob,path],{env});
      }
      const tree=this.g(['write-tree'],{env}).trim();
      return this.g(['commit-tree',tree,'-p',parent],{input:message+'\n'}).trim();
    } finally { if(existsSync(index))unlinkSync(index); }
  }
  push(commit) { this.g(['push','origin',commit+':refs/heads/'+this.config.branch]); }
  assertOwner(ref) { const lock=this.json(ref,LOCK);if(!this.owner||lock?.owner!==this.owner||Date.parse(lock.expiresAt)<=this.clock().getTime())throw new Error('Repository lock lost; stop and reconcile.'); }
  async acquire({owner=randomUUID(),kind='native',runId=null}={}) {
    const head=this.fetch(), prior=this.json(head,LOCK),now=this.clock().getTime();
    if(prior&&(prior.format!=='lft.publisher-lock'||prior.version!==1||!(prior.owner===null||typeof prior.owner==='string')||
      prior.owner&&(!['native','actions'].includes(prior.kind)||!Number.isFinite(Date.parse(prior.expiresAt)))))throw new Error('Remote lock state is invalid; investigation required.');
    if(JSON.stringify(this.json(head,'daily-publish-config.json'))!==JSON.stringify(this.config))throw new Error('Remote Publisher configuration changed. Update the checkout before retrying.');
    const changes=this.g(['log','--first-parent','--full-history','--diff-merges=first-parent','--format=','--name-status','--no-renames',head,'--','daily-puzzles/','daily-publish-queue/packages/','daily-publish-queue/batches/','daily-publish-queue/receipts/']).trim().split('\n').filter(Boolean);
    if(changes.some(line=>!line.startsWith('A\t')))throw new Error('Append-only publication history was modified; investigation required.');
    if(!this.testRemote){
      const pages=this.api('pages');
      if(pages.build_type!=='workflow'||pages.html_url?.replace(/\/?$/,'/')!==this.config.baseUrl||pages.https_enforced!==true)throw new Error('GitHub Pages configuration differs from the intended HTTPS target.');
    }
    if(prior?.owner&&prior.owner!==owner) {
      let finished=false;
      if(prior.kind==='actions'&&/^\d+$/.test(String(prior.runId)))finished=this.api('actions/runs/'+prior.runId)?.status==='completed';
      if(!finished&&Date.parse(prior.expiresAt)>now)throw new Error('Another publication owns the repository lock. Retry after it finishes.');
      if(prior.kind==='actions'&&!finished&&!this.testRemote)throw new Error('Expired Actions lock still has an active run; investigation required.');
    }
    const lock={format:'lft.publisher-lock',version:1,owner,kind,runId,expiresAt:new Date(now+2*60*60*1000).toISOString()};
    const commit=this.commit(head,new Map([[LOCK,jsonBytes(lock)]]),'Acquire Daily Publisher lock');this.push(commit);this.owner=owner;return commit;
  }
  async release() {
    const head=this.fetch();this.assertOwner(head);
    this.push(this.commit(head,new Map([[LOCK,jsonBytes({format:'lft.publisher-lock',version:1,owner:null,releasedAt:this.clock().toISOString()})]]),'Release Daily Publisher lock'));
    this.owner=null;
  }
  mutate(files,message,{immutable=false}={}) {
    const head=this.fetch();this.assertOwner(head);let changed=false;
    for(const [path,bytes] of files) {
      const existing=this.bytes(head,path);
      if(existing?.equals(bytes))continue;
      if(existing&&immutable)throw new Error('Immutable remote path conflicts: '+path);
      changed=true;
    }
    if(!changed)return head;
    const commit=this.commit(head,files,message);this.push(commit);return commit;
  }
  syncCheckout() {
    if(this.g(['status','--porcelain=v1','--untracked-files=all']).trim())throw new Error('Website checkout has changes; preserve and inspect them before publishing.');
    const head=this.fetch();this.g(['merge','--ff-only',head]);
  }
}
