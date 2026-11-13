import { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord, Stock, MovementInput } from '../../../functions/src/domain';
import { movementLabels } from './uiLabels';
import { emptyInventory, type InventoryDraft } from './workflow';
import type { Movement } from './state';
import { PlantPicker } from './PlantPicker';
import { PlantIdentity } from './PlantIdentity';
import { CollectionEmpty, CollectionPager, matchesSearch, usePagedItems } from './collections';
export type Run=(action:string,payload:unknown)=>Promise<unknown>;
export function Inventory({plants,stocks,movements,run,busy,draft,onChange,scopedPlantId}:{draft?:InventoryDraft;onChange?:(draft:InventoryDraft)=>void;scopedPlantId?:string;plants:PlantRecord[];stocks:Stock[];movements:Movement[];run:Run;busy:boolean}){
 const [local,setLocal]=useState<InventoryDraft>(emptyInventory);const current=draft??local;
 const update=(patch:Partial<InventoryDraft>)=>{const next={...current,...patch};if(onChange)onChange(next);else setLocal(next);};
 const {presentation,quantity,type,reason,query,price,location}=current;const eligible=plants.filter(p=>p.status!=='archived'&&(!scopedPlantId||p.id===scopedPlantId));const ids=(scopedPlantId?[scopedPlantId]:current.ids).filter(id=>eligible.some(p=>p.id===id));

 const [historyQuery,setHistoryQuery]=useState('');
 const plantById=new Map(plants.map(p=>[p.id,p]));
 const history=usePagedItems(movements.filter(m=>(!scopedPlantId||m.plantId===scopedPlantId)&&matchesSearch(historyQuery,m.plantId,plantById.get(m.plantId)?.name??'',m.reason,m.presentation)).slice().sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)));
 const stockDetails=(p:PlantRecord)=>{const rows=stocks.filter(s=>s.plantId===p.id);return <Box sx={{mt:1}}>{rows.length?rows.map(s=><Typography key={s.presentation} variant="body2" sx={{overflowWrap:'anywhere'}}>{s.presentation}: <strong>{s.available} disponibles</strong> · {s.reserved} reservadas {s.priceCRC!=null?`· ₡${s.priceCRC}`:''} {s.location?`· ${s.location}`:''}</Typography>):<Typography variant="body2" color="text.secondary">Sin existencias registradas</Typography>}</Box>;};
 return <Stack spacing={2}><Typography component={scopedPlantId?"h3":"h1"} variant="h2">Inventario</Typography><Alert severity="info">Cantidades por ficha y presentación. Consultar por WhatsApp no descuenta existencias.</Alert>
 {!scopedPlantId?<PlantPicker plants={eligible} selected={ids} onChange={next=>update({ids:next})} query={query} onQuery={query=>update({query})} label="fichas de inventario" maxSelection={30} renderDetails={stockDetails}/>:eligible.map(p=><Paper key={p.id} variant="outlined" sx={{p:2}}><PlantIdentity plant={p}/>{stockDetails(p)}</Paper>)}
 <Paper component="fieldset" disabled={busy} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}><Typography component="h2" variant="h3">Movimiento para {ids.length} fichas</Typography>
 <TextField label="Presentación (ID)" value={presentation} onChange={e=>update({presentation:e.target.value})} helperText="Ejemplo: general, pequena, maceta-20cm. Mismo ID en cada movimiento."/>
 <TextField select label="Movimiento" value={type} onChange={e=>update({type:e.target.value as MovementInput['type']})}>{[['entry','Entrada'],['reserve','Reserva'],['release','Liberar reserva'],['sale','Venta disponible'],['reserved-sale','Venta reservada'],['loss','Baja'],['adjust','Ajuste (+/-)']].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
 <TextField label="Cantidad por ficha" type="number" value={quantity} onChange={e=>update({quantity:Number(e.target.value)})}/><TextField label="Motivo" value={reason} onChange={e=>update({reason:e.target.value})}/>
 <Button variant="contained" disabled={busy||!ids.length||ids.length>30||reason.trim().length<3||!quantity} onClick={async()=>{const result=await run('inventory',{items:ids.map(plantId=>({plantId,presentation,type,quantity,reason}))});if(result){update({reason:'',ids:[]});}}}>Registrar movimiento</Button>
 <Typography variant="body2">El lote se guarda completo o se rechaza completo. Máximo 30 fichas.</Typography>
 <TextField label="Precio CRC (opcional, entero)" type="number" value={price} onChange={e=>update({price:e.target.value})}/><TextField label="Ubicación" value={location} onChange={e=>update({location:e.target.value})}/>
 <Button disabled={busy||ids.length!==1} onClick={()=>void run('presentation',{plantId:ids[0],presentation,priceCRC:price===''?null:Number(price),location})}>Guardar presentación de la ficha seleccionada</Button>
 </Stack></Paper><Typography component="h2" variant="h3">Historial reciente</Typography>
 <TextField type="search" label="Buscar en el historial" value={historyQuery} onChange={e=>{setHistoryQuery(e.target.value);history.reset();}} helperText="Nombre o ID de planta, presentación o motivo"/>
 <CollectionPager paging={history} label="movimientos"/>
 <Box role="list" aria-label="Historial de movimientos" sx={{display:'grid',gap:1}}>{history.items.map(m=><Paper role="listitem" key={m.id} variant="outlined" sx={{p:1.5}}>{plantById.has(m.plantId)?<PlantIdentity plant={plantById.get(m.plantId)!}/>:<Typography sx={{overflowWrap:'anywhere'}}>ID: {m.plantId}</Typography>}<Typography sx={{mt:1,overflowWrap:'anywhere'}}>{m.presentation} · {movementLabels[m.type]} · {m.quantity}</Typography><Typography variant="body2" color="text.secondary" sx={{overflowWrap:'anywhere'}}>{m.reason} · {new Date(m.at).toLocaleString('es-CR')} · {m.actor}</Typography></Paper>)}</Box>
 {!history.total&&<CollectionEmpty onClear={historyQuery?()=>{setHistoryQuery('');history.reset();}:undefined}/>}
 <CollectionPager paging={history} label="movimientos" bottom/>

 </Stack>;
}
