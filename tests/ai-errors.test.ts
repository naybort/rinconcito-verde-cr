import { expect,it,vi } from 'vitest';
import { AIError, RetryableAIError, checkAIResponse, safeAIFailure } from '../functions/src/aiErrors';
import { generateAI } from '../functions/src/ai';
const fakeSecret='test-only-sensitive-marker';
const response=(status:number,code:string,param?:string)=>new Response(JSON.stringify({error:{code,param,message:fakeSecret}}),{status});
it.each([[401,'invalid_api_key','provider_auth'],[403,'permission_denied','provider_permission'],[404,'model_not_found','provider_model'],[400,'model_not_found','provider_model'],[429,'insufficient_quota','provider_quota'],[400,'unsupported_parameter','provider_request']] as const)('clasifica HTTP %s / %s sin filtrar contenido privado',async(status,code,expected)=>{
 const error=await checkAIResponse(response(status,code,'model')).catch(e=>e);const safe=safeAIFailure(error,'provider');
 expect(safe.code).toBe(expected);expect(safe.details.httpStatus).toBe(status);expect(safe.details.providerCode).toBe(code);expect(JSON.stringify(safe)).not.toContain(fakeSecret);expect(error).not.toBeInstanceOf(RetryableAIError);
});
it('solo fallos temporales se reintentan, con código seguro',async()=>{
 for(const status of [429,500,503])await expect(checkAIResponse(new Response('',{status}))).rejects.toBeInstanceOf(RetryableAIError);
});
it('descarta códigos y parámetros arbitrarios del proveedor',async()=>{
 const error=await checkAIResponse(response(400,fakeSecret,fakeSecret)).catch(e=>e);
 expect(safeAIFailure(error,'provider').details).toEqual({httpStatus:400});expect(JSON.stringify(safeAIFailure(error,'provider'))).not.toContain(fakeSecret);
});
it('distingue red, respuesta inválida, foto y guardado sin exponer mensajes internos',()=>{
 expect(safeAIFailure(new TypeError(fakeSecret),'provider').code).toBe('provider_network');
 expect(safeAIFailure(new SyntaxError(fakeSecret),'provider').code).toBe('response_invalid');
 expect(safeAIFailure(new Error(fakeSecret),'photo').code).toBe('photo_unavailable');
 expect(safeAIFailure(new Error(fakeSecret),'result').code).toBe('result_storage');
 expect(JSON.stringify(safeAIFailure(new Error(fakeSecret),'result'))).not.toContain(fakeSecret);
});
it('la cuota insuficiente en una generación simulada falla sin repetir el transporte',async()=>{
 const transport=vi.fn().mockResolvedValue(response(429,'insufficient_quota'));
 const error=await generateAI({kind:'identify',confirmedName:'',nameHint:'Orientativo'},{data:new Uint8Array([1]),mime:'image/png'},[],{key:'fake',textModel:'gpt-6.1-terra',imageModel:'gpt-image-2.6-sunburst',requestId:'fake'},transport).catch(e=>e);
 expect(error).toBeInstanceOf(AIError);expect(error).not.toBeInstanceOf(RetryableAIError);expect(error.code).toBe('provider_quota');expect(transport).toHaveBeenCalledOnce();
});
