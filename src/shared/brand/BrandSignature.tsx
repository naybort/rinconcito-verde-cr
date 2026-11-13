import { Box, Stack, Typography } from '@mui/material';
import { identity } from './identity';

/** Always outside the photograph: no plant detail is covered by the signature. */
export function BrandSignature() {
 return <Stack aria-hidden="true" direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, py: .75, bgcolor: identity.paper, color: identity.ink, pointerEvents: 'none' }}>
  <Box sx={{ flex: 1, height: '1px', bgcolor: identity.line }}/>
  <Box component="img" src={identity.icon} alt="" sx={{ width: 22, height: 22, objectFit: 'contain' }}/>
  <Typography sx={{ fontSize: 10, letterSpacing: '.035em', whiteSpace: 'nowrap' }}>{identity.name}</Typography>
  <Box sx={{ flex: 1, height: '1px', bgcolor: identity.line }}/>
 </Stack>;
}
