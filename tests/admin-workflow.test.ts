import { expect,it } from 'vitest';
import { aiRequestSchema,blankDraft,draftSchema,publicSnapshot } from '../functions/src/domain';
import { recoverySchema } from '../src/features/admin/recovery';
import { canApplyJob,emptyInventory,missingForPublication } from '../src/features/admin/workflow';
it('recupera borradores antiguos y conserva preferencias, identificación, fase e inventario incompleto',()=>{
 const draft=blankDraft('prueba');const {ai:_,...legacy}=draft;void _;
 const old=recoverySchema.parse({draft:legacy,revision:0,status:'draft',dirty:true,savedAt:Date.now()});expect(old.phase).toBe(0);expect(old.draft.ai.instructions.content).toBe('');
 const data={...old,phase:4,draft:{...draft,ai:{confirmedName:'Echeveria',instructions:{identify:'Comparar especies',content:'Clima tropical',enhance:'Fondo claro'}}},inventory:{...emptyInventory(),reason:'Entrada pendiente',quantity:10}};
 expect(recoverySchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
});
it('preferencias privadas no se publican y entradas inválidas se rechazan',()=>{
 const draft={...blankDraft('prueba'),name:'Planta'};draft.ai.instructions.content='Nota privada';draft.ai.confirmedName='Identidad privada';
 expect(JSON.stringify(publicSnapshot(draft,'foto'))).not.toContain('privada');expect(publicSnapshot(draft,'foto')).not.toHaveProperty('ai');
 expect(draftSchema.safeParse({...draft,ai:{...draft.ai,instructions:{...draft.ai.instructions,enhance:'x'.repeat(2001)}}}).success).toBe(false);
 const request={plantId:draft.id,revision:1,kind:'identify',confirmedName:''};expect(aiRequestSchema.parse(request).additionalInstructions).toBe('');
 for(const additionalInstructions of [null,{},10,'x'.repeat(2001)])expect(aiRequestSchema.safeParse({...request,additionalInstructions}).success).toBe(false);
});
it('propuestas tardías nunca reemplazan edición humana, otra foto o versión',()=>{
 const draft=blankDraft('prueba');draft.originalPath='original';const job={revision:3,status:'ready',originalPath:'original'};
 expect(canApplyJob(job,draft,3,false)).toBe(true);expect(canApplyJob(job,draft,3,true)).toBe(false);expect(canApplyJob(job,draft,4,false)).toBe(false);expect(canApplyJob({...job,originalPath:'old'},draft,3,false)).toBe(false);expect(canApplyJob({...job,status:'running'},draft,3,false)).toBe(false);
 expect(missingForPublication(draft)).toContain('los cuatro cuidados');
});
