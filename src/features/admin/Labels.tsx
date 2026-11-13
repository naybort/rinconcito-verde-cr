import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord } from '../../../functions/src/domain';
import { brandIconData, downloadBlob, loadImage } from '../../shared/brand/identity';
import { PlantPicker } from './PlantPicker';
import { CollectionPager, usePagedItems } from './collections';
import { createLabelSvg, labelDataUrl, labelLimits } from './labelTemplate';

type Prepared = { id: string; name: string; svg: string; src: string };
export function Labels({ plants }: { plants: PlantRecord[] }) {
 const [query, setQuery] = useState('');
 const [selected, setSelected] = useState<string[]>([]);
 const [copies, setCopies] = useState('1');
 const [width, setWidth] = useState('60');
 const [height, setHeight] = useState('50');
 const [result, setResult] = useState<{ key: string; labels: Prepared[] }>({ key: '', labels: [] });
 const [error, setError] = useState('');
 const [retry, setRetry] = useState(0);
 const printable = useMemo(() => plants.filter(p => selected.includes(p.id)).map(({ id, name }) => ({ id, name })), [plants, selected]);
 const validSize = Number.isInteger(+width) && +width >= labelLimits.minWidth && +width <= labelLimits.maxWidth && Number.isInteger(+height) && +height >= labelLimits.minHeight && +height <= labelLimits.maxHeight;
 const validCopies = Number.isInteger(+copies) && +copies >= 1 && +copies <= labelLimits.maxCopies;
 const key = JSON.stringify({ printable, width, height, retry });
 useEffect(() => {
  let active = true;
  setError('');
  if (!validSize || !printable.length) return;
  void (async () => {
   const icon = await brandIconData();
   const labels = await Promise.all(printable.map(async plant => {
    const svg = await createLabelSvg(plant, +width, +height, icon);
    const src = labelDataUrl(svg);
    // Preload the entire self-contained SVG before allowing print or download.
    await loadImage(src);
    return { ...plant, svg, src };
   }));
   if (active) setResult({ key, labels });
  })().catch(() => { if (active) setError('No se pudieron preparar las etiquetas. Revisá tu conexión y reintentá.'); });
  return () => { active = false; };
 }, [key, printable, width, height, validSize]);
 const ready = validSize && validCopies && printable.length > 0 && result.key === key && !error;
 const labels = ready ? result.labels : [];
 const copiesToPrint = labels.flatMap(label => Array.from({ length: +copies }, (_, copy) => ({ ...label, key: `${label.id}-${copy}` })));
 const preview = usePagedItems(copiesToPrint);
 const visibleLabels = new Set(preview.items.map(label => label.id));
 return <Stack spacing={2}>
  <Typography component="h1" variant="h2" className="no-print">Etiquetas por ficha</Typography>
  <Typography className="no-print">Las macetas de un mismo tipo comparten URL y QR. Elegí fichas que ya se hayan publicado.</Typography>
  <Box className="no-print"><PlantPicker plants={plants} selected={selected.filter(id => plants.some(p => p.id === id))} onChange={ids => { setSelected(ids); preview.reset(); }} query={query} onQuery={setQuery} label="fichas para etiquetas"/></Box>
  {!plants.length && <Alert severity="info" className="no-print">Publicá una ficha para preparar sus etiquetas.</Alert>}
  <Stack className="no-print" direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, flexWrap: 'wrap' }}>
   <TextField sx={{ minWidth: 150, flex: { sm: '1 1 150px' } }} label="Copias por ficha" type="number" value={copies} error={!validCopies} helperText="De 1 a 100" slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }} onChange={e => { setCopies(e.target.value); preview.reset(); }}/>
   <TextField sx={{ minWidth: 150, flex: { sm: '1 1 150px' } }} label="Ancho (mm)" type="number" value={width} error={!validSize} helperText="De 50 a 100 mm" slotProps={{ htmlInput: { min: 50, max: 100, step: 1 } }} onChange={e => setWidth(e.target.value)}/>
   <TextField sx={{ minWidth: 150, flex: { sm: '1 1 150px' } }} label="Alto (mm)" type="number" value={height} error={!validSize} helperText="De 45 a 150 mm" slotProps={{ htmlInput: { min: 45, max: 150, step: 1 } }} onChange={e => setHeight(e.target.value)}/>
   <Button variant="contained" disabled={!ready} onClick={() => window.print()}>Imprimir / guardar PDF</Button>
  </Stack>
  <Typography className="no-print" variant="body2" color="text.secondary">Imprimí al 100 % / tamaño real, sin encabezados ni pies de página. Probá una etiqueta con tu teléfono antes de imprimir un lote. El QR incluye un borde blanco que debe quedar libre.</Typography>
  {error && <Alert className="no-print" severity="error" action={<Button onClick={() => setRetry(n => n + 1)}>Reintentar</Button>}>{error}</Alert>}
  {!error && printable.length > 0 && validSize && validCopies && !ready && <Typography role="status" className="no-print">Preparando etiquetas…</Typography>}
  <Stack className="no-print" direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>{labels.filter(label => visibleLabels.has(label.id)).map(label => <Button key={label.id} variant="outlined" sx={{ overflowWrap: 'anywhere', maxWidth: '100%' }} onClick={() => downloadBlob(new Blob([label.svg], { type: 'image/svg+xml' }), `etiqueta-${label.id}.svg`)}>Descargar etiqueta de {label.name} · {label.id}</Button>)}</Stack>
  {ready && <Box className="no-print"><Typography variant="body2">{copiesToPrint.length} etiquetas para imprimir. Se imprimen todas las páginas de la vista previa.</Typography><CollectionPager paging={preview} label="vista previa de etiquetas"/></Box>}
  <Box className="labels" aria-label="Vista previa de etiquetas" sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '2mm', maxWidth: '100%', overflowX: 'auto' }}>
   {copiesToPrint.map((label, index) => <Box key={label.key} className="plant-label" sx={{ display: index >= preview.page * preview.size && index < (preview.page + 1) * preview.size ? 'block' : 'none', width: `${width}mm`, height: `${height}mm`, flexShrink: 0, breakInside: 'avoid' }}>
    <Box component="img" src={label.src} alt={`Etiqueta QR de ${label.name} · ${label.id}`} sx={{ width: '100%', height: '100%', display: 'block' }}/>
   </Box>)}
  </Box>
  {ready && <Box className="no-print"><CollectionPager paging={preview} label="vista previa de etiquetas" bottom/></Box>}
  <style>{`@media print {
   @page { margin: 8mm; }
   body { background: white !important; }
   body *:not(:has(.labels)):not(.labels):not(.labels *) { display: none !important; }
   .no-print { display: none !important; }
   body *:has(.labels) { display: block !important; position: static !important; height: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; border: 0 !important; }
   .labels, .labels * { visibility: visible; }
   .labels { display: flex !important; flex-wrap: wrap; gap: 2mm; overflow: visible !important; }
   .plant-label { display: block !important; break-inside: avoid; page-break-inside: avoid; }
  }`}</style>
 </Stack>;
}
