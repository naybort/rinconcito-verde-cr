import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { PlantImage } from '../features/catalog/schema';
import { BrandSignature } from './brand/BrandSignature';
import { identity } from './brand/identity';

export function PlantPhoto({ image, height, eager = false, fit = 'cover' }: {
 image: PlantImage;
 height: number | string | { xs: number | string; md: number | string };
 eager?: boolean;
 fit?: 'contain' | 'cover';
}) {
 const [failed, setFailed] = useState(false);
 return <Box sx={{ border: '1px solid', borderColor: identity.line, bgcolor: identity.paper, overflow: 'hidden' }}>
  {failed ? <Box role="img" aria-label={image.alt + ' (imagen no disponible)'} sx={{ height, bgcolor: '#e4ece5', display: 'grid', placeItems: 'center', p: 3 }}><Typography color="text.secondary">Imagen no disponible</Typography></Box> :
   <Box component="img" src={image.src} alt={image.alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} sx={{ display: 'block', width: '100%', height, objectFit: fit, objectPosition: 'center' }}/>}
  <BrandSignature/>
 </Box>;
}
