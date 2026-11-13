import { expect,it,vi } from 'vitest';
import { generateAI } from '../functions/src/ai';
import { parseTextResponse,responseFormat } from '../functions/src/aiResponse';
import { safeAIFailure,RetryableAIError } from '../functions/src/aiErrors';
import { identificationSchema,proposalSchema } from '../functions/src/domain';
const date='2026-11-12';const secret='test-sensitive-response-marker';
const proposal={name:'Pastora',description:'Cuidados básicos',categoryIds:['interior'],care:{light:'Luz indirecta brillante.',watering:'Regá cuando se seque la superficie.',humidity:'Humedad ambiental.',temperature:'Protegé del frío.'},warnings:'',sources:[{title:'Fuente de prueba',url:'https://example.test/botany',accessedAt:date}],uncertainty:''};
const message=(text=JSON.stringify(proposal))=>({type:'message',content:[{type:'output_text',text,annotations:[{type:'url_citation',url:proposal.sources[0].url}]}]});
const body=()=>({status:'completed',output:[message()]});
const parse=(value:unknown)=>parseTextResponse(value,'content',['interior'],date);
function failure(value:unknown){try{parse(value);}catch(error){expect(error).not.toBeInstanceOf(RetryableAIError);return safeAIFailure(error,'provider');}throw new Error('Expected a failure');}
it('solicita un esquema completo y cerrado para ambos tipos de texto',()=>{
 for(const [kind,schema] of [['identify',identificationSchema],['content',proposalSchema]] as const){
  const format=responseFormat(kind,['interior']);expect(format).toMatchObject({type:'json_schema',strict:true});expect(format.schema.required.sort()).toEqual(Object.keys(schema.shape).sort());expect(format.schema.additionalProperties).toBe(false);
 }
 const schema=responseFormat('content',['interior']).schema.properties as Record<string,Record<string,unknown>>;
 expect(schema.care).toMatchObject({type:'object',required:['light','watering','humidity','temperature'],additionalProperties:false});expect(schema.warnings).toEqual({type:'string'});expect(schema.sources).toMatchObject({type:'array',items:{additionalProperties:false,required:['title','url','accessedAt']}});
 expect(JSON.stringify(responseFormat('content',[]))).not.toContain('"enum":[]');
});
it('acepta mensajes completos con razonamiento y metadatos heterogéneos sin confundirlos con contenido',()=>{
 const text=JSON.stringify(proposal);const result=parse({status:'completed',output:[
  {type:'reasoning',content:null,summary:[{type:'summary_text',text:secret}]},
  {type:'web_search_call',content:null,action:{type:'search',sources:[{type:'url',url:proposal.sources[0].url},{type:'unknown',title:secret}]}},
  {type:'message',content:[{type:'output_text',text:text.slice(0,80),annotations:null},{type:'output_text',text:text.slice(80),annotations:[{type:'file_citation',url:null}]}]}
 ]});expect(result.proposal).toEqual(proposal);
});
it('acepta JSON completo con espacios o cercas anteriores sin inventar ni reparar valores',()=>{
 expect(parse({status:'completed',output:[message('\n  ```json\n'+JSON.stringify(proposal)+'\n```\n')]}).proposal).toEqual(proposal);
 const error=failure({status:'completed',output:[message('Texto previo '+JSON.stringify(proposal))]});expect(error.details).toMatchObject({responseStage:'json',reason:'invalid_json'});
});
it('separa comentarios de progreso de la respuesta final al usar búsqueda web',()=>{
 const commentary={...message('Voy a consultar las fuentes para esta planta.'),phase:'commentary'};
 const final={...message(),phase:'final_answer'};
 expect(parse({status:'completed',output:[commentary,{type:'web_search_call',action:{sources:[]}},final]}).proposal).toEqual(proposal);
 expect(parse({status:'completed',output:[message('Progreso anterior sin fase'),message()]}).proposal).toEqual(proposal);
 expect(failure({status:'completed',output:[{...message(),phase:'commentary'}]}).code).toBe('response_empty');
 expect(failure({status:'completed',output:[{...final,status:'incomplete'}]}).code).toBe('response_incomplete');
});
it.each(['max_output_tokens','content_filter','unknown-private-reason'])('distingue respuestas incompletas (%s), aunque tengan JSON aparentemente válido',reason=>{
 const error=failure({...body(),status:'incomplete',incomplete_details:{reason},usage:{output_tokens:3000,output_tokens_details:{reasoning_tokens:2800},private:secret}});
 expect(error.code).toBe('response_incomplete');expect(error.details).toEqual({responseStage:'envelope',reason:reason==='unknown-private-reason'?'incomplete':reason,outputTokens:3000,reasoningTokens:2800});expect(JSON.stringify(error)).not.toContain(secret);
});
it('distingue rechazo y salida vacía sin conservar texto del proveedor',()=>{
 expect(failure({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:secret}]}]}).code).toBe('response_refused');
 for(const output of [[],[{type:'reasoning',summary:[]}],[message('   ')]])expect(failure({status:'completed',output}).code).toBe('response_empty');
 expect(failure({...body(),status:secret}).details).toMatchObject({reason:'unexpected_status'});
});
it('el diagnóstico señala campos conocidos, sin valores ni claves desconocidas del modelo',()=>{
 const error=failure({status:'completed',output:[message(JSON.stringify({...proposal,care:{...proposal.care,watering:null},[secret]:secret}))]});
 expect(error.code).toBe('response_invalid');expect(error.details).toMatchObject({responseStage:'proposal',reason:'schema_mismatch'});expect(error.details.fields).toContain('care.watering');expect(JSON.stringify(error)).not.toContain(secret);
});
it('mantiene validación local de límites, fuentes y campos comerciales aun con salida estructurada',()=>{
 for(const change of [{warnings:[]},{description:'x'.repeat(5001)},{stock:10,price:500,publish:true}])expect(failure({status:'completed',output:[message(JSON.stringify({...proposal,...change}))]}).code).toBe('response_invalid');
 const uncited=body();uncited.output[0].content[0].annotations=[];expect(failure(uncited).code).toBe('sources_unverified');
 expect(failure({status:'completed',output:[{type:'unknown_tool',action:{sources:[{url:proposal.sources[0].url}]}},...uncited.output]}).code).toBe('sources_unverified');
 expect(failure({status:'completed',output:[message(JSON.stringify({...proposal,sources:[{...proposal.sources[0],accessedAt:'2020-01-01'}]}))]}).code).toBe('sources_unverified');
});
it('no expone JSON roto ni repite solicitudes para intentar reparar la respuesta',async()=>{
 const transport=vi.fn<typeof fetch>().mockResolvedValue(new Response(secret));
 const error=await generateAI({kind:'content',confirmedName:'Pastora',nameHint:'Pastora'},{data:new Uint8Array([1]),mime:'image/png'},['interior'],{key:'fake-only',textModel:'configured-model',imageModel:'configured-image',requestId:'test'},transport).catch(e=>e);
 const safe=safeAIFailure(error,'provider');expect(safe.code).toBe('response_invalid');expect(safe.details).toEqual({responseStage:'envelope',reason:'invalid_json'});expect(JSON.stringify(safe)).not.toContain(secret);expect(transport).toHaveBeenCalledOnce();
 const request=JSON.parse(String(transport.mock.calls[0][1]?.body));expect(request.text.format).toMatchObject({type:'json_schema',strict:true,name:'plant_care_proposal'});expect(request.max_output_tokens).toBe(3000);expect(request.model).toBe('configured-model');
});
