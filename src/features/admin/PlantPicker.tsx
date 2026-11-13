import { useState, type ReactNode } from 'react';
import { Box, Button, Checkbox, Paper, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord } from '../../../functions/src/domain';
import { byName, CollectionEmpty, CollectionPager, matchesSearch, usePagedItems } from './collections';
import { PlantIdentity } from './PlantIdentity';

export function PlantPicker({ plants, selected, onChange, query, onQuery, label, maxSelection, renderDetails }: { plants: PlantRecord[]; selected: string[]; onChange: (ids: string[]) => void; query: string; onQuery: (query: string) => void; label: string; maxSelection?: number; renderDetails?: (plant: PlantRecord) => ReactNode }) {
 const [onlySelected, setOnlySelected] = useState(false);
 const filtered = plants.filter(p => matchesSearch(query, p.name, p.id) && (!onlySelected || selected.includes(p.id))).sort(byName);
 const paging = usePagedItems(filtered);
 const pageIds = paging.items.map(p => p.id);
 const union = [...new Set([...selected, ...pageIds])];
 return <Stack spacing={1}>
  <TextField type="search" label="Buscar ficha o ID" value={query} onChange={e => { onQuery(e.target.value); paging.reset(); }}/>
  <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}><Typography variant="body2" role="status">{selected.length} seleccionadas{maxSelection ? ` · máximo ${maxSelection}` : ''}</Typography><Button size="small" aria-pressed={onlySelected} onClick={() => { setOnlySelected(!onlySelected); paging.reset(); }}>{onlySelected ? 'Ver todas' : 'Ver selección'}</Button><Button size="small" disabled={!selected.length} onClick={() => onChange([])}>Limpiar selección</Button><Button size="small" disabled={!pageIds.length || union.length === selected.length || !!maxSelection && union.length > maxSelection} onClick={() => onChange(union)}>Seleccionar esta página</Button></Stack>
  <CollectionPager paging={paging} label={label}/>
  <Box role="list" aria-label={label} sx={{ display: 'grid', gap: 1 }}>{paging.items.map(p => <Paper role="listitem" key={p.id} component="label" variant="outlined" sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', borderColor: selected.includes(p.id) ? 'primary.main' : 'divider' }}>
   <Checkbox slotProps={{ input: { 'aria-label': p.name, 'aria-description': `ID: ${p.id}` } }} checked={selected.includes(p.id)} disabled={!selected.includes(p.id) && !!maxSelection && selected.length >= maxSelection} onChange={() => onChange(selected.includes(p.id) ? selected.filter(id => id !== p.id) : [...selected, p.id])}/><Box sx={{ flex: 1, minWidth: 0 }}><PlantIdentity plant={p}/>{renderDetails?.(p)}</Box>
  </Paper>)}</Box>
  {!filtered.length && <CollectionEmpty onClear={query || onlySelected ? () => { onQuery(''); setOnlySelected(false); paging.reset(); } : undefined}/>}
  <CollectionPager paging={paging} label={label} bottom/>
 </Stack>;
}
