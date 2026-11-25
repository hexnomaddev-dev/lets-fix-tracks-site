import { createHash, randomBytes, publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv, createPublicKey, constants } from 'node:crypto';
import { validateOfficialDailyPackage } from './daily-package.mjs';

export const PACKAGE_NAMES = Object.freeze(['easy.json','medium.json','hard.json','expert.json','manifest.json']);
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value,null,2)+'\n');
export function assertDate(date) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'') || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Invalid UTC release date.');
  return date;
}
export function packageId(files) { return digest(Buffer.from(PACKAGE_NAMES.map(name=>name+':'+digest(files.get(name))).join('\n'))); }
export function checkedPackage(files, date, id) {
  const result=validateOfficialDailyPackage(files);
  if(!result.ok)throw new Error(result.errors.join('\n'));
  if(JSON.parse(files.get('manifest.json')).date!==assertDate(date) || packageId(files)!==id)throw new Error('Approved package identity mismatch.');
  return files;
}
export function batchIdentity(packages) {
  const sorted=[...packages].sort((a,b)=>a.date.localeCompare(b.date));
  if(!sorted.length||sorted.length>31||new Set(sorted.map(p=>p.date)).size!==sorted.length)throw new Error('A batch must contain 1–31 unique UTC dates.');
  for(const p of sorted)if(!/^[a-f0-9]{64}$/.test(p.packageId)||!assertDate(p.date))throw new Error('Invalid package identity.');
  return digest(Buffer.from(sorted.map(p=>p.date+':'+p.packageId).join('\n')));
}
export function keyIdentity(publicKey) { return digest(createPublicKey(publicKey).export({type:'spki',format:'der'})); }
const aad = envelope => Buffer.from(['lft.encrypted-daily.v1',envelope.date,envelope.packageId,envelope.keyId].join('|'));
export function encryptPackage(files,date,publicKey) {
  if(typeof publicKey!=='string'||!publicKey.startsWith('-----BEGIN PUBLIC KEY-----')||createPublicKey(publicKey).asymmetricKeyType!=='rsa'||createPublicKey(publicKey).asymmetricKeyDetails.modulusLength<2048)throw new Error('Provision an RSA public encryption key before submitting a batch. Private keys belong only in Actions secrets.');
  const id=packageId(files);checkedPackage(files,date,id);
  const key=randomBytes(32),iv=randomBytes(12);
  const envelope={format:'lft.encrypted-daily',version:1,date,packageId:id,keyId:keyIdentity(publicKey)};
  try {
    const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad(envelope));
    const payload=jsonBytes(Object.fromEntries(PACKAGE_NAMES.map(name=>[name,files.get(name).toString('base64')])));
    const ciphertext=Buffer.concat([cipher.update(payload),cipher.final()]);
    return {...envelope,wrappedKey:publicEncrypt({key:publicKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},key).toString('base64'),
      iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
  } finally { key.fill(0); }
}
export function decryptPackage(envelope,keyring) {
  if(envelope.format!=='lft.encrypted-daily'||envelope.version!==1)throw new Error('Unsupported pending encryption format.');
  const privateKey=keyring[envelope.keyId];if(!privateKey)throw new Error('Pending package decryption key is unavailable.');
  const key=privateDecrypt({key:privateKey,oaepHash:'sha256',padding:constants.RSA_PKCS1_OAEP_PADDING},Buffer.from(envelope.wrappedKey,'base64'));
  try {
    const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAAD(aad(envelope));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
    const raw=JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8'));
    const files=new Map(Object.entries(raw).map(([name,value])=>[name,Buffer.from(value,'base64')]));
    return checkedPackage(files,envelope.date,envelope.packageId);
  } finally { key.fill(0); }
}
export function pendingPath(date,id) { assertDate(date);if(!/^[a-f0-9]{64}$/.test(id))throw new Error('Invalid package ID.');return 'daily-publish-queue/packages/'+date+'/'+id+'.json'; }
export function archiveDirectory(date) { return 'daily-puzzles/'+assertDate(date).replaceAll('-','/'); }
export function dueRegistrations(registrations, today) {
  assertDate(today);const dates=new Map();
  for(const batch of registrations){
    if(batch.format!=='lft.publisher-batch'||batch.version!==1||batch.batchId!==batchIdentity(batch.packages))throw new Error('Invalid batch registration.');
    if(!/^\d{4}-\d{2}-\d{2}T/.test(batch.createdAt)||Number.isNaN(Date.parse(batch.createdAt)))throw new Error('Invalid batch creation timestamp.');
    for(const entry of batch.packages){
      if(entry.date<batch.createdAt.slice(0,10)&&entry.backfill!==true)throw new Error('Historical backfill was not authorized.');
      if(entry.path!==pendingPath(entry.date,entry.packageId)||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid pending reference.');
      const prior=dates.get(entry.date);
      if(prior && (prior.batchId!==batch.batchId||prior.packageId!==entry.packageId||prior.sha256!==entry.sha256))throw new Error('Conflicting pending date; investigation required.');
      dates.set(entry.date,{...entry,batchId:batch.batchId,backfill:entry.backfill===true});
    }
  }
  return [...dates.values()].filter(p=>p.date<=today).sort((a,b)=>a.date.localeCompare(b.date));
}
