import { expect,it } from 'vitest';
import { aiRequestSchema,blankDraft,draftPhotos,draftSchema,photoId,publicSnapshot,selectAIPhoto,withPhotos } from '../functions/src/domain';
import { canApplyJob } from '../src/features/admin/workflow';
import { recoverySchema } from '../src/features/admin/recovery';
const a={image:{src:'',alt:'Primera'},originalPath:'originals/admin/plant/photo-a',approvedImagePath:'',enhanceInstructions:'Fondo claro'};
const b={image:{src:'',alt:'Segunda'},originalPath:'originals/admin/plant/photo-b',approvedImagePath:'',enhanceInstructions:'Conservar sombras'};
const draft=withPhotos({...blankDraft('plant'),name:'Planta'},[a,b]);
const job={kind:'enhance',status:'ready',revision:1,photoId:photoId(b),originalPath:b.originalPath,baseApprovedImagePath:'',additionalInstructions:b.enhanceInstructions};
it('la identidad y las instrucciones acompañan a la fotografía al reordenar y recuperar',()=>{
 const reordered=withPhotos(draft,[b,a]);
 const recovered=recoverySchema.parse({draft:reordered,revision:2,status:'draft',dirty:true,enhancePhotoId:photoId(b),savedAt:Date.now()});
 expect(draftPhotos(recovered.draft)).toEqual([b,a]);expect(recovered.enhancePhotoId).toBe(photoId(b));expect(selectAIPhoto(recovered.draft,'enhance',photoId(b))).toEqual(b);
 expect(selectAIPhoto(recovered.draft,'identify')).toEqual(b);
});
it('una propuesta de otra foto no reemplaza selecciones ni depende de la posición o revisión global',()=>{
 expect(canApplyJob(job,draft,1,false)).toBe(true);
 expect(canApplyJob(job,withPhotos(draft,[b,a]),8,true)).toBe(true);
 expect(canApplyJob(job,withPhotos(draft,[a]),2,false)).toBe(false);
 expect(canApplyJob({...job,originalPath:a.originalPath},draft,1,false)).toBe(false);
 expect(canApplyJob(job,withPhotos(draft,[a,{...b,approvedImagePath:'proposals/plant/another'}]),2,false)).toBe(false);
 expect(canApplyJob(job,withPhotos(draft,[a,{...b,enhanceInstructions:'Edición humana'}]),2,false)).toBe(false);
 expect(canApplyJob({...job,status:'running'},draft,1,false)).toBe(false);
});
it('conserva la preferencia de portada anterior sin propagarla a las demás fotos',()=>{
 const old={...blankDraft('plant'),name:'Planta',originalPath:a.originalPath,ai:{confirmedName:'',instructions:{identify:'',content:'',enhance:'Preferencia antigua'}},gallery:[b]};
 const photos=draftPhotos(draftSchema.parse(old));expect(photos[0].enhanceInstructions).toBe('Preferencia antigua');
 const reordered=withPhotos(old,[b,photos[0]]);expect(reordered.enhanceInstructions).toBe(b.enhanceInstructions);expect(reordered.gallery[0].enhanceInstructions).toBe('Preferencia antigua');
 const empty=withPhotos(old,[{...b,enhanceInstructions:''},photos[0]]);expect(draftPhotos(empty)[0].enhanceInstructions).toBe('');
});
it('valida identidad, instrucciones y rechaza fotos retiradas o sin original',()=>{
 const request={plantId:'plant',revision:1,kind:'enhance',confirmedName:'',photoId:photoId(b)};expect(aiRequestSchema.safeParse(request).success).toBe(true);
 expect(aiRequestSchema.safeParse({...request,kind:'identify'}).success).toBe(false);
 for(const photoId of ['',{},'x'.repeat(1001)])expect(aiRequestSchema.safeParse({...request,photoId}).success).toBe(false);
 expect(()=>selectAIPhoto(draft,'enhance','originals/other/plant/photo')).toThrow('ya no está');
 expect(()=>selectAIPhoto({...draft,originalPath:'',image:{src:'/images/monstera.png',alt:'Demo'}},'enhance','/images/monstera.png')).toThrow('original privado');
 for(const enhanceInstructions of [null,42,'x'.repeat(2001)])expect(draftSchema.safeParse({...draft,gallery:[{...b,enhanceInstructions}]}).success).toBe(false);
});
it('la galería pública no expone instrucciones ni las referencias privadas de cada elección',()=>{
 const selected=withPhotos(draft,[a,{...b,approvedImagePath:'proposals/plant/job'}]);const pub=publicSnapshot(selected,['/public/original','/public/proposal']);
 expect(pub.images.map(p=>p.src)).toEqual(['/public/original','/public/proposal']);expect(JSON.stringify(pub)).not.toMatch(/originals|proposals|enhanceInstructions|Fondo claro|Conservar sombras/);
 expect(withPhotos(selected,[a,b]).gallery[0].approvedImagePath).toBe('');
});
