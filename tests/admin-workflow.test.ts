import { expect,it } from 'vitest';
import { aiRequestSchema,blankDraft,draftSchema,publicSnapshot } from '../functions/src/domain';
import { recoverySchema } from '../src/features/admin/recovery';
import { canApplyJob,emptyInventory,FLOW_VERSION,missingForPublication } from '../src/features/admin/workflow';
it('recupera borradores antiguos y conserva preferencias, identificación, fase e inventario incompleto',()=>{
 const draft=blankDraft('prueba');const {ai:_,...legacy}=draft;void _;
 const old=recoverySchema.parse({draft:legacy,revision:0,status:'draft',dirty:true,savedAt:Date.now()});expect(old.phase).toBe(0);expect(old.draft.ai.instructions.content).toBe('');
 const data={...old,phase:2,draft:{...draft,ai:{...draft.ai,confirmedName:'Echeveria',instructions:{identify:'Comparar especies',content:'Clima tropical',enhance:'Fondo claro'}}},inventory:{...emptyInventory(),reason:'Entrada pendiente',quantity:10}};
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

it('migra cada fase antigua y preserva la sección e inventario del flujo nuevo',()=>{
 const {showPrice:_,ai:__,...legacyDraft}=blankDraft('prueba');void _;void __;
 const {potNumber:___,presentationEdits:____,presentationContext:_____,movementDirty:______,...legacyInventory}=emptyInventory();void ___;void ____;void _____;void ______;
 const base={draft:legacyDraft,revision:1,status:'draft',dirty:true,savedAt:1,inventory:legacyInventory};
 for(const [phase,expected] of [[0,0],[1,0],[2,0],[3,0],[4,0],[5,1],[6,2]]){
  const recovered=recoverySchema.parse({...base,phase});expect(recovered.phase).toBe(expected);expect(recovered.flowVersion).toBe(FLOW_VERSION);
  expect(recovered.draft.showPrice).toBe(false);expect(recovered.draft.ai.contentJobId).toBe('');expect(recovered.inventory.potNumber).toBe('');expect(recovered.inventory.presentationEdits).toEqual({});expect(recovered.inventory.movementDirty).toBe(false);
 }
 for(const phase of [0,1,2])expect(recoverySchema.parse({...base,phase,flowVersion:FLOW_VERSION}).phase).toBe(phase);
 const inventory={...emptyInventory(),movementDirty:true,quantity:12,reason:'',potNumber:'12',presentationEdits:{potNumber:true},presentationContext:'prueba:grande'};
 expect(recoverySchema.parse({...base,inventory}).inventory).toEqual(inventory);
});
it('recupera referencias manuales incompletas y fuentes antiguas sin atribuir verificación',()=>{
 const draft={...blankDraft('prueba'),sources:[{title:'Nota del vivero'},{title:'URL por completar',url:'https://'},{title:'',url:''}]};
 const result=recoverySchema.parse({draft,revision:1,status:'draft',dirty:true,savedAt:1});
 expect(result.draft.sources).toEqual(draft.sources.map(source=>({...source,verification:'unverified'})));
});
it('solo aplica propuestas compatibles con nombre, fotos y revisión; contenido exige selección explícita para cambios pendientes',()=>{
 const draft={...blankDraft('prueba'),name:'Monstera',originalPath:'primera',gallery:[{originalPath:'segunda',approvedImagePath:'',image:{src:'',alt:'Detalle'}}]};draft.ai.confirmedName='Monstera deliciosa';
 const nameJob={revision:3,status:'ready',kind:'identify',inputMode:'name' as const,nameHint:'Monstera'};
 expect(canApplyJob(nameJob,draft,3,false)).toBe(true);expect(canApplyJob({...nameJob,nameHint:'Otra'},draft,3,false)).toBe(false);
 const photosJob={revision:3,status:'ready',kind:'identify',inputMode:'photos' as const,originalPaths:['segunda','primera']};
 expect(canApplyJob(photosJob,draft,3,false)).toBe(true);expect(canApplyJob({...photosJob,originalPaths:['ya-quitada']},draft,3,false)).toBe(false);
 const contentJob={revision:3,status:'ready',kind:'content',inputMode:'name' as const,confirmedName:'Monstera deliciosa'};
 expect(canApplyJob(contentJob,draft,3,true)).toBe(false);expect(canApplyJob(contentJob,draft,3,true,true)).toBe(true);
 expect(canApplyJob({...contentJob,confirmedName:'Otra'},draft,3,true,true)).toBe(false);expect(canApplyJob(contentJob,draft,4,true,true)).toBe(false);
 expect(canApplyJob(nameJob,draft,3,true,true)).toBe(false);
});
