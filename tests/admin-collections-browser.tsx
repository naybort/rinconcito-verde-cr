// Development-only review fixture: no login, backend writes, secrets or AI calls.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Box, Button, Chip, Container, CssBaseline, Stack, ThemeProvider, Typography } from '@mui/material';
import { theme } from '../src/app/theme';
import { blankDraft, type PlantRecord } from '../functions/src/domain';
import { PlantList } from '../src/features/admin/PlantList';
import { Inventory } from '../src/features/admin/Inventory';
import { Labels } from '../src/features/admin/Labels';
import { Taxonomies } from '../src/features/admin/Taxonomies';
const names = ['Monstera Deliciosa', 'Sansevieria', 'Pastora', 'Calathea Orbifolia', 'Echeveria Elegans'];
const images = ['/images/monstera.png', '/images/sansevieria.png', '', '/images/calathea.png', '/images/echeveria.png'];
const plants: PlantRecord[] = Array.from({ length: 137 }, (_, i) => ({ ...blankDraft(`ficha-${String(i + 1).padStart(3, '0')}-0000-4000-a000-123456789012`), name: names[i % names.length], image: { src: i % 11 ? images[i % images.length] : '', alt: 'Fotografía de prueba' }, categoryIds: ['categoria-1'], careTemplateId: 'cuidados-1', revision: 1, status: i % 7 === 0 ? 'draft' : 'published', publishedRevision: i % 7 === 0 ? null : 1, updatedBy: 'fixture', updatedAt: new Date(2026, 0, i + 1).toISOString() }));
const stocks = plants.map(p => ({ plantId: p.id, presentation: 'general', available: 12, reserved: 2, priceCRC: 3500, location: 'Mesa 2' }));
const movements = plants.map((p, i) => ({ id: `movement-${i}`, plantId: p.id, presentation: 'general', type: 'entry', quantity: 12, reason: 'Ingreso de prueba', actor: 'fixture', at: p.updatedAt }));
const categories = Array.from({ length: 28 }, (_, i) => ({ id: `categoria-${i + 1}`, name: `Categoría ${i + 1}`, active: i % 5 !== 0, revision: 1 }));
function Fixture() {
 const [view, setView] = useState('Plantas'), [notice, setNotice] = useState('');
 const run = async () => { setNotice('Acción simulada. No se guardó ningún dato.'); return true; };
 return <ThemeProvider theme={theme}><CssBaseline/><Box sx={{ display: { md: 'grid' }, gridTemplateColumns: '220px minmax(0, 1fr)' }}>
  <Box component="nav" aria-label="Administración de prueba" sx={{ p: 2, borderRight: '1px solid', borderColor: 'divider' }}><Typography sx={{ fontWeight: 700, mb: 3 }}>Rinconcito Verde</Typography><Stack direction={{ xs: 'row', md: 'column' }} sx={{ gap: 1, flexWrap: 'wrap' }}>{['Plantas', 'Inventario', 'Etiquetas', 'Más'].map(name => <Button key={name} variant={name === view ? 'contained' : 'text'} onClick={() => { setView(name); setNotice(''); }}>{name}</Button>)}</Stack></Box>
  <Container maxWidth="lg" sx={{ py: 3, minWidth: 0 }}><Stack spacing={2}><Box><Chip label="Datos de prueba · 137 fichas" color="warning" variant="outlined"/></Box>{notice && <Alert onClose={() => setNotice('')}>{notice}</Alert>}
   <PlantList plants={plants} visible={view === 'Plantas'} onEdit={p => setNotice(`Editar ${p.name} · ${p.id}`)}/>
   {view === 'Inventario' && <Inventory plants={plants} stocks={stocks} movements={movements} run={run} busy={false}/>}
   {view === 'Etiquetas' && <Labels plants={plants.filter(p => p.publishedRevision != null)}/>}
   {view === 'Más' && <Taxonomies plants={plants} categories={categories} templates={categories.map(c => ({ ...c, id: c.id.replace('categoria', 'cuidados'), name: c.name.replace('Categoría', 'Cuidados') }))} run={run} busy={false}/>}
  </Stack></Container>
 </Box></ThemeProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
