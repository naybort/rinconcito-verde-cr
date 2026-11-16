import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { defaultLoadingSettings, loadingSettingsSchema, loadingTipsProposalSchema, type LoadingSettingsData } from '../../../functions/src/loadingSettings';
import type { Run } from './Inventory';
import { CollectionPager, usePagedItems } from './collections';
import { WateringLoader } from '../../shared/loading/WateringLoader';

type TipJob = { id: string; kind: string; status: string; proposal?: Record<string, unknown>; error?: string; createdAt?: string };
const animationLabels = { watering: 'Riego de plantas', leaves: 'Hojas en movimiento', none: 'Ilustración sin movimiento' };
const settingsFromResult = (result: unknown) => loadingSettingsSchema.safeParse(result && typeof result === 'object' ? (result as { settings?: unknown }).settings : undefined);

export function LoadingSettings({ run, busy, jobs }: { run: Run; busy: boolean; jobs: TipJob[] }) {
 const [value, setValue] = useState<LoadingSettingsData>(defaultLoadingSettings);
 const [loading, setLoading] = useState(true); const [loaded, setLoaded] = useState(false); const [attempt, setAttempt] = useState(0);
 const [dirty, setDirty] = useState(false); const [error, setError] = useState(''); const [preview, setPreview] = useState(false);
 const [prompt, setPrompt] = useState('Consejos breves y generales para observar y cuidar plantas en un hogar de Costa Rica.');
 const runRef = useRef(run); runRef.current = run;
 const pendingRead = useRef<Promise<unknown> | null>(null);
 const tips = usePagedItems(value.tips);
 const relatedJobs = jobs.filter(job => job.kind === 'loadingTips').slice().sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 5);
 const waiting = relatedJobs.some(job => ['queued', 'running'].includes(job.status));
 useEffect(() => {
  let cancelled = false;
  pendingRead.current ??= runRef.current('getLoadingSettings', {});
  void pendingRead.current.then(result => {
   if (cancelled) return;
   const parsed = settingsFromResult(result);
   if (parsed.success) { setValue(parsed.data); setLoaded(true); setError(''); }
   else setError('No pudimos cargar la configuración. Reintentá antes de guardar.');
  }).catch(() => { if (!cancelled) setError('No pudimos cargar la configuración. Reintentá antes de guardar.'); }).finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
 }, [attempt]);
 function change(patch: Partial<LoadingSettingsData>) { setValue(previous => ({ ...previous, ...patch })); setDirty(true); }
 function changeTip(id: string, patch: Partial<LoadingSettingsData['tips'][number]>) { change({ tips: value.tips.map(tip => tip.id === id ? { ...tip, ...patch } : tip) }); }
 async function save() {
  const parsed = loadingSettingsSchema.safeParse(value);
  if (!parsed.success) { setError('Completá título, subtítulo y textos de hasta 240 caracteres. Cada consejo activo debe estar revisado; máximo 30 consejos.'); return; }
  setError('');
  const result = settingsFromResult(await run('saveLoadingSettings', parsed.data));
  if (result.success) { setValue(result.data); setDirty(false); }
 }
 function importTips(candidate: unknown) {
  const proposal = loadingTipsProposalSchema.safeParse(candidate);
  if (!proposal.success) { setError('Esta propuesta no contiene consejos válidos.'); return; }
  const known = new Set(value.tips.map(tip => tip.text.trim().toLocaleLowerCase('es')));
  const added = proposal.data.tips.filter(text => { const key = text.toLocaleLowerCase('es'); if (known.has(key)) return false; known.add(key); return true; });
  if (value.tips.length + added.length > 30) { setError('Hay espacio para ' + (30 - value.tips.length) + ' consejos. Eliminá los que no necesites antes de agregar esta propuesta.'); return; }
  change({ tips: [...added.map(text => ({ id: crypto.randomUUID(), text, active: false, reviewed: false })), ...value.tips] }); tips.reset(); setError('');
 }
 return <Stack spacing={2}>
  <Typography component="h1" variant="h2">Pantalla de carga pública</Typography>
  <Typography color="text.secondary">Personalizá la bienvenida del catálogo. La pantalla privada de verificación de acceso conserva su presentación.</Typography>
  {loading && <Typography role="status">Cargando configuración…</Typography>}
  {error && <Alert severity="error">{error}{!dirty && <Button onClick={() => { pendingRead.current = null; setLoading(true); setError(''); setAttempt(previous => previous + 1); }}>Reintentar lectura</Button>}</Alert>}
  <Paper component="fieldset" disabled={busy || loading || !loaded} variant="outlined" sx={{ p: 2, m: 0, minWidth: 0 }}><Stack spacing={2}>
   <TextField label="Título de bienvenida" value={value.title} onChange={event => change({ title: event.target.value })} slotProps={{ htmlInput: { maxLength: 120 } }}/>
   <TextField label="Subtítulo de bienvenida" multiline value={value.subtitle} onChange={event => change({ subtitle: event.target.value })} slotProps={{ htmlInput: { maxLength: 240 } }}/>
   <TextField select label="Animación de bienvenida" value={value.animation} onChange={event => change({ animation: event.target.value as LoadingSettingsData['animation'] })}>{Object.entries(animationLabels).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField>
   <Typography component="h2" variant="h3">Consejos del vivero</Typography>
   <Typography variant="body2">En cada carga se elige un consejo activo al azar. Si no hay consejos activos, se muestra uno predeterminado. Editar un texto vuelve a desactivarlo hasta que lo revises.</Typography>
   <Button variant="outlined" disabled={value.tips.length >= 30} onClick={() => { change({ tips: [{ id: crypto.randomUUID(), text: '', active: false, reviewed: false }, ...value.tips] }); tips.reset(); }}>Agregar consejo manual</Button>
   <CollectionPager paging={tips} label="consejos de carga"/>
   {tips.items.map(tip => <Paper key={tip.id} component="section" aria-label={'Consejo ' + (value.tips.indexOf(tip) + 1)} variant="outlined" sx={{ p: 2 }}><Stack spacing={1}>
    <TextField multiline fullWidth label={'Texto del consejo ' + (value.tips.indexOf(tip) + 1)} value={tip.text} onChange={event => changeTip(tip.id, { text: event.target.value, reviewed: false, active: false })} slotProps={{ htmlInput: { maxLength: 240 } }}/>
    <Stack direction="row" sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
     <FormControlLabel control={<Checkbox checked={tip.reviewed} disabled={!tip.text.trim()} onChange={event => changeTip(tip.id, { reviewed: event.target.checked, ...(!event.target.checked ? { active: false } : {}) })}/>} label="Revisé este consejo"/>
     <FormControlLabel control={<Checkbox checked={tip.active} disabled={!tip.reviewed} onChange={event => changeTip(tip.id, { active: event.target.checked })}/>} label="Mostrar al público"/>
     <Button color="error" aria-label={'Eliminar consejo ' + (value.tips.indexOf(tip) + 1)} onClick={() => change({ tips: value.tips.filter(item => item.id !== tip.id) })}>Eliminar</Button>
    </Stack>
   </Stack></Paper>)}
   <CollectionPager paging={tips} label="consejos de carga" bottom/>
   <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
    <Button variant="contained" disabled={!dirty} onClick={() => void save()}>Guardar bienvenida</Button>
    <Button variant="outlined" onClick={() => setPreview(previous => !previous)}>{preview ? 'Cerrar vista previa' : 'Ver vista previa'}</Button>
    <Chip label={dirty ? 'Cambios sin guardar' : 'Configuración guardada'} variant="outlined"/>
   </Stack>
  </Stack></Paper>
  {preview && <Box aria-label="Vista previa de bienvenida" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden', '& .rv-loading-screen': { minHeight: 520 } }}><WateringLoader title={value.title} subtitle={value.subtitle} animation={value.animation} tip={value.tips.find(tip => tip.active && tip.reviewed)?.text}/></Box>}
  <Paper component="section" aria-labelledby="loading-tips-heading" variant="outlined" sx={{ p: 2 }}><Stack spacing={2}>
   <Typography id="loading-tips-heading" component="h2" variant="h3">Sugerir consejos con IA</Typography>
   <Typography variant="body2">La generación se solicita con este botón y consume un trabajo de tu cupo diario. Las propuestas quedan sin activar hasta que las edites, revises y guardes. Las visitas al catálogo nunca generan IA.</Typography>
   <TextField label="Instrucciones para los consejos" multiline minRows={2} value={prompt} onChange={event => setPrompt(event.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }}/>
   <Button variant="outlined" disabled={busy || loading || !loaded || waiting || prompt.trim().length < 3} onClick={() => void run('requestLoadingTips', { prompt: prompt.trim() })}>{waiting ? 'Preparando propuesta…' : 'Solicitar sugerencias de consejos'}</Button>
   {relatedJobs.map(job => <Paper variant="outlined" key={job.id} sx={{ p: 2 }}>
    {['queued', 'running'].includes(job.status) && <Typography role="status">Preparando consejos. Podés seguir editando.</Typography>}
    {job.status === 'failed' && <Alert severity="warning">{job.error || 'No se pudo preparar esta propuesta. Podés escribir los consejos manualmente.'}</Alert>}
    {job.status === 'ready' && (() => { const proposal = loadingTipsProposalSchema.safeParse(job.proposal); return proposal.success ? <Stack spacing={1}><Typography sx={{ fontWeight: 700 }}>Propuesta para revisar</Typography><Box component="ul" sx={{ pl: 3, m: 0 }}>{proposal.data.tips.map((text, index) => <li key={index}><Typography variant="body2">{text}</Typography></li>)}</Box><Button disabled={busy || loading || !loaded} onClick={() => importTips(proposal.data)}>Agregar como borradores</Button></Stack> : <Alert severity="warning">La propuesta no contiene consejos válidos.</Alert>; })()}
   </Paper>)}
  </Stack></Paper>
 </Stack>;
}
