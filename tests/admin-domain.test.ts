import { describe,it,expect } from 'vitest';
import { blankDraft,draftSchema,assertPublishable,moveStock,plantUrl,publicSnapshot,proposalSchema } from '../functions/src/domain';
describe('administración: contratos críticos',()=>{
 it('QR por ficha inmutable, sin ejemplares',()=>{expect(plantUrl('sansevieria')).toBe('https://rinconcito-verde-cr.web.app/#/plantas/sansevieria');expect(()=>plantUrl('../secret')).toThrow();});
 it('rechaza cantidades negativas y reservas mayores al saldo',()=>{const stock={plantId:'a',presentation:'general',available:3,reserved:0};expect(()=>moveStock(stock,{plantId:'a',presentation:'general',type:'reserve',quantity:4,reason:'test'})).toThrow();expect(()=>moveStock(stock,{plantId:'a',presentation:'general',type:'entry',quantity:-1,reason:'test'})).toThrow();});
 it('publicación incompleta no avanza y campos privados nunca entran al snapshot',()=>{const d=blankDraft('test');expect(()=>assertPublishable(d)).toThrow();d.notes='privado';d.originalPath='originals/a/test/id';expect(publicSnapshot(d,'/images/test.png')).not.toHaveProperty('notes');expect(publicSnapshot(d,'/images/test.png')).not.toHaveProperty('originalPath');});
 it('validación estricta impide agregar rol, inventario o precio desde borrador/IA',()=>{expect(draftSchema.safeParse({...blankDraft('test'),name:'Test',role:'admin'}).success).toBe(false);expect(proposalSchema.safeParse({price:10,stock:10}).success).toBe(false);});
});

import { recoverySchema } from '../src/features/admin/recovery';
it('recupera campos todavía incompletos sin aceptar esa fuente para guardar en backend',()=>{
 const draft={...blankDraft('draft'),sources:[{title:'',url:'https://',accessedAt:''}]};
 expect(recoverySchema.safeParse({draft,revision:0,status:'draft',dirty:true,savedAt:Date.now()}).success).toBe(true);
 expect(draftSchema.safeParse(draft).success).toBe(false);
});
