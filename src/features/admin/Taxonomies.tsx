import { useState } from 'react';
import { Alert, Button, FormControlLabel, Checkbox, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { blankDraft, type Taxonomy, type PlantRecord } from '../../../functions/src/domain';
import type { Run } from './Inventory';
export const careLabels={light:'Luz',watering:'Riego',humidity:'Humedad',temperature:'Temperatura'} as const;
export function Taxonomies({categories,templates,plants,run,busy}:{categories:Taxonomy[];templates:Taxonomy[];plants:PlantRecord[];run:Run;busy:boolean}){
 const [kind,setKind]=useState<'categories'|'careTemplates'>('categories');const empty=():Taxonomy=>({id:crypto.randomUUID(),name:'',active:true,revision:0});const [value,setValue]=useState<Taxonomy>(empty);
 const impact=plants.filter(p=>kind==='categories'?p.categoryIds.includes(value.id):p.careTemplateId===value.id);
 return <Stack spacing={2}><Typography component="h1" variant="h2">Categorías y cuidados</Typography>
 <TextField select label="Administrar" value={kind} onChange={e=>{setKind(e.target.value as typeof kind);setValue(empty());}}><MenuItem value="categories">Categorías</MenuItem><MenuItem value="careTemplates">Cuidados reutilizables</MenuItem></TextField>
 <Stack direction="row" sx={{gap:1,flexWrap:'wrap'}}>{(kind==='categories'?categories:templates).map(t=><Button key={t.id} variant={t.id===value.id?'contained':'outlined'} onClick={()=>setValue(t)}>{t.name}{!t.active?' (archivada)':''}</Button>)}<Button onClick={()=>setValue(empty())}>Crear nuevo</Button></Stack>
 <Paper component="fieldset" disabled={busy} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}>
 <TextField label="ID estable" value={value.id} disabled/><TextField label="Nombre" value={value.name} onChange={e=>setValue({...value,name:e.target.value})}/><FormControlLabel label="Activo" control={<Checkbox checked={value.active} onChange={e=>setValue({...value,active:e.target.checked})}/>}/>
 {kind==='careTemplates'&&<>{Object.entries(careLabels).map(([key,label])=><TextField key={key} label={label} multiline value={value.care?.[key as keyof typeof careLabels]??''} onChange={e=>setValue({...value,care:{...(value.care??blankDraft('new').care),[key]:e.target.value}})}/>)}<TextField label="Fuente de los cuidados (URL HTTPS)" value={value.sources?.[0]?.url??''} onChange={e=>setValue({...value,sources:e.target.value?[{title:'Fuente de cuidados',url:e.target.value,accessedAt:new Date().toISOString().slice(0,10)}]:[]})}/></>}
 <Alert severity="info">{impact.length} fichas relacionadas: {impact.map(p=>p.name).join(', ')||'ninguna'}. Los cuidados publicados conservan su versión. Cada ficha debe aplicar la plantilla, revisarse y publicarse de nuevo.</Alert>
 <Button variant="contained" disabled={busy||!value.name.trim()} onClick={async()=>{const result=await run('saveTaxonomy',{kind,...value,...(kind==='careTemplates'?{care:value.care??blankDraft('new').care,sources:value.sources??[]}:{})}) as {taxonomy?:Taxonomy}|undefined;if(result?.taxonomy)setValue(result.taxonomy);}}>Guardar {kind==='categories'?'categoría':'cuidados'}</Button>
 </Stack></Paper></Stack>;
}
