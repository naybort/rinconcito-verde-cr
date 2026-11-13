export type JobState={status:string;attempts:number;leaseUntil?:number};
export const AI_USER_DAILY_LIMIT=5;
export const AI_PROJECT_DAILY_LIMIT=30;
// Local opt-in testing has no daily admission cap; counters and idempotency remain active.
export function canAdmitAI(userCount:number,projectCount:number,runtime:'production'|'emulator'='production'){return runtime==='emulator'||(userCount<AI_USER_DAILY_LIMIT&&projectCount<AI_PROJECT_DAILY_LIMIT);}
export function claimAI(job:JobState,now:number):{action:'skip'|'wait'|'run'|'fail';error?:string}{
 if(['ready','failed'].includes(job.status))return {action:'skip'};
 if(job.status==='running')return now<(job.leaseUntil??0)?{action:'wait'}:{action:'fail',error:'El intento anterior terminó sin resultado confirmado. Revisá el trabajo antes de solicitar otra generación.'};
 if(job.attempts>=3)return {action:'fail',error:'Se agotaron los reintentos. Continuá manualmente.'};
 return {action:'run'};
}
