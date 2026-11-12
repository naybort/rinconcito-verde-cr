import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { PlantImage } from '../features/catalog/schema';
export function PlantPhoto({ image, height, eager = false }: { image: PlantImage; height: number | { xs: number; md: number }; eager?: boolean }) {
 const [failed, setFailed] = useState(false);
 return failed ? <Box role="img" aria-label={image.alt + ' (imagen no disponible)'} sx={{ height, bgcolor: '#e4ece5', display: 'grid', placeItems: 'center', p: 3 }}><Typography color="text.secondary">Imagen no disponible</Typography></Box> :
 <Box component="img" src={image.src} alt={image.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} sx={{ display: 'block', width: '100%', height, objectFit: 'cover', objectPosition: 'center' }} />;
}
