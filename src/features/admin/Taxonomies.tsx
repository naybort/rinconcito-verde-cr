import { useState } from 'react';
import { Alert, Box, Button, Chip, FormControlLabel, Checkbox, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { blankDraft, type Taxonomy, type PlantRecord } from '../../../functions/src/domain';
import type { Run } from './Inventory';
import { byName, CollectionEmpty, CollectionPager, matchesSearch, usePagedItems } from './collections';
import { PlantIdentity } from './PlantIdentity';
export const careLabels={light:'Luz',watering:'Riego',humidity:'Humedad',temperature:'Temperatura'} as const;
export function Taxonomies({categories,templates,plants,run,busy}:{categories:Taxonomy[];templates:Taxonomy[];plants:PlantRecord[];run:Run;busy:boolean}){
 const [kind,setKind]=useState<'categories'|'careTemplates'>('categories');const empty=():Taxonomy=>({id:crypto.randomUUID(),name:'',active:true,revision:0});const [value,setValue]=useState<Taxonomy>(empty);
 const [query,setQuery]=useState('');
 const items=usePagedItems((kind==='categories'?categories:templates).filter(t=>matchesSearch(query,t.name,t.id)).slice().sort(byName));
 const impact=usePagedItems(plants.filter(p=>kind==='categories'?p.categoryIds.includes(value.id):p.careTemplateId===value.id).sort(byName));
 return <Stack spacing={2}><Typography component="h1" variant="h2">Categorías y cuidados</Typography>
 <TextField select label="Administrar" value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setValue(empty());setQuery('');items.reset();impact.reset();}}><MenuItem value="categories">Categorías</MenuItem><MenuItem value="careTemplates">Cuidados reutilizables</MenuItem></TextField>
 <Stack direction={{xs:'column',sm:'row'}} spacing={1.5}><TextField type="search" fullWidth label="Buscar categoría o cuidado" value={query} onChange={e=>{setQuery(e.target.value);items.reset();}}/><Button variant="outlined" sx={{flexShrink:0}} onClick={()=>{setValue(empty());impact.reset();}}>Crear nuevo</Button></Stack>
 <CollectionPager paging={items} label="categorías y cuidados"/>
 <Box role="list" aria-label="Categorías y cuidados" sx={{display:'grid',gap:1}}>{items.items.map(t=><Paper role="listitem" key={t.id} variant="outlined" sx={{p:1.5,display:'flex',alignItems:'center',gap:1,flexWrap:'wrap',borderColor:t.id===value.id?'primary.main':'divider'}}><Box sx={{flex:1,minWidth:120}}><Typography sx={{fontWeight:700,overflowWrap:'anywhere'}}>{t.name}</Typography><Typography variant="caption" color="text.secondary" sx={{overflowWrap:'anywhere'}}>ID: {t.id}</Typography></Box><Chip size="small" variant="outlined" label={t.active?'Activa':'Archivada'}/><Button aria-label={`Editar ${t.name} · ${t.id}`} onClick={()=>{setValue(t);impact.reset();}}>Editar</Button></Paper>)}</Box>
 {!items.total&&<CollectionEmpty onClear={query?()=>{setQuery('');items.reset();}:undefined}/>}
 <CollectionPager paging={items} label="categorías y cuidados" bottom/>
 <Paper component="fieldset" disabled={busy} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}>
 <TextField label="ID estable" value={value.id} disabled/><TextField label="Nombre" value={value.name} onChange={e=>setValue({...value,name:e.target.value})}/><FormControlLabel label="Activo" control={<Checkbox checked={value.active} onChange={e=>setValue({...value,active:e.target.checked})}/>}/>
 {kind==='careTemplates'&&<>{Object.entries(careLabels).map(([key,label])=><TextField key={key} label={label} multiline value={value.care?.[key as keyof typeof careLabels]??''} onChange={e=>setValue({...value,care:{...(value.care??blankDraft('new').care),[key]:e.target.value}})}/>)}<TextField label="Fuente de los cuidados (URL HTTPS)" value={value.sources?.[0]?.url??''} onChange={e=>setValue({...value,sources:e.target.value?[{title:'Fuente de cuidados',url:e.target.value,accessedAt:new Date().toISOString().slice(0,10)}]:[]})}/></>}
 <Alert severity="info">{impact.total} fichas relacionadas. Los cuidados publicados conservan su versión. Cada ficha debe aplicar la plantilla, revisarse y publicarse de nuevo.</Alert>
 <Button variant="contained" disabled={busy||!value.name.trim()} onClick={async()=>{const result=await run('saveTaxonomy',{kind,...value,...(kind==='careTemplates'?{care:value.care??blankDraft('new').care,sources:value.sources??[]}:{})}) as {taxonomy?:Taxonomy}|undefined;if(result?.taxonomy)setValue(result.taxonomy);}}>Guardar {kind==='categories'?'categoría':'cuidados'}</Button>
 </Stack></Paper>
 {impact.total>0&&<Box component="section" aria-label="Fichas relacionadas"><Typography component="h2" variant="h3">Fichas relacionadas</Typography><CollectionPager paging={impact} label="fichas relacionadas"/><Stack spacing={1}>{impact.items.map(p=><Paper key={p.id} variant="outlined" sx={{p:1.5}}><PlantIdentity plant={p}/></Paper>)}</Stack><CollectionPager paging={impact} label="fichas relacionadas" bottom/></Box>}
 </Stack>;
}
