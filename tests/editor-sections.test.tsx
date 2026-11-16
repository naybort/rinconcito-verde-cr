import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { blankDraft, type Draft, type PlantRecord, type Taxonomy } from '../functions/src/domain';
import { PlantEditor, toEditing, type Editing } from '../src/features/admin/PlantEditor';
import type { InventoryDraft } from '../src/features/admin/workflow';
import type { Run } from '../src/features/admin/Inventory';

vi.mock('../src/lib/firebase',()=>({firebase:null,firebaseMode:''}));
vi.mock('../src/features/admin/PhotoManager',()=>({PhotoManager:()=> <div>Galería editable</div>}));
vi.mock('../src/features/admin/DraftPhotoGallery',()=>({DraftPhotoGallery:()=> <div>Galería de revisión</div>}));
vi.mock('../src/features/admin/PrivatePhoto',()=>({PrivatePhoto:()=>null}));
vi.mock('../src/features/admin/AIAssistant',()=>({AIAssistant:({kind,blocked,run}:{kind:string;blocked:boolean;run:Run})=> <section aria-label={`Asistencia ${kind}`}><button disabled={blocked} onClick={()=>void run('requestAI',{kind})}>Solicitar {kind}</button></section>}));
vi.mock('../src/features/admin/Inventory',()=>({Inventory:({draft,onChange}:{draft:InventoryDraft;onChange:(value:InventoryDraft)=>void})=> <label>Motivo pendiente<input value={draft.reason} onChange={event=>onChange({...draft,reason:event.target.value})}/></label>}));
const category:Taxonomy={id:'interior',name:'Interior',active:true,revision:2};
function plant():PlantRecord{return {...blankDraft('monstera'),name:'Monstera',description:'Descripción humana',categoryIds:['interior'],care:{light:'Luz indirecta',watering:'Cada semana',humidity:'Media',temperature:'Templada'},image:{src:'/monstera.jpg',alt:'Monstera'},revision:3,status:'draft',updatedBy:'admin',updatedAt:'2026-11-16'};}
function setup({initial=toEditing(plant()),role='admin',run=vi.fn<Run>(),templates=[]}:{initial?:Editing;role?:string;run?:Run;templates?:Taxonomy[]}={}){
 let last=initial;
 function Harness(){const [editing,setEditing]=useState<Editing|null>(initial);if(!editing)return null;last=editing;return <PlantEditor editing={editing} setEditing={setEditing} categories={[category]} templates={templates} jobs={[]} uid="admin" role={role} run={run} busy={false} plants={[plant()]} stocks={[]} movements={[]} onLabels={()=>{}}/>;}
 render(<Harness/>);return {run,current:()=>last};
}
function section(index:number){fireEvent.click(within(screen.getByRole('navigation',{name:'Secciones de la ficha',hidden:true})).getAllByRole('button',{hidden:true})[index]);}

