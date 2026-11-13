// Development-only fixture; not an application route and not included in dist.
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, Box, Container } from '@mui/material';
import { theme } from '../src/app/theme';
import { Labels } from '../src/features/admin/Labels';
import { blankDraft, type PlantRecord } from '../functions/src/domain';
const records: PlantRecord[] = [
 { ...blankDraft('sansevieria'), name: 'Sansevieria', revision: 1, status: 'published', updatedBy: 'fixture', updatedAt: '', publishedRevision: 1 },
 { ...blankDraft('a'.repeat(80)), name: 'Planta de nombre largo '.repeat(5).trim(), revision: 1, status: 'published', updatedBy: 'fixture', updatedAt: '', publishedRevision: 1 },
];
createRoot(document.getElementById('root')!).render(<ThemeProvider theme={theme}><CssBaseline/><Box sx={{ display: { md: 'grid' }, gridTemplateColumns: '220px minmax(0, 1fr)' }}><Box component="nav" sx={{ height: { md: '100dvh' } }}>Navegación de prueba</Box><Container sx={{ py: 3, minWidth: 0 }}><Box>Controles externos de prueba</Box><Labels plants={records}/></Container></Box></ThemeProvider>);
