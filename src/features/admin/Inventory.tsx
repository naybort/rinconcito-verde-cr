import { useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord, Stock, MovementInput } from '../../../functions/src/domain';
import { movementLabels } from './uiLabels';
import { emptyInventory, type InventoryDraft } from './workflow';
import type { Movement } from './state';
export type Run=(action:string,payload:unknown)=>Promise<unknown>;
export function Inventory({plants,stocks,movements,run,busy,draft,onChange,scopedPlantId}:{draft?:InventoryDraft;onChange?:(draft:InventoryDraft)=>void;scopedPlantId?:string;plants:PlantRecord[];stocks:Stock[];movements:Movement[];run:Run;busy:boolean}){
 const [local,setLocal]=useState<InventoryDraft>(emptyInventory);const current=draft??local;
 const update=(patch:Partial<InventoryDraft>)=>{const next={...current,...patch};if(onChange)onChange(next);else setLocal(next);};
 const {presentation,quantity,type,reason,query,price,location}=current;const ids=scopedPlantId?[scopedPlantId]:current.ids;

 const filtered=plants.filter(p=>p.status!=='archived'&&(!scopedPlantId||p.id===scopedPlantId)&&`${p.name} ${p.id}`.toLowerCase().includes(query.toLowerCase()));
 return <Stack spacing={2}><Typography component={scopedPlantId?"h3":"h1"} variant="h2">Inventario</Typography><Alert severity="info">Cantidades por ficha y presentación. Consultar por WhatsApp no descuenta existencias.</Alert>
 <TextField label="Buscar ficha o ID" value={query} onChange={e=>update({query:e.target.value})} sx={{display:scopedPlantId?'none':undefined}}/>
 {filtered.map(p=><Paper key={p.id} variant="outlined" sx={{p:2}}><FormControlLabel label={p.name} control={<Checkbox checked={ids.includes(p.id)} disabled={!!scopedPlantId} onChange={()=>update({ids:ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id]})}/>}/>{stocks.filter(s=>s.plantId===p.id).map(s=><Typography key={s.presentation}>{s.presentation}: {s.available} disponibles · {s.reserved} reservadas {s.priceCRC!=null?`· ₡${s.priceCRC}`:''} {s.location?`· ${s.location}`:''}</Typography>)}</Paper>)}
 <Paper component="fieldset" disabled={busy} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}><Typography component="h2" variant="h3">Movimiento para {ids.length} fichas</Typography>
 <TextField label="Presentación (ID)" value={presentation} onChange={e=>update({presentation:e.target.value})} helperText="Ejemplo: general, pequena, maceta-20cm. Mismo ID en cada movimiento."/>
 <TextField select label="Movimiento" value={type} onChange={e=>update({type:e.target.value as MovementInput['type']})}>{[['entry','Entrada'],['reserve','Reserva'],['release','Liberar reserva'],['sale','Venta disponible'],['reserved-sale','Venta reservada'],['loss','Baja'],['adjust','Ajuste (+/-)']].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
 <TextField label="Cantidad por ficha" type="number" value={quantity} onChange={e=>update({quantity:Number(e.target.value)})}/><TextField label="Motivo" value={reason} onChange={e=>update({reason:e.target.value})}/>
 <Button variant="contained" disabled={busy||!ids.length||reason.trim().length<3||!quantity} onClick={async()=>{const result=await run('inventory',{items:ids.map(plantId=>({plantId,presentation,type,quantity,reason}))});if(result){update({reason:'',ids:[]});}}}>Registrar movimiento</Button>
 <Typography variant="body2">El lote se guarda completo o se rechaza completo. Máximo 30 fichas.</Typography>
 <TextField label="Precio CRC (opcional, entero)" type="number" value={price} onChange={e=>update({price:e.target.value})}/><TextField label="Ubicación" value={location} onChange={e=>update({location:e.target.value})}/>
 <Button disabled={busy||ids.length!==1} onClick={()=>void run('presentation',{plantId:ids[0],presentation,priceCRC:price===''?null:Number(price),location})}>Guardar presentación de la ficha seleccionada</Button>
 </Stack></Paper><Typography component="h2" variant="h3">Historial reciente</Typography>
 {movements.filter(m=>!scopedPlantId||m.plantId===scopedPlantId).slice().sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50).map(m=><Paper key={m.id} variant="outlined" sx={{p:2}}><Typography>{m.plantId} · {m.presentation} · {movementLabels[m.type]} · {m.quantity}</Typography><Typography variant="body2">{m.reason} · {new Date(m.at).toLocaleString('es-CR')} · {m.actor}</Typography></Paper>)}
 </Stack>;
}
