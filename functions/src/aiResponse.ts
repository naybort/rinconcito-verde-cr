import { z } from 'zod';
import { AIError, type Details } from './aiErrors.js';
import { identificationSchema, proposalSchema } from './domain.js';

const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const strings=(keys:string[])=>Object.fromEntries(keys.map(key=>[key,{type:'string'}]));
// Provider schema controls shape; the domain schema still enforces bounds and business rules.
export function responseFormat(kind:'identify'|'content',categories:string[]){
 const schema=kind==='identify'?object(strings(['scientificName','commonName','uncertainty'])):object({
  ...strings(['name','description','warnings','uncertainty']),
  categoryIds:{type:'array',items:{type:'string',...(categories.length?{enum:categories}:{})}},
  care:object(strings(['light','watering','humidity','temperature'])),
  sources:{type:'array',items:object(strings(['title','url','accessedAt']))}
 });
 return {type:'json_schema',name:kind==='identify'?'plant_identification':'plant_care_proposal',strict:true,schema};
}
const record=(value:unknown):Record<string,unknown>|undefined=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:undefined;
const array=(value:unknown):unknown[]=>Array.isArray(value)?value:[];
const boundedCount=(value:unknown)=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=1000000000?value:undefined;
function counts(usage:unknown):Details{
 const data=record(usage);const outputTokens=boundedCount(data?.output_tokens);const reasoningTokens=boundedCount(record(data?.output_tokens_details)?.reasoning_tokens);
 return {...(outputTokens!==undefined?{outputTokens}:{}),...(reasoningTokens!==undefined?{reasoningTokens}:{})};
}
const fields=new Set(['scientificName','commonName','uncertainty','name','description','categoryIds','care','light','watering','humidity','temperature','warnings','sources','title','url','accessedAt']);
function invalidSchema(error:z.ZodError,details:Details):never{
 // Never copy received values, unknown keys, schema messages or provider text into diagnostics.
 const paths=[...new Set(error.issues.slice(0,8).map(issue=>issue.path.map(p=>typeof p==='number'?'item':typeof p==='string'&&fields.has(p)?p:'unknown').join('.')||'root'))];
 throw new AIError('response_invalid',{...details,responseStage:'proposal',reason:'schema_mismatch',fields:paths});
}
export function parseTextResponse(body:unknown,kind:'identify'|'content',categories:string[],date:string){
 const result=record(body);if(!result)throw new AIError('response_invalid',{responseStage:'envelope',reason:'schema_mismatch'});
 const details=counts(result.usage);
 if(result.status==='incomplete'){
  const reason=record(result.incomplete_details)?.reason;
  throw new AIError('response_incomplete',{...details,responseStage:'envelope',reason:reason==='max_output_tokens'||reason==='content_filter'?reason:'incomplete'});
 }
 if(result.status!==undefined&&result.status!=='completed')throw new AIError('response_invalid',{...details,responseStage:'envelope',reason:'unexpected_status'});
 if(!Array.isArray(result.output))throw new AIError('response_invalid',{...details,responseStage:'envelope',reason:'schema_mismatch'});
 const messages=result.output.map(record).filter(item=>item&&(item.type===undefined||item.type==='message'));
 const final=messages.filter(item=>item?.phase==='final_answer').at(-1)??messages.filter(item=>item?.phase==null).at(-1);
 if(final?.status!==undefined&&final.status!=='completed')throw new AIError('response_incomplete',{...details,responseStage:'envelope',reason:'incomplete'});
 const text:string[]=[];const cited=new Set<string>();let refused=false;
 for(const value of result.output){
  const item=record(value);if(!item)continue;
  // Never concatenate progress commentary with the final JSON answer or read tool text as a proposal.
  if(item===final)for(const entry of array(item.content)){
   const block=record(entry);if(!block)continue;
   if(block.type==='refusal')refused=true;
   if(block.type!=='output_text')continue;
   if(typeof block.text!=='string')throw new AIError('response_invalid',{...details,responseStage:'envelope',reason:'schema_mismatch'});
   text.push(block.text);
   for(const annotation of array(block.annotations)){const a=record(annotation);if(a?.type==='url_citation'&&typeof a.url==='string')cited.add(a.url);}
  }
  if(item.type===undefined||item.type==='web_search_call')for(const source of array(record(item.action)?.sources)){const s=record(source);if(typeof s?.url==='string')cited.add(s.url);}
 }
 if(refused)throw new AIError('response_refused',{...details,responseStage:'envelope',reason:'refusal'});
 const raw=text.join('').trim();if(!raw)throw new AIError('response_empty',{...details,responseStage:'json',reason:'empty_text'});
 // Compatibility for older JSON-only responses; do not guess or repair malformed content.
 const fenced=/^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(raw);let parsed:unknown;
 try{parsed=JSON.parse(fenced?.[1]??raw);}catch{throw new AIError('response_invalid',{...details,responseStage:'json',reason:'invalid_json'});}
 if(kind==='identify'){
  const proposal=identificationSchema.safeParse(parsed);if(!proposal.success)invalidSchema(proposal.error,details);
  return {image:null,proposal:proposal.data,usage:result.usage??null};
 }
 const validated=proposalSchema.safeParse(parsed);if(!validated.success)invalidSchema(validated.error,details);const proposal=validated.data;
 if(!proposal.sources.length||proposal.sources.some(s=>!cited.has(s.url)||s.accessedAt!==date)||proposal.categoryIds.some(c=>!categories.includes(c)))throw new AIError('sources_unverified');
 return {image:null,proposal,usage:result.usage??null};
}
