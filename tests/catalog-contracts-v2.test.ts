import { describe, expect, it } from 'vitest';
import { aiRequestSchema, blankDraft, draftSchema, presentationSchema, publicPriceOptions, publicSnapshot, selectAIPhotos, sourceSchema, type Source, type Stock } from '../functions/src/domain';
import { normalizeSources } from '../functions/src/sourceTrust';
const source:Source={title:'Referencia botánica',url:'https://example.test/species',accessedAt:'2026-11-16',verification:'verified'};
const context={plantId:'plant',revision:3,confirmedName:'Sansevieria'};
const proof={...context,kind:'content',status:'ready',proposal:{sources:[source]}};

describe('fuentes: evidencia y conservación',()=>{
 it('acepta referencias de texto sin URL y no eleva las fuentes antiguas',()=>{
  expect(sourceSchema.parse({title:'Observación de vivero'})).toEqual({title:'Observación de vivero',verification:'unverified'});
  const legacy={title:source.title,url:source.url,accessedAt:source.accessedAt};
  expect(normalizeSources([source],[legacy])[0].verification).toBe('unverified');
 });
 it('no permite autodeclarar evidencia, ni conservarla al cambiar texto o URL',()=>{
  expect(normalizeSources([source],[])[0].verification).toBe('unverified');
  expect(normalizeSources([source],[source])[0]).toEqual(source);
  expect(normalizeSources([{...source,title:'Otra especie'}],[source])[0].verification).toBe('unverified');
  expect(normalizeSources([{...source,url:'https://example.test/invented'}],[source])[0].verification).toBe('unverified');
 });
 it('confirma una cita solo con trabajo listo correspondiente a ficha, revisión e identificación',()=>{
  expect(normalizeSources([source],[],proof,context)).toEqual([source]);
  for(const invalid of [{plantId:'other'},{revision:2},{confirmedName:'Otra especie'},{kind:'identify'},{status:'running'}]){
   expect(normalizeSources([source],[],{...proof,...invalid},context)[0].verification).toBe('unverified');
  }
  expect(normalizeSources([source],[],{...proof,proposal:{sources:[{...source,verification:'unverified'}]}},context)[0].verification).toBe('unverified');
 });
 it('elimina valores vacíos y nunca agrega undefined a Firestore',()=>{
  expect(normalizeSources([{title:'Manual',url:'',accessedAt:'',verification:'unverified'}],[])).toEqual([{title:'Manual',verification:'unverified'}]);
 });
});

describe('precios: permiso explícito por ficha y proyección mínima',()=>{
 const stock:Stock={plantId:'plant',presentation:'mediana',available:15,reserved:3,priceCRC:4500,potNumber:' 12 ',location:'Estante privado'};
 it('borradores antiguos mantienen precios ocultos aunque exista inventario',()=>{
  const {showPrice,...legacy}={...blankDraft('plant'),name:'Planta'};void showPrice;
  const draft=draftSchema.parse(legacy);expect(draft.showPrice).toBe(false);
  expect(publicSnapshot(draft,'/images/sansevieria.png',[stock])).not.toHaveProperty('priceOptions');
 });
 it('expone cada presentación válida sin cantidades, notas, ubicación ni otra planta',()=>{
  const result=publicSnapshot({...blankDraft('plant'),showPrice:true},'/images/sansevieria.png',[stock,{...stock,presentation:'grande',potNumber:'18',priceCRC:8000},{...stock,plantId:'other',presentation:'small'}]);
  expect(result.priceOptions).toEqual([{presentation:'grande',potNumber:'18',priceCRC:8000},{presentation:'mediana',potNumber:'12',priceCRC:4500}]);
  expect(JSON.stringify(result)).not.toMatch(/available":15|reserved|Estante privado|"small"/);
 });
 it('omitir precio no borra el existente; null permite retirarlo explícitamente',()=>{
  expect(presentationSchema.parse({plantId:'plant',presentation:'mediana',potNumber:'14'})).not.toHaveProperty('priceCRC');
  expect(presentationSchema.parse({plantId:'plant',presentation:'mediana',priceCRC:null})).toHaveProperty('priceCRC',null);
 });
 it('no publica precios ausentes o inválidos; cero es un precio explícito válido',()=>{
  const invalid=[null,undefined,-1,NaN,Infinity,1.5,100000001];
  expect(publicPriceOptions(invalid.map(price=>({...stock,priceCRC:price})))).toEqual([]);
  expect(publicPriceOptions([{...stock,priceCRC:0,potNumber:8 as unknown as string}])).toEqual([{presentation:'mediana',priceCRC:0}]);
  expect(publicSnapshot({...blankDraft('plant'),showPrice:true},'/images/sansevieria.png',[])).not.toHaveProperty('priceOptions');
 });
});

describe('IA: contratos de referencia con límites explícitos',()=>{
 const draft={...blankDraft('plant'),name:'Sansevieria',originalPath:'originals/user/plant/a',gallery:[{image:{src:'',alt:'Detalle'},originalPath:'originals/user/plant/b',approvedImagePath:''}]};
 const request={plantId:'plant',revision:1,kind:'identify',confirmedName:''};
 it('preserva modo antiguo y selecciona originales de esta ficha en orden explícito',()=>{
  expect(aiRequestSchema.parse(request).inputMode).toBe('photos');
  expect(selectAIPhotos(draft,{kind:'identify'}).map(p=>p.originalPath)).toEqual([draft.originalPath]);
  expect(selectAIPhotos(draft,{kind:'identify',photoIds:[draft.gallery[0].originalPath,draft.originalPath]}).map(p=>p.originalPath)).toEqual([draft.gallery[0].originalPath,draft.originalPath]);
  expect(()=>selectAIPhotos(draft,{kind:'identify',photoIds:['originals/user/other/x']})).toThrow();
 });
 it('identificar por nombre no requiere ni envía foto; contenido exige identificación guardada',()=>{
  expect(selectAIPhotos(draft,{kind:'identify',inputMode:'name'})).toEqual([]);
  expect(()=>selectAIPhotos(draft,{kind:'content',inputMode:'name'})).toThrow();
  expect(selectAIPhotos({...draft,ai:{...draft.ai,confirmedName:'Sansevieria'}},{kind:'content',inputMode:'name'})).toEqual([]);
 });
 it.each([{photoIds:[]},{photoIds:['a','a']},{photoIds:['a','b','c','d','e']},{photoIds:['a'],inputMode:'name'},{kind:'enhance',inputMode:'name'},{kind:'content',photoIds:['a']}])('rechaza combinación inválida %j',invalid=>{
  expect(aiRequestSchema.safeParse({...request,...invalid}).success).toBe(false);
 });
});
