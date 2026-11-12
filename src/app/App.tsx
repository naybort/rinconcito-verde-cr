import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Divider, IconButton, Paper, Stack, Typography } from '@mui/material';
import business from '../config/business.json';
import { catalog } from '../features/catalog/data';
import { PlantCard } from '../features/catalog/PlantCard';
import { PlantPhoto } from '../shared/PlantPhoto';
import { useFavorites } from '../features/favorites/useFavorites';
import { buildMessage, buildWhatsAppLink } from '../features/contact/whatsapp';
const ids = catalog.plants.map(p => p.id);
function useRoute() {
 const [route, setRoute] = useState(window.location.hash || '#/');
 useEffect(() => { const update = () => setRoute(window.location.hash || '#/'); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
 return route;
}
export default function App() {
 const route = useRoute();
 const favorites = useFavorites(ids);
 const heading = useRef<HTMLHeadingElement>(null);
 const initial = useRef(true);
 const isFavorites = route === '#/favoritos';
 const isDetail = route.startsWith('#/plantas/');
 const plant = isDetail ? catalog.plants.find(p => '#/plantas/' + p.id === route) : undefined;
 const selectedPlants = catalog.plants.filter(p => favorites.ids.includes(p.id));
 const message = buildMessage(selectedPlants, business.messageIntro);
 const contact = buildWhatsAppLink(business.whatsappNumber, message);
 useEffect(() => {
  document.title = (plant?.name || (isFavorites ? 'Favoritos' : 'Catálogo')) + ' · ' + business.name;
  if (initial.current) { initial.current = false; return; }
  window.scrollTo(0, 0);
  heading.current?.focus({ preventScroll: true });
 }, [route, plant, isFavorites]);
 const titleProps = { ref: heading, tabIndex: -1 };
 return <>
  <Box component="a" href="#contenido" sx={{ position: 'fixed', top: -100, left: 16, zIndex: 2000, bgcolor: 'white', p: 2, '&:focus': { top: 8 } }} onClick={event => { event.preventDefault(); heading.current?.focus(); }}>Saltar al contenido</Box>
  <Box component="header" sx={{ bgcolor: 'background.default', borderBottom: '1px solid #e7ece8' }}>
   <Container maxWidth="lg" sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
    <Typography component="a" href="#/" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: { xs: 20, md: 26 }, textDecoration: 'none' }}>{business.name}</Typography>
    <Chip label="Demo" size="small" variant="outlined" />
   </Container>
  </Box>
  <Container maxWidth="lg" sx={{ py: 1.5 }}><Typography variant="body2" color="text.secondary">Catálogo de demostración · Imágenes y plantas de ejemplo, sin disponibilidad comercial confirmada.</Typography></Container>
  {favorites.warning && <Container maxWidth="lg"><Alert severity="info" sx={{ my: 1 }}>{favorites.warning}</Alert></Container>}
  <Box component="main" id="contenido" sx={{ pb: '120px' }}>
   {isDetail && plant ? <>
    <Box sx={{ maxWidth: 896, mx: 'auto', position: 'relative' }}>
     <PlantPhoto key={plant.id} image={plant.detailImage || plant.image} height={{ xs: 530, md: 470 }} eager />
     <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg,#f9f9f8,transparent 50%)', pointerEvents: 'none' }} />
     <IconButton component="a" href="#/" aria-label="Volver al catálogo" sx={{ position: 'absolute', top: 20, left: 20, width: 48, height: 48, bgcolor: 'rgba(255,255,255,.8)', backdropFilter: 'blur(12px)' }}><img src="/icons/back.svg" alt="" /></IconButton>
    </Box>
    <Box sx={{ maxWidth: 896, mx: 'auto', px: { xs: '20px', md: 4 }, position: 'relative', mt: '-48px' }}>
     <Stack direction="row" sx={{ mb: 1, gap: 1, flexWrap: "wrap" }}>{catalog.categories.filter(c => plant.categoryIds.includes(c.id)).map(c => <Chip key={c.id} label={c.name} size="small" sx={{ bgcolor: '#ccd8d0' }} />)}</Stack>
     <Typography {...titleProps} component="h1" variant="h1" sx={{ overflowWrap: 'anywhere' }}>{plant.name}</Typography>
     <Typography color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>Ficha de demostración · {plant.id}</Typography>
     <Typography color="text.secondary" sx={{ mt: 3, lineHeight: '26px', maxWidth: 650 }}>{plant.description || 'Consultá al vivero para conocer más sobre esta planta.'}</Typography>
     <Button variant="contained" fullWidth aria-pressed={favorites.ids.includes(plant.id)} onClick={() => favorites.toggle(plant.id)} startIcon={favorites.ids.includes(plant.id) ? undefined : <img src="/icons/plus.svg" alt="" />} sx={{ mt: 5, py: 3 }}>
      {favorites.ids.includes(plant.id) ? 'Quitar de favoritos' : 'Añadir a favoritos'}
     </Button>
     <Button component="a" href="#/favoritos" fullWidth sx={{ mt: 1 }}>Ver mis favoritos ({favorites.ids.length})</Button>
    </Box>
   </> : isDetail || !['#/', '#/favoritos'].includes(route) ? <Container maxWidth="md" sx={{ py: 5 }}><Typography {...titleProps} component="h1" variant="h2">No encontramos esa página</Typography><Typography sx={{ my: 2 }}>La planta puede haber cambiado o ya no formar parte del catálogo.</Typography><Button component="a" href="#/" variant="contained">Volver al catálogo</Button></Container> :
   <Container maxWidth="lg" sx={{ px: { xs: '20px', sm: 3 }, pt: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 3, justifyContent: "space-between", gap: 1 }}>
     <Box><Typography {...titleProps} component="h1" variant="h2">{isFavorites ? 'Tus favoritos' : 'Explorá nuestro catálogo'}</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>{isFavorites ? 'Tu selección se guarda en este navegador.' : 'Un rincón verde empieza con una planta.'}</Typography></Box>
     <Typography color="text.secondary" sx={{ alignSelf: { sm: 'end' } }}>{(isFavorites ? selectedPlants : catalog.plants).length} plantas</Typography>
    </Stack>
    {(isFavorites ? selectedPlants : catalog.plants).length === 0 ? <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
     <Typography variant="h3" component="h2">{isFavorites ? 'Tu rincón verde está por empezar' : 'Pronto habrá nuevas plantas'}</Typography>
     <Typography color="text.secondary" sx={{ my: 2 }}>{isFavorites ? 'Tocá el corazón de una planta para guardarla aquí y preparar una consulta.' : 'Volvé más tarde para explorar el catálogo.'}</Typography>
     {isFavorites && <Button component="a" href="#/" variant="contained">Explorar plantas</Button>}
    </Paper> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 3 }}>
     {(isFavorites ? selectedPlants : catalog.plants).map(p => <PlantCard key={p.id} plant={p} categories={catalog.categories} selected={favorites.ids.includes(p.id)} toggle={favorites.toggle} />)}
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
  <Paper component="nav" aria-label="Navegación principal" square elevation={0} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: '#f9f9f8', boxShadow: '0 -4px 10px rgba(27,67,50,.08)', pb: 'env(safe-area-inset-bottom)', zIndex: 1100 }}>
   <Stack direction="row" sx={{ p: 1, justifyContent: "center", gap: 3 }}>
    <Button component="a" href="#/" aria-current={!isFavorites ? 'page' : undefined} startIcon={<img src="/icons/explore.svg" alt="" />} sx={{ bgcolor: !isFavorites ? 'primary.light' : undefined, px: 3 }}>Catálogo</Button>
    <Button component="a" href="#/favoritos" aria-current={isFavorites ? 'page' : undefined} sx={{ bgcolor: isFavorites ? 'primary.light' : undefined, px: 3 }}>Favoritos ({favorites.ids.length})</Button>
   </Stack>
  </Paper>
 </>;
}
