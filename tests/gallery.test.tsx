import { describe,it,expect } from 'vitest';
import { render,screen,fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft,draftSchema,draftPhotos,draftFromRecord,publicSnapshot,withPhotos } from '../functions/src/domain';
import { recoverySchema } from '../src/features/admin/recovery';
import { PlantGallery } from '../src/features/catalog/PlantGallery';
import { parseCatalog } from '../src/features/catalog/schema';
import plants from './fixtures/plants.json';
import categories from './fixtures/categories.json';
const photo=(id:string)=>({image:{src:'',alt:'Foto '+id},originalPath:'originals/local-admin/plant/'+id,approvedImagePath:''});
describe('galería por ficha',()=>{
 it('recupera fotos y orden, migra borradores previos y conserva la foto demo de detalle',()=>{
  const draft=withPhotos({...blankDraft('plant'),name:'Planta'},[photo('one'),photo('two')]);
  const recovered=recoverySchema.parse({draft,revision:1,status:'draft',dirty:true,savedAt:Date.now()});expect(draftPhotos(recovered.draft)).toEqual([{...photo('one'),enhanceInstructions:''},photo('two')]);
  const {gallery:_,...old}=draft;void _;expect(draftSchema.parse(old).gallery).toEqual([]);
  const detailImage={src:'/images/monstera-detail.png',alt:'Otra vista'};expect(draftFromRecord({...old,detailImage}).gallery[0].image).toEqual(detailImage);
 });
 it('cambia portada y publica exclusivamente URLs/alternativos, conservando originales privados',()=>{
  const draft=withPhotos({...blankDraft('plant'),name:'Planta'},[photo('two'),{...photo('one'),approvedImagePath:'proposals/plant/approved'}]);
  const pub=publicSnapshot(draft,['/public/cover','/public/second']);expect(pub.image).toEqual(pub.images[0]);expect(pub.images.map(p=>p.alt)).toEqual(['Foto two','Foto one']);expect(JSON.stringify(pub)).not.toMatch(/originals|proposals|approvedImagePath|gallery/);
  expect(()=>publicSnapshot(draft,['/public/cover'])).toThrow('incompleta');expect(withPhotos(draft,[]).gallery).toEqual([]);
  expect(draftSchema.safeParse({...draft,gallery:Array.from({length:10},()=>photo('many'))}).success).toBe(false);
 });
 it('valida imágenes estáticas y portada consistente',()=>{
  const data=structuredClone(plants) as {schemaVersion:number;plants:Record<string,unknown>[]};data.plants[0].images=[data.plants[0].image];expect(parseCatalog(data,categories).plants[0].images).toHaveLength(1);
  data.plants[0].images=[{src:'https://untrusted.test/image.png',alt:'Foto'}];expect(()=>parseCatalog(data,categories)).toThrow('.images');
 });
 it('navega por botones y teclado, recupera una imagen fallida al cambiar de foto',async()=>{
  const plant={...plants.plants[0],images:[{src:'/images/monstera.png',alt:'Portada de prueba'},{src:'/images/calathea.png',alt:'Detalle de prueba'}]};render(<PlantGallery plant={plant}/>);
  expect(screen.getByRole('img',{name:'Portada de prueba'})).toBeInTheDocument();await userEvent.click(screen.getByRole('button',{name:'Foto siguiente'}));expect(screen.getByRole('img',{name:'Detalle de prueba'})).toBeInTheDocument();
  fireEvent.error(screen.getByRole('img',{name:'Detalle de prueba'}));expect(screen.getByText('Imagen no disponible')).toBeInTheDocument();fireEvent.keyDown(screen.getByRole('group'),{key:'ArrowLeft'});expect(screen.getByRole('img',{name:'Portada de prueba'})).toBeInTheDocument();expect(screen.queryByText('Imagen no disponible')).not.toBeInTheDocument();
 });
});
