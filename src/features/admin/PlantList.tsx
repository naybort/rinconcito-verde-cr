import { useState } from 'react';
import { Box, Button, Chip, Paper, Stack, TextField, Typography } from '@mui/material';
import type { PlantRecord } from '../../../functions/src/domain';
import { statusLabels } from './uiLabels';
import { byName, CollectionEmpty, CollectionPager, matchesSearch, usePagedItems } from './collections';
import { PlantIdentity } from './PlantIdentity';

export function PlantList({ plants, onEdit, visible = true }: { plants: PlantRecord[]; onEdit: (plant: PlantRecord) => void; visible?: boolean }) {
 const [query, setQuery] = useState(''), [status, setStatus] = useState(''), [sort, setSort] = useState('name');
 const filtered = plants.filter(p => matchesSearch(query, p.name, p.id) && (!status || p.status === status)).sort((a, b) => (sort === 'recent' ? b.updatedAt.localeCompare(a.updatedAt) : 0) || byName(a, b));
 const paging = usePagedItems(filtered);
 if (!visible) return null;
 const clear = () => { setQuery(''); setStatus(''); paging.reset(); };
 return <Stack spacing={1.5}><Typography component="h1" variant="h2">Plantas</Typography>
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField type="search" fullWidth label="Buscar por nombre o ID" value={query} onChange={e => { setQuery(e.target.value); paging.reset(); }}/><TextField select label="Ordenar por" value={sort} onChange={e => { setSort(e.target.value); paging.reset(); }} slotProps={{ select: { native: true } }} sx={{ minWidth: 190 }}><option value="name">Nombre (A–Z)</option><option value="recent">Cambios recientes</option></TextField></Stack>
  <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>{[['', 'Todas'], ['draft', 'Borradores'], ['review', 'En revisión'], ['published', 'Publicadas'], ['archived', 'Archivadas']].map(([id, label]) => <Button key={id} aria-pressed={status === id} variant={status === id ? 'contained' : 'outlined'} onClick={() => { setStatus(id); paging.reset(); }}>{label} ({id ? plants.filter(p => p.status === id).length : plants.length})</Button>)}</Stack>
  <CollectionPager paging={paging} label="plantas"/>
  <Box role="list" aria-label="Fichas de plantas" sx={{ display: 'grid', gap: 1 }}>{paging.items.map(p => <Paper role="listitem" key={p.id} variant="outlined" sx={{ p: 1.5, display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'minmax(0, 1fr) auto' }, alignItems: 'center', gap: 1.5 }}>
   <PlantIdentity plant={p}/><Stack direction="row" sx={{ alignItems: 'center', gap: 1, ml: { xs: 'auto', sm: 0 } }}><Chip size="small" label={statusLabels[p.status]} color={p.status === 'published' ? 'success' : 'default'} variant="outlined"/><Button aria-label={`Editar ${p.name} · ${p.id}`} onClick={() => onEdit(p)}>Editar</Button></Stack>
  </Paper>)}</Box>
  {!filtered.length && <CollectionEmpty onClear={query || status ? clear : undefined}/>}
  <CollectionPager paging={paging} label="plantas" bottom/>
 </Stack>;
}
