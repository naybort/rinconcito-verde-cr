import { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord, Stock, MovementInput } from '../../../functions/src/domain';
import { movementLabels } from './uiLabels';
import { emptyInventory, type InventoryDraft } from './workflow';
import type { Movement } from './state';
import { PlantPicker } from './PlantPicker';
import { PlantIdentity } from './PlantIdentity';
import { CollectionEmpty, CollectionPager, matchesSearch, usePagedItems } from './collections';
export type Run=(action:string,payload:unknown)=>Promise<unknown>;
const crc = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
const metadataFields = ['price', 'location', 'potNumber'] as const;
type MetadataField = typeof metadataFields[number];
type Metadata = Record<MetadataField, string>;
const metadataOf = (stock?: Stock): Metadata => ({ price: stock?.priceCRC == null ? '' : String(stock.priceCRC), location: stock?.location ?? '', potNumber: stock?.potNumber ?? '' });
const metadataKey = (metadata: Metadata) => JSON.stringify(metadata);

export function Inventory({plants,stocks,movements,run,busy,draft,onChange,scopedPlantId}:{draft?:InventoryDraft;onChange?:(draft:InventoryDraft)=>void;scopedPlantId?:string;plants:PlantRecord[];stocks:Stock[];movements:Movement[];run:Run;busy:boolean}){
 const [local,setLocal]=useState<InventoryDraft>(emptyInventory);const current=draft??local;
 const update=(patch:Partial<InventoryDraft>)=>{const next={...current,...patch};if(onChange)onChange(next);else setLocal(next);};
 const {presentation,quantity,type,reason,query}=current;const eligible=plants.filter(p=>p.status!=='archived'&&(!scopedPlantId||p.id===scopedPlantId));const ids=(scopedPlantId?[scopedPlantId]:current.ids).filter(id=>eligible.some(p=>p.id===id));
 const [pendingTarget, setPendingTarget] = useState<Partial<InventoryDraft> | null>(null);
 const [savedMetadata, setSavedMetadata] = useState<{ context: string; source: string; values: Metadata } | null>(null);
 const [metadataError, setMetadataError] = useState('');
 const [savingMetadata, setSavingMetadata] = useState(false);
 const metadataLock = useRef(false);
 const [savingMovement, setSavingMovement] = useState(false);
 const [movementError, setMovementError] = useState('');
 const movementLock = useRef(false);
 const pending = busy || savingMetadata || savingMovement;
 const singleId = ids.length === 1 ? ids[0] : '';
 const context = singleId ? JSON.stringify([singleId, presentation]) : '';
 const existing = stocks.find(stock => stock.plantId === singleId && stock.presentation === presentation);
 const rawMetadata = metadataOf(existing);
 // Keep an acknowledged save visible while the Firestore subscription catches up.
 const baseline = savedMetadata?.context === context && savedMetadata.source === metadataKey(rawMetadata) ? savedMetadata.values : rawMetadata;
 const sameContext = !!context && current.presentationContext === context;
 const legacyContext = !!context && !current.presentationContext;
 const edited = Object.fromEntries(metadataFields.map(field => [field, sameContext ? !!current.presentationEdits?.[field] && current[field] !== baseline[field] : legacyContext && !!current[field] && current[field] !== baseline[field]])) as Record<MetadataField, boolean>;
 const values = Object.fromEntries(metadataFields.map(field => [field, edited[field] ? current[field] : baseline[field]])) as Metadata;
 const hasEdits = metadataFields.some(field => edited[field]);
 const presentationValid = /^[a-z0-9][a-z0-9-]{0,79}$/.test(presentation);
 const priceValid = values.price === '' || (/^\d+$/.test(values.price) && Number.isSafeInteger(Number(values.price)) && Number(values.price) <= 100000000);
 const metadataValid = priceValid && values.location.length <= 200 && values.potNumber.length <= 40;
 const registered = stocks.filter(stock => stock.plantId === singleId).slice().sort((a,b) => a.presentation.localeCompare(b.presentation, 'es', { numeric: true }));
 const changeMetadata = (field: MetadataField, value: string) => {
  if (!singleId || busy || metadataLock.current || movementLock.current) return;
  setMetadataError('');
  update({ ...values, [field]: value, presentationContext: context, presentationEdits: { ...edited, [field]: value !== baseline[field] } });
 };
 const applyTarget = (patch: Partial<InventoryDraft>) => {
  setMetadataError('');
  update({ ...patch, price: '', location: '', potNumber: '', presentationContext: '', presentationEdits: {} });
 };
 const changeTarget = (patch: Partial<InventoryDraft>) => {
  if (busy || metadataLock.current || movementLock.current) return;
  const nextIds = scopedPlantId ? ids : patch.ids ?? ids;
  const nextContext = nextIds.length === 1 ? JSON.stringify([nextIds[0], patch.presentation ?? presentation]) : '';
  if (nextContext === context) { update(patch); return; }
  if (hasEdits) setPendingTarget(patch); else applyTarget(patch);
 };
 async function savePresentation() {
  if (metadataLock.current || movementLock.current || busy || !singleId || !presentationValid || !metadataValid || !hasEdits) return;
  metadataLock.current = true; setSavingMetadata(true); setMetadataError('');
  const payload: { plantId: string; presentation: string; priceCRC?: number | null; location?: string; potNumber?: string } = { plantId: singleId, presentation };
  if (edited.price) payload.priceCRC = values.price === '' ? null : Number(values.price);
  if (edited.location) payload.location = values.location.trim();
  if (edited.potNumber) payload.potNumber = values.potNumber.trim();
  try {
   const result = await run('presentation', payload);
   if (result) {
    const confirmed = typeof result === 'object' && result !== null && 'stock' in result ? result.stock as Stock | undefined : undefined;
    const acknowledged = confirmed?.plantId === singleId && confirmed.presentation === presentation ? metadataOf(confirmed) : { price: values.price, location: values.location.trim(), potNumber: values.potNumber.trim() };
    setSavedMetadata({ context, source: metadataKey(rawMetadata), values: acknowledged });
    update({ ...acknowledged, presentationContext: context, presentationEdits: {} });
   }
  } catch { setMetadataError('No se pudo guardar la presentación. Tus cambios siguen en el formulario.'); }
  finally { metadataLock.current = false; setSavingMetadata(false); }
 }

 const movementValid = !!ids.length && ids.length <= 30 && presentationValid && reason.trim().length >= 3 && Number.isSafeInteger(quantity) && !!quantity && Math.abs(quantity) <= 100000 && (type === 'adjust' || quantity >= 1);
 const changeMovement = (patch: Pick<Partial<InventoryDraft>, 'type' | 'quantity' | 'reason'>) => {
  if (busy || metadataLock.current || movementLock.current) return;
  setMovementError(''); update({ ...patch, movementDirty: true });
 };
 async function saveMovement() {
  if (busy || metadataLock.current || movementLock.current || !movementValid) return;
  movementLock.current = true; setSavingMovement(true); setMovementError('');
  try {
   const result = await run('inventory', { items: ids.map(plantId => ({ plantId, presentation, type, quantity, reason })) });
   if (result) update({ reason: '', movementDirty: false, ...(hasEdits ? {} : { ids: [] }) });
  } catch { setMovementError('No se pudo registrar el movimiento. Tus cambios siguen en el formulario.'); }
  finally { movementLock.current = false; setSavingMovement(false); }
 }

 const [historyQuery,setHistoryQuery]=useState('');
 const plantById=new Map(plants.map(p=>[p.id,p]));
 const history=usePagedItems(movements.filter(m=>(!scopedPlantId||m.plantId===scopedPlantId)&&matchesSearch(historyQuery,m.plantId,plantById.get(m.plantId)?.name??'',m.reason,m.presentation)).slice().sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id)));
 const stockDetails=(p:PlantRecord)=>{const rows=stocks.filter(s=>s.plantId===p.id).slice().sort((a,b)=>a.presentation.localeCompare(b.presentation,'es',{numeric:true}));return <Box sx={{mt:1,display:'grid',gap:1}}>{rows.length?rows.map(s=><Box key={s.presentation} sx={{borderLeft:'3px solid',borderColor:'divider',pl:1.25}}><Typography variant="body2" sx={{fontWeight:700,overflowWrap:'anywhere'}}>Presentación: {s.presentation}{s.potNumber?` · Maceta n.º ${s.potNumber}`:''}</Typography><Typography variant="body2" sx={{overflowWrap:'anywhere'}}><strong>{s.available} disponibles</strong> · {s.reserved} reservadas · {s.priceCRC!=null?crc.format(s.priceCRC):'Sin precio'}{s.location?` · ${s.location}`:''}</Typography></Box>):<Typography variant="body2" color="text.secondary">Sin existencias registradas</Typography>}</Box>;};
 return <Stack spacing={2}><Typography component={scopedPlantId?"h3":"h1"} variant="h2">Inventario</Typography><Alert severity="info">Cantidades por ficha y presentación. Consultar por WhatsApp no descuenta existencias. El QR corresponde a la ficha de catálogo.</Alert>
 {!scopedPlantId?<Box component="fieldset" aria-label="Selección de fichas" disabled={pending} sx={{border:0,p:0,m:0,minWidth:0}}><PlantPicker plants={eligible} selected={ids} onChange={next=>changeTarget({ids:next})} query={query} onQuery={query=>update({query})} label="fichas de inventario" maxSelection={30} renderDetails={stockDetails}/></Box>:eligible.map(p=><Paper key={p.id} variant="outlined" sx={{p:2}}><PlantIdentity plant={p}/>{stockDetails(p)}</Paper>)}
 <Paper component="fieldset" aria-label="Presentación a registrar" disabled={pending} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}>
  <Typography component="h2" variant="h3">Presentación a registrar</Typography>
  {!!registered.length&&<TextField select disabled={pending} label="Usar presentación existente" value={registered.some(stock=>stock.presentation===presentation)?presentation:''} onChange={e=>changeTarget({presentation:e.target.value})}><MenuItem value="" disabled>Elegir presentación</MenuItem>{registered.map(stock=><MenuItem key={stock.presentation} value={stock.presentation}>{stock.presentation}{stock.potNumber?` · Maceta n.º ${stock.potNumber}`:''}</MenuItem>)}</TextField>}
  <TextField label="Presentación (ID)" value={presentation} error={!presentationValid} onChange={e=>changeTarget({presentation:e.target.value})} helperText="Ejemplo: general, pequena, maceta-20cm. Usá el mismo ID para sus datos y movimientos." slotProps={{htmlInput:{maxLength:80}}}/>
 </Stack></Paper>
 <Paper component="fieldset" aria-label="Movimiento de inventario" disabled={pending} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}><Typography component="h2" variant="h3">Movimiento para {ids.length} fichas</Typography>
 <TextField select disabled={pending} label="Movimiento" value={type} onChange={e=>changeMovement({type:e.target.value as MovementInput['type']})}>{[['entry','Entrada'],['reserve','Reserva'],['release','Liberar reserva'],['sale','Venta disponible'],['reserved-sale','Venta reservada'],['loss','Baja'],['adjust','Ajuste (+/-)']].map(([v,l])=><MenuItem key={v} value={v}>{l}</MenuItem>)}</TextField>
 <TextField label="Cantidad por ficha" type="number" value={quantity} onChange={e=>changeMovement({quantity:Number(e.target.value)})}/><TextField label="Motivo" value={reason} onChange={e=>changeMovement({reason:e.target.value})} slotProps={{htmlInput:{maxLength:500}}}/>
 {movementError&&<Alert severity="error">{movementError}</Alert>}
 <Button variant="contained" disabled={pending||!movementValid} onClick={()=>void saveMovement()}>Registrar movimiento</Button>
 {current.movementDirty&&<Typography role="status" variant="body2">Tenés un movimiento de inventario sin registrar.</Typography>}
 <Typography variant="body2">El lote se guarda completo o se rechaza completo. Máximo 30 fichas. Las cantidades cambian únicamente al registrar un movimiento.</Typography>
 </Stack></Paper>
 <Paper component="fieldset" aria-label="Datos de la presentación" disabled={pending||!singleId} variant="outlined" sx={{p:2,m:0,minWidth:0}}><Stack spacing={2}>
  <Typography component="h2" variant="h3">Datos de la presentación</Typography>
  <Typography variant="body2" color="text.secondary">{singleId?`${plantById.get(singleId)?.name??singleId} · ${presentation}`:'Elegí una sola ficha para editar su presentación.'}</Typography>
  <TextField label="Número de maceta" value={values.potNumber} onChange={e=>changeMetadata('potNumber',e.target.value)} helperText="Atributo compartido de esta presentación, por ejemplo 12 o 20 cm. No identifica cada unidad." slotProps={{htmlInput:{maxLength:40}}}/>
  <TextField label="Precio CRC (opcional, entero)" type="number" value={values.price} error={!priceValid} onChange={e=>changeMetadata('price',e.target.value)} helperText={priceValid?'Vacío significa sin precio. Se muestra al público solo si lo autorizaste en la ficha publicada.':'Usá un precio entero entre 0 y 100 000 000.'} slotProps={{htmlInput:{min:0,max:100000000,step:1}}}/>
  <TextField label="Ubicación" value={values.location} onChange={e=>changeMetadata('location',e.target.value)} slotProps={{htmlInput:{maxLength:200}}}/>
  {metadataError&&<Alert severity="error">{metadataError}</Alert>}
  <Button variant="outlined" disabled={pending||!singleId||!presentationValid||!metadataValid||!hasEdits} onClick={()=>void savePresentation()}>Guardar presentación de la ficha seleccionada</Button>
  {hasEdits&&<Typography role="status" variant="body2">Tenés cambios de presentación sin guardar.</Typography>}
 </Stack></Paper>
 <Typography component="h2" variant="h3">Historial reciente</Typography>
 <TextField type="search" label="Buscar en el historial" value={historyQuery} onChange={e=>{setHistoryQuery(e.target.value);history.reset();}} helperText="Nombre o ID de planta, presentación o motivo"/>
 <CollectionPager paging={history} label="movimientos"/>
 <Box role="list" aria-label="Historial de movimientos" sx={{display:'grid',gap:1}}>{history.items.map(m=><Paper role="listitem" key={m.id} variant="outlined" sx={{p:1.5}}>{plantById.has(m.plantId)?<PlantIdentity plant={plantById.get(m.plantId)!}/>:<Typography sx={{overflowWrap:'anywhere'}}>ID: {m.plantId}</Typography>}<Typography sx={{mt:1,overflowWrap:'anywhere'}}>{m.presentation} · {movementLabels[m.type]} · {m.quantity}</Typography><Typography variant="body2" color="text.secondary" sx={{overflowWrap:'anywhere'}}>{m.reason} · {new Date(m.at).toLocaleString('es-CR')} · {m.actor}</Typography></Paper>)}</Box>
 {!history.total&&<CollectionEmpty onClear={historyQuery?()=>{setHistoryQuery('');history.reset();}:undefined}/>}
 <CollectionPager paging={history} label="movimientos" bottom/>
 <Dialog open={pendingTarget!==null} onClose={()=>setPendingTarget(null)} aria-labelledby="inventory-target-title"><DialogTitle id="inventory-target-title">Cambios de presentación sin guardar</DialogTitle><DialogContent><Typography>Guardá los datos de esta presentación antes de elegir otra, o descartá esos cambios para continuar.</Typography></DialogContent><DialogActions><Button onClick={()=>setPendingTarget(null)}>Seguir editando</Button><Button onClick={()=>{if(pendingTarget)applyTarget(pendingTarget);setPendingTarget(null);}}>Descartar y cambiar</Button></DialogActions></Dialog>
 </Stack>;
}
