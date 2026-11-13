import { useEffect, useRef, useState } from 'react';
import { PageLoading } from '../shared/loading/PageLoading';
import { useRoute } from './useRoute';
import { AdminShortcut } from '../features/admin/AdminShortcut';
import { Alert, Box, Button, Chip, Container, Divider, Paper, Stack, TextField, Typography } from '@mui/material';
import { PlantIcon } from '../shared/PlantIcon';
import business from '../config/business.json';
import { catalog as localCatalog } from '../features/catalog/data';
import { lazy, Suspense } from 'react';
import type { Catalog } from '../features/catalog/schema';
import { usePublicCatalog } from '../features/catalog/usePublicCatalog';
const Admin = lazy(() => import('../features/admin/Admin'));
import { PlantCard } from '../features/catalog/PlantCard';
import { PlantGallery } from '../features/catalog/PlantGallery';
import { useFavorites } from '../features/favorites/useFavorites';
import { buildMessage, buildWhatsAppLink } from '../features/contact/whatsapp';

export default function App() {
 const route=useRoute();
 if(route==='#/admin')return <Suspense fallback={<PageLoading message="Cargando administración…"/>}><Admin/></Suspense>;
 return <PublicCatalog/>;
}
function PublicCatalog(){
 const {catalog,loading,error}=usePublicCatalog(localCatalog);
 if(loading)return <PageLoading message="Cargando catálogo…"/>;
 return <>{error&&<Alert severity="warning">{error}</Alert>}<CatalogView catalog={catalog}/></>;
}
function CatalogView({catalog}:{catalog:Catalog}) {
 const ids=catalog.plants.map(p=>p.id);
 const route = useRoute();
 const [query, setQuery] = useState('');
 const [category, setCategory] = useState('');
 const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
 const filteredPlants = catalog.plants.filter(p => (!category || p.categoryIds.includes(category)) && normalize(p.name).includes(normalize(query)) && p.available!==false);
 const clearFilters = () => { setQuery(''); setCategory(''); };
 const favorites = useFavorites(ids);
 const heading = useRef<HTMLHeadingElement>(null);
 const previousRoute = useRef(route);
 const isFavorites = route === '#/favoritos';
 const isDetail = route.startsWith('#/plantas/');
 const plant = isDetail ? catalog.plants.find(p => '#/plantas/' + p.id === route) : undefined;
 const selectedPlants = catalog.plants.filter(p => favorites.ids.includes(p.id));
 const message = buildMessage(selectedPlants, business.messageIntro);
 const plantContact = plant ? buildWhatsAppLink(business.whatsappNumber, buildMessage([plant], business.messageIntro)) : null;
 const contact = buildWhatsAppLink(business.whatsappNumber, message);
 useEffect(() => {
  document.title = (plant?.name || (isFavorites ? 'Favoritos' : 'Catálogo')) + ' · ' + business.name;
  if (previousRoute.current === route) return;
  previousRoute.current = route;
  window.scrollTo(0, 0);
  heading.current?.focus({ preventScroll: true });
 }, [route, plant, isFavorites]);
 const titleProps = { ref: heading, tabIndex: -1 };
 return <>
  <Box component="a" href="#contenido" sx={{ position: 'fixed', top: -100, left: 16, zIndex: 2000, bgcolor: 'white', p: 2, '&:focus': { top: 8 } }} onClick={event => { event.preventDefault(); heading.current?.focus(); }}>Saltar al contenido</Box>
  <Box component="header" sx={{ bgcolor: 'background.default', borderBottom: '1px solid #e7ece8' }}>
   <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
    <Typography component="a" href="#/" sx={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: { xs: 18, md: 26 }, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}><Box component="img" src="/rinconcito-icon.png" alt="" sx={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }} />{business.name}</Typography>
    <AdminShortcut/>
   </Container>
  </Box>
  {favorites.warning && <Container maxWidth="lg"><Alert severity="info" sx={{ my: 1 }}>{favorites.warning}</Alert></Container>}
  <Box component="main" id="contenido" sx={{ pb: 6, minHeight: 'calc(100dvh - 230px)' }}>
   {isDetail && plant ? <Container maxWidth="lg" sx={{ pt: 2, px: { xs: '20px', sm: 3 } }}>
    <Button component="a" href="#/" startIcon={<img src="/icons/back.svg" alt=""/>} sx={{ mb: 2 }}>Volver al catálogo</Button>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.05fr) minmax(0, 1fr)' }, gap: { xs: 3, md: 5 }, alignItems: 'start' }}>
    <Box sx={{ minWidth: 0, position: { md: 'sticky' }, top: 24 }}><PlantGallery key={plant.id} plant={plant}/></Box>
    <Box sx={{ minWidth: 0 }}>
     <Stack direction="row" sx={{ mb: 1, gap: 1, flexWrap: "wrap" }}>{catalog.categories.filter(c => plant.categoryIds.includes(c.id)).map(c => <Chip key={c.id} label={c.name} size="small" sx={{ bgcolor: '#ccd8d0' }} />)}</Stack>
     <Typography {...titleProps} component="h1" variant="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, overflowWrap: 'anywhere' }}>{plant.name}</Typography>

     {plant.available===false&&<Alert severity="info" sx={{mt:2}}>Esta ficha está archivada. Conservamos sus cuidados para tu planta.</Alert>}
     <Typography color="text.secondary" sx={{ mt: 3, lineHeight: '26px', maxWidth: 650 }}>{plant.description || 'Consultá al vivero para conocer más sobre esta planta.'}</Typography>
     <Box component="section" aria-labelledby="cuidados-heading" sx={{ mt: 4 }}>
      <Typography id="cuidados-heading" component="h2" variant="h3">Cómo cuidar tu planta</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>Estos cuidados pueden variar según tu espacio y clima. Consultanos si tenés dudas.</Typography>
      {plant.care ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr' }, gap: 1.5 }}>
       {([['light', 'Luz'], ['watering', 'Riego'], ['humidity', 'Humedad'], ['temperature', 'Temperatura']] as const).map(([key, label]) => <Paper key={key} variant="outlined" sx={{ p: 2, bgcolor: '#eef3ee', overflowWrap: 'anywhere' }}><Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', color: 'primary.main' }}><PlantIcon kind={key} /><Typography component="h3" sx={{ fontWeight: 700 }}>{label}</Typography></Stack><Typography color="text.secondary" sx={{ mt: 1 }}>{plant.care![key]?.trim() || 'Consultanos por este cuidado.'}</Typography></Paper>)}
      </Box> : <Typography color="text.secondary">Consultanos por WhatsApp para conocer sus cuidados.</Typography>}
     </Box>
     {plant.warnings&&<Alert severity="warning" sx={{mt:2}}>{plant.warnings}</Alert>}
     {plant.sources?.length ? <Box sx={{mt:2}}><Typography component="h2" variant="h3">Fuentes de cuidados</Typography>{plant.sources.map(source=><Typography key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.accessedAt}</Typography>)}</Box>:null}
     <Button variant="contained" fullWidth aria-pressed={favorites.ids.includes(plant.id)} onClick={() => favorites.toggle(plant.id)} startIcon={<PlantIcon kind="heart" filled={favorites.ids.includes(plant.id)} />} sx={{ mt: 3, py: 1.5 }}>
      {favorites.ids.includes(plant.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
     </Button>
     {plantContact?.href && <Button component="a" href={plantContact.href} target="_blank" rel="noopener noreferrer" fullWidth variant="outlined" sx={{ mt: 2 }}>Consultar esta planta por WhatsApp</Button>}
     <Button component="a" href="#/favoritos" fullWidth sx={{ mt: 1 }}>Ver mis favoritos ({favorites.ids.length})</Button>
    </Box>
   </Box></Container> : isDetail || !['#/', '#/favoritos'].includes(route) ? <Container maxWidth="md" sx={{ py: 5 }}><Typography {...titleProps} component="h1" variant="h2">No encontramos esa página</Typography><Typography sx={{ my: 2 }}>La planta puede haber cambiado o ya no formar parte del catálogo.</Typography><Button component="a" href="#/" variant="contained">Volver al catálogo</Button></Container> :
   <Container maxWidth="lg" sx={{ px: { xs: '20px', sm: 3 }, pt: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 3, justifyContent: "space-between", gap: 1 }}>
     <Box><Typography {...titleProps} component="h1" variant="h2">{isFavorites ? 'Tus favoritos' : 'Encontrá tu próxima planta'}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{isFavorites ? 'Tu selección se guarda en este navegador.' : 'Explorá el catálogo, guardá tus favoritas y consultanos por WhatsApp.'}</Typography></Box>
     <Typography color="text.secondary" sx={{ alignSelf: { sm: 'end' } }}>{(isFavorites ? selectedPlants : filteredPlants).length} plantas</Typography>
    </Stack>
    {!isFavorites && catalog.plants.length > 0 && <Box component="section" aria-label="Buscar y filtrar plantas" sx={{ mb: 4 }}>
     <TextField fullWidth label="Buscar una planta" placeholder="Por ejemplo, Monstera" value={query} onChange={event => setQuery(event.target.value)} slotProps={{ htmlInput: { type: 'search' } }} />
     <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 2 }}>
      <Button variant={!category ? 'contained' : 'outlined'} aria-pressed={!category} onClick={() => setCategory('')}>Todas</Button>
      {catalog.categories.map(c => <Button key={c.id} variant={category === c.id ? 'contained' : 'outlined'} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</Button>)}
      {(query || category) && <Button onClick={clearFilters}>Limpiar filtros</Button>}
     </Stack>
     <Typography role="status" variant="body2" color="text.secondary" sx={{ mt: 2 }}>{filteredPlants.length} {filteredPlants.length === 1 ? 'planta encontrada' : 'plantas encontradas'}</Typography>
    </Box>}
    {(isFavorites ? selectedPlants : filteredPlants).length === 0 ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
     <Typography variant="h3" component="h2">{isFavorites ? 'Tu rincón verde está por empezar' : (catalog.plants.length ? 'No encontramos plantas con esa búsqueda' : 'Nuestro catálogo está por florecer')}</Typography>
     <Typography color="text.secondary" sx={{ my: 2 }}>{isFavorites ? 'Tocá el corazón de una planta para guardarla aquí y preparar una consulta.' : (catalog.plants.length ? 'Probá con otro nombre o quitá los filtros para ver todas las plantas.' : 'Pronto vas a encontrar nuestras plantas aquí. Mientras tanto, podés consultarnos por WhatsApp.')}</Typography>
     {!isFavorites && catalog.plants.length > 0 && <Button onClick={clearFilters} variant="outlined">Ver todas las plantas</Button>}
     {!isFavorites && catalog.plants.length === 0 && <Button component="a" href={buildWhatsAppLink(business.whatsappNumber, 'Hola, quisiera consultar sobre las plantas de Rinconcito Verde CR.').href!} target="_blank" rel="noopener noreferrer" variant="contained">Consultar por WhatsApp</Button>}
     {isFavorites && <Button component="a" href="#/" variant="contained">Explorar plantas</Button>}
    </Paper> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 3 }}>
     {(isFavorites ? selectedPlants : filteredPlants).map(p => <PlantCard key={p.id} plant={p} categories={catalog.categories} selected={favorites.ids.includes(p.id)} toggle={favorites.toggle} />)}
    </Box>}
    {isFavorites && selectedPlants.length > 0 && <Paper component="section" aria-labelledby="consulta-heading" elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, mt: 4, bgcolor: '#eef3ee', borderRadius: '16px' }}>
     <Typography id="consulta-heading" component="h2" variant="h3">Consultá por tus plantas</Typography>
     <Typography color="text.secondary" sx={{ my: 1 }}>Prepararemos esta consulta con todos tus favoritos. Vos revisás y enviás el mensaje en WhatsApp.</Typography>
     <Divider sx={{ my: 2 }} />
     <Box component="pre" aria-label="Vista previa del mensaje" sx={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 14, lineHeight: 1.7 }}>{message}</Box>
     {contact.href ? <Button component="a" href={contact.href} target="_blank" rel="noopener noreferrer" variant="contained" sx={{ mt: 2 }}>Continuar en WhatsApp</Button> : <><Button variant="contained" disabled sx={{ mt: 2 }}>WhatsApp pendiente de configurar</Button><Typography role="status" color="text.secondary" variant="body2" sx={{ mt: 1 }}>{contact.reason}</Typography></>}
    </Paper>}
   </Container>}
  </Box>
  <Paper component="nav" aria-label="Navegación principal" square elevation={0} sx={{ position: 'relative', bgcolor: '#f9f9f8', boxShadow: '0 -4px 10px rgba(27,67,50,.08)',  zIndex: 1100 }}>
   <Stack direction="row" sx={{ p: 1, justifyContent: "center", gap: { xs: 0, sm: 3 } }}>
    <Button component="a" href="#/" aria-current={!isFavorites ? 'page' : undefined} startIcon={<img src="/icons/explore.svg" alt="" />} sx={{ bgcolor: !isFavorites ? 'primary.light' : undefined, px: { xs: 2, sm: 3 } }}>Catálogo</Button>
    <Button component="a" href="#/favoritos" aria-current={isFavorites ? 'page' : undefined} startIcon={<PlantIcon kind="heart" filled={isFavorites} />} sx={{ bgcolor: isFavorites ? 'primary.light' : undefined, px: { xs: 2, sm: 3 } }}>Favoritos ({favorites.ids.length})</Button>
   </Stack>
  </Paper>
  <Box component="footer" sx={{ py: 2, px: 2, pb: 'max(16px, env(safe-area-inset-bottom))', textAlign: 'center', bgcolor: '#eef3ee' }}>
   <Typography variant="body2" color="text.secondary">Powered by <Box component="a" href={business.poweredByUrl} target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 700 }}>Vision Mind</Box></Typography>
  </Box>
 </>;
}
