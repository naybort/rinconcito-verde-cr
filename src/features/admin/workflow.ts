import { z } from 'zod';
import { draftPhotos, photoId, type Draft, type MovementInput } from '../../../functions/src/domain';
export const phases=['Foto y nombre','Manual o IA','Identificación','Contenido y cuidados','Mejora de imagen','Inventario','Revisión y publicación'] as const;
export const phaseHints=[
 'Subí una foto real y escribí un nombre orientativo. Podés completar todo manualmente.',
 'Elegí cómo continuar. La IA es opcional en cada fase; guardar nunca inicia una generación.',
 'Confirmá la identificación vos mismo o pedí una sugerencia y revisá su incertidumbre.',
 'Completá descripción, categorías, cuidados y fuentes. Revisá cada dato propuesto antes de aceptarlo.',
 'Elegí una fotografía y conservá su original o revisá una mejora opcional. Cada foto se elige por separado.',
 'Registrá cantidades y presentaciones manualmente. Cada movimiento queda en el historial.',
 'Revisá lo que verá el público. Guardar, enviar a revisión y publicar son acciones distintas.'
];
export const inventoryDraftSchema=z.object({
 ids:z.array(z.string()).max(30),presentation:z.string().max(80),quantity:z.number().finite(),
 type:z.enum(['entry','reserve','release','sale','reserved-sale','loss','adjust']),reason:z.string().max(500),
 query:z.string().max(200),price:z.string().max(20),location:z.string().max(200)
}).strict();
export type InventoryDraft=z.infer<typeof inventoryDraftSchema>;
export const emptyInventory=():InventoryDraft=>({ids:[],presentation:'general',quantity:1,type:'entry' as MovementInput['type'],reason:'',query:'',price:'',location:''});
export function missingForPublication(d:Draft){
 return [!d.name.trim()&&'nombre',!d.description.trim()&&'descripción',!(d.originalPath||d.image.src)&&'fotografía',!d.image.alt.trim()&&'descripción de la fotografía',!d.categoryIds.length&&'categoría',Object.values(d.care).some(v=>!v.trim())&&'los cuatro cuidados'].filter(Boolean) as string[];
}
export function canApplyJob(job:{revision:number;status:string;originalPath?:string;kind?:string;photoId?:string;baseApprovedImagePath?:string;additionalInstructions?:string},draft:Draft,revision:number,dirty:boolean){
 if(job.kind==='enhance'&&job.photoId&&job.baseApprovedImagePath!==undefined){
  const photo=draftPhotos(draft).find(p=>photoId(p)===job.photoId);
  return job.status==='ready'&&!!photo&&photo.originalPath===job.originalPath&&photo.approvedImagePath===job.baseApprovedImagePath&&(photo.enhanceInstructions??'').trim()===(job.additionalInstructions??'').trim();
 }
 return job.status==='ready'&&!dirty&&job.revision===revision&&(!job.originalPath||job.originalPath===draft.originalPath);
}
