import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AIAssistant } from '../src/features/admin/AIAssistant';
import { blankDraft, withPhotos, type AIKind, type Draft, type Taxonomy } from '../functions/src/domain';
import type { Run } from '../src/features/admin/Inventory';
import type { Job } from '../src/features/admin/state';
vi.mock('../src/lib/firebase',()=>({firebase:null,firebaseMode:''}));
vi.mock('../src/features/admin/PrivatePhoto',()=>({PrivatePhoto:()=>null}));
const jobId='b413e7ba-345d-4361-9cd8-d78a4dc836cc';
const category:Taxonomy={id:'interior',name:'Interior',active:true,revision:1};
const proposal={name:'Nombre sugerido',description:'Descripción propuesta',categoryIds:['interior'],categorySuggestions:['Tropicales'],care:{light:'Luz propuesta',watering:'Riego propuesto',humidity:'Humedad propuesta',temperature:'Temperatura propuesta'},warnings:'Advertencia propuesta',sources:[{title:'Fuente real',url:'https://example.test/planta',accessedAt:'2026-11-16',verification:'verified'},{title:'Nota para revisar',url:'https://no-verificada.test',verification:'unverified'}],uncertainty:'Revisá el resultado'};
const contentJob:Job&{inputMode:'name';confirmedName:string}={id:jobId,plantId:'monstera',revision:3,status:'ready',kind:'content',inputMode:'name',confirmedName:'Monstera deliciosa',proposal};
function draft(){const d=blankDraft('monstera');return {...d,name:'Mi nombre humano',description:'Descripción humana',care:{...d.care,light:'Luz humana'},ai:{...d.ai,confirmedName:'Monstera deliciosa'}};}
function setup({kind='content',initial=draft(),jobs=[],dirty=false,run=vi.fn<Run>().mockResolvedValue({jobId}),onCreateCategory=vi.fn()}:{kind?:AIKind;initial?:Draft;jobs?:Job[];dirty?:boolean;run?:Run;onCreateCategory?:(name:string)=>void}={}){
 let current=initial;const set=vi.fn();
 function Harness(){const [value,setValue]=useState(initial);current=value;return <><label>Editar descripción humana<input value={value.description} onChange={event=>setValue({...value,description:event.target.value})}/></label><AIAssistant kind={kind} draft={value} revision={3} dirty={dirty} busy={false} blocked={false} nextStep="" canSave save={()=>{}} jobs={jobs} run={run} set={patch=>{set(patch);setValue({...value,...patch});}} categories={[category]} onCreateCategory={onCreateCategory}/></>;}
 render(<Harness/>);return {current:()=>current,run,set,onCreateCategory};
}
describe('asistencia contextual explícita',()=>{
 it('no genera al abrir ni editar; permite identificación por nombre sin fotografía',async()=>{
  const {run}=setup({kind:'identify'});expect(run).not.toHaveBeenCalled();expect(screen.getByRole('radio',{name:'A partir del nombre'})).toBeChecked();
  fireEvent.change(screen.getByLabelText('Instrucciones adicionales · Identificación'),{target:{value:'Compará el nombre común'}});expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Sugerir identificación'}));await waitFor(()=>expect(run).toHaveBeenCalledOnce());
  expect(run).toHaveBeenCalledWith('requestAI',expect.objectContaining({inputMode:'name',confirmedName:'Mi nombre humano',additionalInstructions:'Compará el nombre común'}));expect(vi.mocked(run).mock.calls[0][1]).not.toHaveProperty('photoIds');
 });
 it('solo envía las fotografías seleccionadas y limita a cuatro sin alterar las imágenes',async()=>{
  const initial=withPhotos(draft(),Array.from({length:5},(_,i)=>({image:{src:'',alt:`Foto ${i+1}`},originalPath:`private/admin/monstera/${i+1}.png`,approvedImagePath:''})));const {run,current}=setup({kind:'identify',initial});
  const boxes=screen.getAllByRole('checkbox');expect(boxes[0]).toBeChecked();for(const box of boxes.slice(1,4))fireEvent.click(box);expect(boxes[4]).toBeDisabled();expect(run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Sugerir identificación'}));await waitFor(()=>expect(run).toHaveBeenCalledOnce());
  expect(run).toHaveBeenCalledWith('requestAI',expect.objectContaining({inputMode:'photos',photoIds:[1,2,3,4].map(i=>`private/admin/monstera/${i}.png`)}));expect(current()).toEqual(initial);
 });
 it('muestra candidatos y solo confirma la sugerencia elegida',()=>{
  const job={id:jobId,plantId:'monstera',revision:3,status:'ready',kind:'identify',proposal:{scientificName:'Monstera deliciosa',commonName:'Costilla de Adán',uncertainty:'Confirmar',alternatives:[{scientificName:'Monstera adansonii',commonName:'Adansonii',uncertainty:'Otra posibilidad'}]}};
  const {current,run,set}=setup({kind:'identify',jobs:[job]});expect(current().name).toBe('Mi nombre humano');expect(set).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Usar Adansonii'}));expect(current().name).toBe('Adansonii');expect(current().ai.confirmedName).toBe('Monstera adansonii');expect(run).not.toHaveBeenCalled();
 });
 it('completa únicamente vacíos y conserva todo el texto humano aunque se edite durante la propuesta',()=>{
  const {current,run,set}=setup({jobs:[contentJob],dirty:true});expect(screen.getByRole('checkbox',{name:'Aplicar descripción (reemplaza lo escrito)'})).not.toBeChecked();
  expect(screen.getByRole('checkbox',{name:'Aplicar riego'})).toBeChecked();expect(screen.getByRole('checkbox',{name:'Aplicar luz (reemplaza lo escrito)'})).not.toBeChecked();
  fireEvent.click(screen.getByRole('button',{name:'Aplicar campos seleccionados al borrador'}));
  expect(current()).toMatchObject({name:'Mi nombre humano',description:'Descripción humana',care:{light:'Luz humana',watering:'Riego propuesto'},ai:{confirmedName:'Monstera deliciosa',contentJobId:jobId}});
  expect(set.mock.calls[0][0]).not.toHaveProperty('name');expect(set.mock.calls[0][0]).not.toHaveProperty('description');expect(run).not.toHaveBeenCalled();
 });
 it('descarta una selección de reemplazo cuando la persona modifica después ese campo',()=>{
  const {current}=setup({jobs:[contentJob],dirty:true});fireEvent.click(screen.getByRole('checkbox',{name:'Aplicar descripción (reemplaza lo escrito)'}));
  expect(screen.getByRole('checkbox',{name:'Aplicar descripción (reemplaza lo escrito)'})).toBeChecked();fireEvent.change(screen.getByLabelText('Editar descripción humana'),{target:{value:'Nueva descripción mientras reviso'}});
  expect(screen.getByRole('checkbox',{name:'Aplicar descripción (reemplaza lo escrito)'})).not.toBeChecked();fireEvent.click(screen.getByRole('button',{name:'Aplicar campos seleccionados al borrador'}));expect(current().description).toBe('Nueva descripción mientras reviso');
 });
 it('reemplaza contenido existente solamente después de marcarlo y no habilita propuestas vencidas',()=>{
  const {current}=setup({jobs:[{...contentJob,revision:2},contentJob],dirty:true});const boxes=screen.getAllByRole('checkbox',{name:'Aplicar descripción (reemplaza lo escrito)'});expect(boxes[0]).toBeDisabled();fireEvent.click(boxes[1]);
  const apply=screen.getAllByRole('button',{name:'Aplicar campos seleccionados al borrador'});expect(apply[0]).toBeDisabled();fireEvent.click(apply[1]);expect(current().description).toBe('Descripción propuesta');
 });
 it('distingue fuentes verificadas y abre creación revisable de categorías sin guardar automáticamente',()=>{
  const {run,onCreateCategory}=setup({jobs:[contentJob]});expect(screen.getByText('Fuentes verificadas')).toBeVisible();expect(screen.getByText('Referencias sin verificar')).toBeVisible();expect(screen.getByRole('link',{name:'Fuente real'})).toHaveAttribute('href','https://example.test/planta');expect(screen.queryByRole('link',{name:'Nota para revisar'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Crear categoría «Tropicales»'}));expect(onCreateCategory).toHaveBeenCalledWith('Tropicales');expect(run).not.toHaveBeenCalled();
 });
 it('la generación de cuidados no requiere una foto, pero exige identificación confirmada',()=>{
  setup({initial:{...draft(),ai:{...draft().ai,confirmedName:''}}});expect(screen.getByRole('button',{name:'Proponer contenido con fuentes'})).toBeDisabled();expect(screen.getByText(/Confirmá o corregí la identificación/)).toBeVisible();
 });
});
