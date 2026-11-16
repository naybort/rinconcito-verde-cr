import { z } from 'zod';
import { draftPhotos, photoId, type Draft, type MovementInput } from '../../../functions/src/domain';
export const FLOW_VERSION=2 as const;
export const phases=['Planta de catálogo','Inventario','Revisión final'] as const;
export const phaseHints=[
 'Completá nombre, imágenes, categorías y cuidados. La guía y la IA están disponibles cuando las necesités; también podés escribir todo manualmente.',
 'Organizá presentaciones, macetas, precios y cantidades. Los movimientos de inventario se guardan por separado de la ficha.',
 'Revisá lo que verá el público. Guardar, enviar a revisión y publicar siguen siendo acciones distintas.'
];
export function recoveredPhase(phase:number,flowVersion?:number){
 return flowVersion===FLOW_VERSION?Math.min(2,Math.max(0,phase)):phase===5?1:phase===6?2:0;
}
export const inventoryDraftSchema=z.object({
 ids:z.array(z.string()).max(30),presentation:z.string().max(80),quantity:z.number().finite(),
 type:z.enum(['entry','reserve','release','sale','reserved-sale','loss','adjust']),reason:z.string().max(500),movementDirty:z.boolean().default(false),
 query:z.string().max(200),price:z.string().max(20),location:z.string().max(200),potNumber:z.string().max(40).default(''),
 presentationEdits:z.object({price:z.boolean().optional(),location:z.boolean().optional(),potNumber:z.boolean().optional()}).strict().default({}),
 presentationContext:z.string().max(200).default('')
}).strict();
export type InventoryDraft=z.infer<typeof inventoryDraftSchema>;
export const emptyInventory=():InventoryDraft=>({ids:[],presentation:'general',quantity:1,type:'entry' as MovementInput['type'],reason:'',movementDirty:false,query:'',price:'',location:'',potNumber:'',presentationEdits:{},presentationContext:''});
export function missingForPublication(d:Draft){
 return [!d.name.trim()&&'nombre',!d.description.trim()&&'descripción',!(d.originalPath||d.image.src)&&'fotografía',!d.image.alt.trim()&&'descripción de la fotografía',!d.categoryIds.length&&'categoría',Object.values(d.care).some(v=>!v.trim())&&'los cuatro cuidados'].filter(Boolean) as string[];
}
export function canApplyJob(job:{revision:number;status:string;originalPath?:string;originalPaths?:string[];inputMode?:'photos'|'name';nameHint?:string;confirmedName?:string;kind?:string;photoId?:string;baseApprovedImagePath?:string;additionalInstructions?:string},draft:Draft,revision:number,dirty:boolean,allowPartialContent=false){
 if(job.kind==='enhance'&&job.photoId&&job.baseApprovedImagePath!==undefined){
  const photo=draftPhotos(draft).find(p=>photoId(p)===job.photoId);
  return job.status==='ready'&&!!photo&&photo.originalPath===job.originalPath&&photo.approvedImagePath===job.baseApprovedImagePath&&(photo.enhanceInstructions??'').trim()===(job.additionalInstructions??'').trim();
 }
 if(job.status!=='ready'||job.revision!==revision)return false;
 if(dirty&&!(allowPartialContent&&job.kind==='content'))return false;
 if(job.kind==='content'&&job.confirmedName!==undefined&&job.confirmedName!==draft.ai.confirmedName)return false;
 if(job.kind==='identify'&&job.inputMode==='name'&&job.nameHint!==undefined&&job.nameHint!==draft.name)return false;
 if(job.inputMode==='name')return true;
 if(job.originalPaths?.length){
  const originals=new Set(draftPhotos(draft).map(photo=>photo.originalPath).filter(Boolean));
  return job.originalPaths.every(path=>originals.has(path));
 }
 return !job.originalPath||job.originalPath===draft.originalPath;
}
