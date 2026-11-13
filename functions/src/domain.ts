import { z } from 'zod';
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
export const careSchema = z.object({light:z.string().max(1500),watering:z.string().max(1500),humidity:z.string().max(1500),temperature:z.string().max(1500)}).strict();
export const sourceSchema = z.object({title:z.string().min(1).max(200),url:z.url().refine(v=>v.startsWith('https://')),accessedAt:z.iso.date()}).strict();
export const aiKindSchema=z.enum(['identify','content','enhance']);
export type AIKind=z.infer<typeof aiKindSchema>;
export const additionalInstructionsSchema=z.string().trim().max(2000).default('');
export const aiPreferencesSchema=z.object({
 confirmedName:z.string().trim().max(120).default(''),
 instructions:z.object({identify:additionalInstructionsSchema,content:additionalInstructionsSchema,enhance:additionalInstructionsSchema}).strict().default({identify:'',content:'',enhance:''})
}).strict().default({confirmedName:'',instructions:{identify:'',content:'',enhance:''}});
export const aiRequestSchema=z.object({plantId:idSchema,revision:z.number().int().positive(),kind:aiKindSchema,confirmedName:z.string().trim().max(120),additionalInstructions:additionalInstructionsSchema,photoId:z.string().min(1).max(1000).optional()}).strict().refine(v=>v.kind==='enhance'||v.photoId===undefined,{message:'La selección de foto solo corresponde a mejora de imagen.',path:['photoId']});
export const photoSchema=z.object({image:z.object({src:z.string().max(1000),alt:z.string().max(250)}).strict(),originalPath:z.string().max(300),approvedImagePath:z.string().max(300),enhanceInstructions:z.string().trim().max(2000).optional()}).strict();
export type DraftPhoto=z.infer<typeof photoSchema>;
export const MAX_PLANT_PHOTOS=10;
export const identificationSchema=z.object({scientificName:z.string().trim().max(120),commonName:z.string().trim().max(120),uncertainty:z.string().max(1000)}).strict();
export const draftSchema = z.object({
 id:idSchema, name:z.string().trim().min(1).max(120), description:z.string().max(5000),
 categoryIds:z.array(idSchema).max(20).refine(v=>new Set(v).size===v.length),
 care:careSchema, careTemplateId:idSchema.or(z.literal('')), sources:z.array(sourceSchema).max(20), warnings:z.string().max(2000),
 image:z.object({src:z.string().max(1000),alt:z.string().max(250)}).strict(),
 originalPath:z.string().max(300), approvedImagePath:z.string().max(300), enhanceInstructions:z.string().trim().max(2000).optional(),
 gallery:z.array(photoSchema).max(MAX_PLANT_PHOTOS-1).default([]), notes:z.string().max(3000), ai:aiPreferencesSchema
}).strict();
export type Draft = z.infer<typeof draftSchema>;
export type PlantRecord = Draft & {revision:number;status:'draft'|'review'|'published'|'archived';updatedBy:string;updatedAt:string;publishedRevision?:number|null};
export type PublicPlant = {images:{src:string;alt:string}[];id:string;name:string;description:string;categoryIds:string[];image:{src:string;alt:string};care:z.infer<typeof careSchema>;sources:z.infer<typeof sourceSchema>[];warnings:string;available:boolean};
export type Taxonomy = {id:string;name:string;active:boolean;revision:number;care?:z.infer<typeof careSchema>;sources?:z.infer<typeof sourceSchema>[]};
export type Stock = {plantId:string;presentation:string;available:number;reserved:number;priceCRC?:number|null;location?:string};
export const stockItemSchema = z.object({plantId:idSchema,presentation:idSchema,type:z.enum(['entry','reserve','release','sale','reserved-sale','loss','adjust']),quantity:z.number().int().min(-100000).max(100000).refine(v=>v!==0),reason:z.string().trim().min(3).max(500)}).strict();
export type MovementInput = z.infer<typeof stockItemSchema>;
export function moveStock(stock:Stock, move:MovementInput):Stock {
 const q=move.quantity;
 if(move.type!=='adjust' && q<1) throw new Error('La cantidad debe ser positiva.');
 let {available,reserved}=stock;
 switch(move.type){
 case 'entry': case 'adjust': available+=q;break;
 case 'reserve': available-=q;reserved+=q;break;
 case 'release': reserved-=q;available+=q;break;
 case 'reserved-sale': reserved-=q;break;
 case 'sale': case 'loss':available-=q;break;
 }
 if(!Number.isSafeInteger(available)||!Number.isSafeInteger(reserved)||available<0||reserved<0||available>1000000||reserved>1000000)throw new Error('Existencias insuficientes o cantidad fuera de límite.');
 return {...stock,available,reserved};
}
export function assertPublishable(draft:Draft){
 if(!draft.description.trim()||!draft.image.alt.trim()||(!draft.image.src&&!draft.originalPath)||!draft.categoryIds.length||Object.values(draft.care).some(v=>!v.trim()))throw new Error('Completá descripción, fotografía, texto alternativo, categoría y los cuatro cuidados antes de publicar.');
}
export function draftFromRecord(record:Record<string,unknown>):Draft{
 const fields=Object.fromEntries(Object.keys(draftSchema.shape).map(k=>[k,record[k]]));
 // Preserve the alternate demo photograph when an older ficha is edited/published.
 if(record.gallery===undefined&&record.detailImage)fields.gallery=[{image:record.detailImage,originalPath:'',approvedImagePath:''}];
 return draftSchema.parse(fields);
}
export function draftPhotos(d:Draft):DraftPhoto[]{return [{image:d.image,originalPath:d.originalPath,approvedImagePath:d.approvedImagePath,...(d.enhanceInstructions!==undefined?{enhanceInstructions:d.enhanceInstructions}:d.ai?.instructions.enhance?{enhanceInstructions:d.ai.instructions.enhance}:{})},...(d.gallery??[])];}
// The immutable original reference is the stable photo identity, never its gallery position.
export function photoId(photo:DraftPhoto){return photo.originalPath||photo.image.src;}
export function selectAIPhoto(d:Draft,kind:AIKind,requestedId?:string):DraftPhoto{
 const photo=kind==='enhance'&&requestedId?draftPhotos(d).find(p=>photoId(p)===requestedId):draftPhotos(d)[0];
 if(!photo?.originalPath)throw new Error('La fotografía ya no está en la ficha o no tiene un original privado. Subí y guardá la foto antes de solicitar IA.');
 return photo;
}
export function hasPhoto(p:DraftPhoto){return !!(p.originalPath||p.image.src);}
export function withPhotos(d:Draft,photos:DraftPhoto[]):Draft{const [cover,...gallery]=photos;return {...d,...(cover??{image:{src:'',alt:''},originalPath:'',approvedImagePath:''}),enhanceInstructions:cover?.enhanceInstructions??'',gallery};}
export function publicSnapshot(d:Draft,imageSrc:string|string[]):PublicPlant{
 const srcs=typeof imageSrc==='string'?[imageSrc]:imageSrc;const photos=draftPhotos(d);
 if(srcs.length!==photos.length)throw new Error('La galería pública está incompleta.');
 const images=photos.map((p,i)=>({src:srcs[i],alt:p.image.alt.trim()||`${d.name} · foto ${i+1}`}));
 return {id:d.id,name:d.name,description:d.description,categoryIds:d.categoryIds,image:images[0],images,care:d.care,sources:d.sources,warnings:d.warnings,available:true};
}
export function plantUrl(id:string,origin='https://rinconcito-verde-cr.web.app'){return `${origin.replace(/\/$/,'')}/#/plantas/${idSchema.parse(id)}`;}
export function blankDraft(id:string):Draft{return {id,name:'',description:'',categoryIds:[],care:{light:'',watering:'',humidity:'',temperature:''},careTemplateId:'',sources:[],warnings:'',image:{src:'',alt:''},originalPath:'',approvedImagePath:'',gallery:[],notes:'',ai:aiPreferencesSchema.parse(undefined)};}
export const proposalSchema=z.object({name:z.string().max(120),description:z.string().max(5000),categoryIds:z.array(idSchema).max(20),care:careSchema,warnings:z.string().max(2000),sources:z.array(sourceSchema).max(20),uncertainty:z.string().max(1000)}).strict();
