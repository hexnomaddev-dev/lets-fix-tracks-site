/** Publication metadata only. These views never mutate immutable receipts. */
export function publicationRecoveryHistory(...records) {
  const history=[];
  const add=event=>{
    if(!event||typeof event.error!=='string'||!event.error)return;
    const legacy=history.findIndex(item=>item.error===event.error&&item.phase===event.phase&&(!item.at||!event.at)&&(!item.schedulerRunId||!event.schedulerRunId||item.schedulerRunId===event.schedulerRunId));
    if(legacy!==-1){if(!history[legacy].at&&event.at)history[legacy]={...history[legacy],...event};return;}
    const key=JSON.stringify([event.at||null,event.schedulerRunId||null,event.phase||null,event.error]);
    if(!history.some(item=>JSON.stringify([item.at||null,item.schedulerRunId||null,item.phase||null,item.error])===key))history.push({...event});
  };
  for(const record of records.filter(Boolean)){
    for(const event of record.recoveryHistory||[])add(event);
    if(!record.error)continue;
    const match=/^Controlled (?:disposable test interruption|test interruption triggered) at ([A-Z_]+) for (\d{4}-\d{2}-\d{2})$/.exec(record.error);
    const at=record.failedAt||((record.state==='FAILED'?record.updatedAt:null))||null;
    const phase=record.failedPhase||null;
    // Legacy receipts kept the old error, but not its original failure timestamp.
    // Do not invent that time or duplicate an already-recorded failure.
    if(history.some(item=>item.error===record.error&&item.phase===phase&&(!at||item.at===at)))continue;
    add({at,phase,error:record.error,code:record.errorCode||null,
      schedulerRunId:record.failedSchedulerRunId||(record.state==='FAILED'?record.schedulerRunId:null)||null,
      kind:match?'controlled_test_interruption':'publication_failure',checkpoint:match?.[1]||null,date:match?.[2]||record.date||null,
      recoveredAt:record.state==='PUBLISHED_VERIFIED'?record.verifiedAt||null:null});
  }
  return history;
}
export function publicationFailureState(record,error,{at,phase=record.state,schedulerRunId=record.schedulerRunId}={}) {
  const failed={...record,state:'FAILED',failedAt:at,failedPhase:phase,failedSchedulerRunId:schedulerRunId||null,error:error.message,errorCode:error.code||null};
  return {failedAt:at,failedPhase:phase,failedSchedulerRunId:schedulerRunId||null,error:error.message,errorCode:error.code||null,
    recoverable:error.recoverable!==false,recoveryHistory:publicationRecoveryHistory(record,failed)};
}
export function publicationSuccessState(record,...priorRecords) {
  return {...record,error:null,errorCode:null,failedPhase:null,failedAt:null,failedSchedulerRunId:null,recoverable:false,
    recoveryHistory:publicationRecoveryHistory(...priorRecords,record).map(event=>({...event,recoveredAt:event.recoveredAt||record.verifiedAt||null}))};
}
export class ControlledPublicationInterruption extends Error {
  constructor(date,checkpoint){super('Controlled test interruption triggered at '+checkpoint+' for '+date);this.code='CONTROLLED_TEST_INTERRUPTION';}
}
export function publicationFailureSummary(error) {
  return error.code==='CONTROLLED_TEST_INTERRUPTION'
    ? '### Controlled test interruption triggered\n'+error.message+'\nThis disposable recovery test deliberately remains failed. No production release is involved. Later dates remain pending.\n'
    : '### Daily release stopped safely\n'+error.message+'\nLater dates remain pending. Retry this workflow after resolving the failure.\n';
}
export function publicationFailureAnnotation(error) {
  const message=error.message.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
  return error.code==='CONTROLLED_TEST_INTERRUPTION'?'::error title=Controlled test interruption triggered::'+message:error.message;
}