describe('editor de tres secciones',()=>{
 it('mantiene campos manuales y asistencia visible sin generar al escribir o navegar',()=>{
  const {run,current}=setup();
  expect(screen.getByText('Sección 1 de 3 · Podés volver sin perder lo escrito')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Completar manualmente'})).not.toBeInTheDocument();
  for(const kind of ['identify','content','enhance'])expect(screen.getByRole('region',{name:`Asistencia ${kind}`})).toBeVisible();
  fireEvent.change(screen.getByLabelText('Descripción',{exact:true}),{target:{value:'Edición humana pendiente'}});
  section(1);fireEvent.change(screen.getByLabelText('Motivo pendiente'),{target:{value:'Entrada nueva'}});section(2);
  expect(screen.getByText('Galería de revisión')).toBeVisible();expect(screen.getByText('Edición humana pendiente')).toBeVisible();
  section(1);expect(screen.getByLabelText('Motivo pendiente')).toHaveValue('Entrada nueva');section(0);
  expect(screen.getByLabelText('Descripción',{exact:true})).toHaveValue('Edición humana pendiente');expect(current().dirty).toBe(true);expect(run).not.toHaveBeenCalled();
 });
 it('autoriza los precios solo al seleccionar la opción y guarda sin publicar',async()=>{
  const run=vi.fn<Run>().mockImplementation(async(action,payload)=>{
   if(action!=='savePlant')return;
   return {plant:{...plant(),...(payload as {draft:Draft}).draft,revision:4}};
  });const {current}=setup({run});section(1);
  const price=screen.getByRole('checkbox',{name:'Mostrar precios en el catálogo público'});expect(price).not.toBeChecked();fireEvent.click(price);
  expect(current().draft.showPrice).toBe(true);expect(run).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Guardar borrador'}));
  await waitFor(()=>expect(screen.getByText('Versión 4')).toBeVisible());expect(run).toHaveBeenCalledTimes(1);
  expect(run).toHaveBeenCalledWith('savePlant',expect.objectContaining({draft:expect.objectContaining({showPrice:true})}));expect(screen.getByRole('checkbox',{name:'Mostrar precios en el catálogo público'})).toBeChecked();
 });
 it('crea y edita categorías sin salir ni perder el texto pendiente',async()=>{
  const run=vi.fn<Run>().mockImplementation(async(action,payload)=>action==='saveTaxonomy'?{taxonomy:{...(payload as Taxonomy),revision:(payload as Taxonomy).revision+1}}:undefined);
  const {current}=setup({run});fireEvent.change(screen.getByLabelText('Descripción',{exact:true}),{target:{value:'No perder'}});
  fireEvent.click(screen.getByRole('button',{name:'Crear categoría'}));fireEvent.change(screen.getByLabelText('Nombre de la categoría',{exact:false}),{target:{value:'Tropicales'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar categoría'}));await waitFor(()=>expect(screen.queryByRole('dialog',{hidden:true})).not.toBeInTheDocument());
  expect(await screen.findByRole('checkbox',{name:'Tropicales'})).toBeChecked();expect(current().draft.categoryIds).toHaveLength(2);expect(screen.getByLabelText('Descripción',{exact:true})).toHaveValue('No perder');
  fireEvent.click(screen.getByRole('button',{name:'Editar categoría Interior'}));fireEvent.change(screen.getByLabelText('Nombre de la categoría',{exact:false}),{target:{value:'Dentro de casa'}});fireEvent.click(screen.getByRole('button',{name:'Guardar categoría'}));
  await waitFor(()=>expect(screen.queryByRole('dialog',{hidden:true})).not.toBeInTheDocument());expect(await screen.findByRole('checkbox',{name:'Dentro de casa'})).toBeChecked();
  expect(run).toHaveBeenLastCalledWith('saveTaxonomy',expect.objectContaining({id:'interior',revision:2,name:'Dentro de casa'}));expect(run).not.toHaveBeenCalledWith('savePlant',expect.anything());
 });
 it('no concede gestión de categorías a un editor',async()=>{
  const run=vi.fn<Run>().mockResolvedValue(undefined);setup({run,role:'editor'});
  expect(screen.queryByRole('button',{name:'Crear categoría'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Editar categoría Interior'})).not.toBeInTheDocument();expect(screen.getByRole('checkbox',{name:'Interior'})).toBeEnabled();
 });
 it('conserva la categoría escrita y la ficha ante un fallo de guardado',async()=>{
  const run=vi.fn<Run>().mockRejectedValue(new Error('Sin conexión'));const {current}=setup({run});
  fireEvent.click(screen.getByRole('button',{name:'Crear categoría'}));fireEvent.change(screen.getByLabelText('Nombre de la categoría',{exact:false}),{target:{value:'Orquídeas pendientes'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar categoría'}));await waitFor(()=>expect(screen.getByText('No se pudo guardar la categoría. El nombre que escribiste se conserva.')).toBeVisible());
  expect(screen.getByLabelText('Nombre de la categoría',{exact:false})).toHaveValue('Orquídeas pendientes');expect(current().draft.categoryIds).toEqual(['interior']);
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));await waitFor(()=>expect(screen.queryByRole('dialog',{hidden:true})).not.toBeInTheDocument());await screen.findByRole('button',{name:'Crear categoría'});expect(current().draft.name).toBe('Monstera');
 });
 it('acepta una referencia escrita sin URL y retira verificación cuando se edita',()=>{
  const initial=toEditing(plant());initial.draft.sources=[{title:'Fuente acreditada',url:'https://example.test/botany',accessedAt:'2026-11-16',verification:'verified'}];
  const {current,run}=setup({initial});expect(screen.getByText('Fuente verificada')).toBeVisible();
  fireEvent.change(screen.getByLabelText('Referencia 1',{exact:true}),{target:{value:'Nota modificada'}});expect(current().draft.sources[0].verification).toBe('unverified');expect(screen.queryByText('Fuente verificada')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Agregar referencia'}));fireEvent.change(screen.getByLabelText('Referencia 2',{exact:true}),{target:{value:'Observación del vivero: hojas nuevas'}});
  expect(current().draft.sources[1]).toEqual({title:'Observación del vivero: hojas nuevas',url:'',accessedAt:'',verification:'unverified'});expect(run).not.toHaveBeenCalled();
 });
 it('una plantilla solo completa cuidados vacíos y conserva referencias humanas',()=>{
  const initial=toEditing(plant());initial.draft.care.watering='';initial.draft.careTemplateId='tropical';initial.draft.sources=[{title:'Nota humana',verification:'unverified'}];
  const template:Taxonomy={id:'tropical',name:'Tropical',active:true,revision:1,care:{light:'Luz de plantilla',watering:'Riego sugerido',humidity:'Humedad de plantilla',temperature:'Temperatura de plantilla'},sources:[{title:'Referencia plantilla',verification:'unverified'}]};
  const {current,run}=setup({initial,templates:[template]});fireEvent.click(screen.getByRole('button',{name:'Completar campos vacíos con la plantilla'}));
  expect(current().draft.care).toEqual({...initial.draft.care,watering:'Riego sugerido'});expect(current().draft.sources).toEqual(initial.draft.sources);expect(run).not.toHaveBeenCalled();
 });
 it('separa guardar, enviar a revisión y publicar con confirmación humana de la versión',async()=>{
  let record=plant();const run=vi.fn<Run>().mockImplementation(async(action,payload)=>{record={...record,...(action==='savePlant'?(payload as {draft:Draft}).draft:{}),revision:record.revision+1,status:action==='review'?'review':action==='publish'?'published':'draft'};return {plant:record};});
  setup({run});section(2);expect(screen.getByRole('button',{name:'Publicar ficha'})).toBeDisabled();expect(screen.getByRole('checkbox',{name:'Revisé identificación, cuidados, fuentes y fotografía'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Enviar a revisión'}));await waitFor(()=>expect(screen.getByText('Versión 4')).toBeVisible());expect(screen.getByRole('button',{name:'Publicar ficha'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox',{name:'Revisé identificación, cuidados, fuentes y fotografía'}));expect(screen.getByRole('button',{name:'Publicar ficha'})).toBeEnabled();
  section(0);fireEvent.change(screen.getByLabelText('Descripción',{exact:true}),{target:{value:'Cambio posterior a la revisión'}});section(2);expect(screen.getByRole('checkbox',{name:'Revisé identificación, cuidados, fuentes y fotografía'})).not.toBeChecked();expect(screen.getByRole('button',{name:'Publicar ficha'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Guardar borrador'}));await waitFor(()=>expect(screen.getByText('Versión 5')).toBeVisible());fireEvent.click(screen.getByRole('button',{name:'Enviar a revisión'}));await waitFor(()=>expect(screen.getByText('Versión 6')).toBeVisible());
  fireEvent.click(screen.getByRole('checkbox',{name:'Revisé identificación, cuidados, fuentes y fotografía'}));fireEvent.click(screen.getByRole('button',{name:'Publicar ficha'}));await waitFor(()=>expect(screen.getByText('Versión 7')).toBeVisible());
  expect(run.mock.calls.map(([action])=>action)).toEqual(['review','savePlant','review','publish']);
 });
});
