import { useId, useState } from 'react';
import { Box, Button, Pagination, Stack, TextField, Typography } from '@mui/material';

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
export const byName = <T extends { name: string; id: string }>(a: T, b: T) => collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
export const matchesSearch = (query: string, ...values: string[]) => {
 const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 return normalize(values.join(' ')).includes(normalize(query.trim()));
};
export function usePagedItems<T>(items: T[]) {
 const [requestedPage, setPage] = useState(0);
 const [size, setSize] = useState(10);
 const pages = Math.max(1, Math.ceil(items.length / size));
 const page = Math.min(requestedPage, pages - 1);
 return { items: items.slice(page * size, (page + 1) * size), total: items.length, page, pages, size, setPage,
  reset: () => setPage(0), setSize: (next: number) => { setSize(next); setPage(0); } };
}
type Paging = Omit<ReturnType<typeof usePagedItems>, 'items' | 'reset'>;
export function CollectionPager({ paging, label, bottom = false }: { paging: Paging; label: string; bottom?: boolean }) {
 const id = useId();
 const { total, page, pages, size, setPage, setSize } = paging;
 if (bottom && pages < 2) return null;
 return <Stack component="nav" aria-label={`Paginación de ${label}${bottom ? ' al final' : ''}`} direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', py: 1 }}>
  {!bottom && <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
   <Typography variant="body2" role="status">{total ? page * size + 1 : 0}–{Math.min((page + 1) * size, total)} de {total}</Typography>
   <TextField id={id} select size="small" label="Por página" value={size} onChange={e => setSize(Number(e.target.value))} slotProps={{ select: { native: true } }} sx={{ width: 104 }}>{[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}</TextField>
  </Stack>}
  {pages > 1 && <Pagination aria-label={`Páginas de ${label}`} count={pages} page={page + 1} onChange={(_, value) => setPage(value - 1)} siblingCount={0} boundaryCount={1} color="primary" getItemAriaLabel={(type, n, selected) => type === 'page' ? `${selected ? 'Página actual, ' : 'Ir a la '}página ${n}` : type === 'previous' ? 'Página anterior' : type === 'next' ? 'Página siguiente' : type === 'first' ? 'Primera página' : 'Última página'} sx={{ '& .MuiPaginationItem-root': { minWidth: { xs: 32, sm: 36 }, height: 40, mx: .25 } }}/>}
 </Stack>;
}
export function CollectionEmpty({ onClear }: { onClear?: () => void }) {
 return <Box sx={{ p: 3, border: '1px dashed', borderColor: 'divider', borderRadius: 2, textAlign: 'center' }}><Typography color="text.secondary">No hay resultados con estos filtros.</Typography>{onClear && <Button onClick={onClear} sx={{ mt: 1 }}>Limpiar filtros</Button>}</Box>;
}
