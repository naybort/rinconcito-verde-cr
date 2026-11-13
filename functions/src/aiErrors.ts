import { z } from 'zod';
const messages={
 provider_auth:'OpenAI rechazó la autenticación (401). Revisá en tu configuración privada que la clave API sea válida y pertenezca al proyecto correcto.',
 provider_permission:'OpenAI rechazó el acceso (403). Revisá los permisos del proyecto API y el acceso al modelo o la verificación de la organización.',
 provider_quota:'OpenAI informó que no hay cuota API disponible. Revisá el saldo y los límites del proyecto API. Este error no se reintenta automáticamente.',
 provider_model:'OpenAI no encontró el modelo solicitado o tu proyecto no tiene acceso. Revisá el nombre y la disponibilidad del modelo en tu cuenta API.',
 provider_request:'OpenAI rechazó los parámetros de la solicitud. Revisá la compatibilidad del modelo con esta función.',
 provider_rate_limit:'OpenAI limitó temporalmente las solicitudes; reintento pendiente dentro del límite de intentos.',
 provider_busy:'OpenAI está temporalmente ocupado; reintento pendiente dentro del límite de intentos.',
 provider_network:'La conexión con OpenAI terminó sin un resultado confirmado. No se reintenta automáticamente porque la solicitud pudo haberse procesado.',
 response_invalid:'OpenAI respondió, pero el resultado no cumple el formato esperado. La propuesta no se aplicó; podés continuar manualmente.',
 response_incomplete:'OpenAI terminó sin completar la respuesta. La propuesta no se aplicó y no se repetirá automáticamente la generación.',
 response_empty:'OpenAI respondió sin contenido utilizable. La propuesta no se aplicó y no se repetirá automáticamente la generación.',
 response_refused:'OpenAI rechazó generar esta propuesta. Revisá la foto y las instrucciones o continuá manualmente; no se aplicó ningún cambio.',
 sources_unverified:'La propuesta no contiene fuentes verificables o categorías válidas. No se aplicó al borrador.',
 image_invalid:'La imagen propuesta no tiene un formato PNG válido o supera el tamaño permitido. Se conserva la fotografía original.',
 configuration:'Falta configurar el modelo IA requerido en el backend.',
 identification_required:'Confirmá la identificación antes de solicitar contenido y cuidados.',
 access_revoked:'El acceso administrativo fue revocado antes de procesar el trabajo.',
 photo_unavailable:'No se pudo leer o validar la fotografía original en Storage. Revisá que la foto guardada siga disponible.',
 catalog_unavailable:'No se pudieron consultar las categorías del catálogo. Revisá la conexión con Firestore.',
 result_storage:'No se pudo guardar la propuesta obtenida. No se reintenta automáticamente porque la generación pudo haberse cobrado.',
 unexpected:'El procesamiento terminó con un error interno. No se aplicó ninguna propuesta; revisá el diagnóstico del trabajo.'
} as const;
export type AIErrorCode=keyof typeof messages;
export type AIStage='access'|'photo'|'catalog'|'provider'|'result';
export type ResponseStage='envelope'|'json'|'proposal';
export type Details={httpStatus?:number;providerCode?:string;parameter?:string;responseStage?:ResponseStage;reason?:'max_output_tokens'|'content_filter'|'incomplete'|'refusal'|'empty_text'|'invalid_json'|'schema_mismatch'|'unexpected_status';fields?:string[];outputTokens?:number;reasoningTokens?:number};
export class AIError extends Error {
 constructor(readonly code:AIErrorCode,readonly details:Details={}){super(messages[code]+(details.parameter?` Parámetro: ${details.parameter}.`:''));this.name='AIError';}
}
export class RetryableAIError extends AIError {
 constructor(code:'provider_rate_limit'|'provider_busy',details:Details={}){super(code,details);}
}
const knownCodes=new Set(['invalid_api_key','insufficient_quota','billing_hard_limit_reached','billing_not_active','model_not_found','permission_denied','unsupported_parameter','unsupported_value','invalid_value','invalid_image_format','rate_limit_exceeded','slow_down','server_is_overloaded']);
const knownParameters=new Set(['model','quality','size','n','image','image[0]','output_format','input','tools','max_tool_calls','max_output_tokens','reasoning.effort','text.format','store']);
export async function checkAIResponse(response:Response):Promise<void>{
 if(response.ok)return;
 // Never retain/log the provider's raw message, headers, body, or arbitrary field values.
 let code:unknown,param:unknown;
 try{const body=await response.json();code=body?.error?.code;param=body?.error?.param;}catch{ /* Some failures have no JSON body. */ }
 const details:Details={httpStatus:response.status};
 if(typeof code==='string'&&knownCodes.has(code))details.providerCode=code;
 if(typeof param==='string'&&knownParameters.has(param))details.parameter=param;
 if(response.status===401)throw new AIError('provider_auth',details);
 if(response.status===403)throw new AIError('provider_permission',details);
 if(response.status===402||['insufficient_quota','billing_hard_limit_reached','billing_not_active'].includes(details.providerCode||''))throw new AIError('provider_quota',details);
 if(response.status===404||code==='model_not_found')throw new AIError('provider_model',details);
 if(response.status===429)throw new RetryableAIError('provider_rate_limit',details);
 if(response.status>=500)throw new RetryableAIError('provider_busy',details);
 throw new AIError('provider_request',details);
}
export function safeAIFailure(error:unknown,stage:AIStage):{code:AIErrorCode;message:string;details:Details}{
 let safe:AIError;
 if(error instanceof AIError)safe=error;
 else if(stage==='provider'&&(error instanceof z.ZodError||error instanceof SyntaxError))safe=new AIError('response_invalid');
 else if(stage==='provider'&&(error instanceof TypeError||(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))))safe=new AIError('provider_network');
 else safe=new AIError(({access:'access_revoked',photo:'photo_unavailable',catalog:'catalog_unavailable',provider:'unexpected',result:'result_storage'} as const)[stage]);
 return {code:safe.code,message:safe.message,details:safe.details};
}
