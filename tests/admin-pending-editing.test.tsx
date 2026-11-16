import { fireEvent, render, screen } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import { blankDraft, type PlantRecord } from '../functions/src/domain';
import Admin from '../src/features/admin/Admin';
import { toEditing, type Editing } from '../src/features/admin/PlantEditor';
import { hasPendingEditing } from '../src/features/admin/pendingEditing';
const plant:PlantRecord={...blankDraft('existing'),name:'Planta existente',revision:1,status:'draft',updatedAt:'',updatedBy:'admin'};
vi.mock('../src/lib/firebase',()=>({firebase:{auth:{},storage:{},db:{}},firebaseMode:'',command:vi.fn()}));
vi.mock('../src/features/admin/state',()=>({useAdmin:()=>({session:{user:{uid:'admin'},role:'admin'},loading:false,error:'',plants:[plant],categories:[],careTemplates:[],stocks:[],movements:[],jobs:[],setError:vi.fn()})}));
vi.mock('../src/features/admin/PlantEditor',async importOriginal=>({
 ...await importOriginal<typeof import('../src/features/admin/PlantEditor')>(),
 PlantEditor:({editing,setEditing}:{editing:Editing;setEditing:(value:Editing)=>void})=><div><span data-testid="editing-id">{editing.draft.id}</span><button onClick={()=>setEditing({...editing,inventory:{...editing.inventory,quantity:5,movementDirty:true}})}>Cambiar cantidad</button></div>
}));
it('inventario pendiente protege salida y cambio de ficha aunque el borrador esté guardado',()=>{
 render(<Admin/>);
 fireEvent.click(screen.getByRole('button',{name:'Plantas'}));
 fireEvent.click(screen.getByRole('button',{name:'Editar Planta existente · existing'}));
 fireEvent.click(screen.getByRole('button',{name:'Cambiar cantidad'}));
 const leaving=new Event('beforeunload',{cancelable:true});window.dispatchEvent(leaving);expect(leaving.defaultPrevented).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Agregar planta'}));
 expect(screen.getByRole('dialog')).toHaveTextContent('Guardar borrador no guarda el inventario');
 expect(screen.getByTestId('editing-id')).toHaveTextContent('existing');
 fireEvent.click(screen.getByRole('button',{name:'Descartar y continuar'}));
 expect(screen.getByTestId('editing-id')).not.toHaveTextContent('existing');
});
it('admite recuperación antigua y distingue stock guardado de campos editados',()=>{
 const editing=toEditing(plant);expect(hasPendingEditing(editing)).toBe(false);
 expect(hasPendingEditing({...editing,inventory:{...editing.inventory,presentationContext:'existing--general',price:'4500',potNumber:'12'}})).toBe(false);
 for(const inventory of [
  {...editing.inventory,movementDirty:true},
  {...editing.inventory,presentationEdits:{potNumber:true}},
  {...editing.inventory,reason:'Ingreso pendiente'},
  {...editing.inventory,price:'4500'}
 ])expect(hasPendingEditing({...editing,inventory})).toBe(true);
});
