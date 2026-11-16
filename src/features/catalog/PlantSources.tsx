import { Box, Typography } from '@mui/material';

type CareSource = { title: string; url?: string; accessedAt?: string; verification?: 'verified' | 'unverified' };
function publicSourceUrl(value?: string) {
 try { const url = new URL(value || ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined; }
 catch { return undefined; }
}

/** Missing legacy evidence is never upgraded to verified by presentation code. */
export function PlantSources({ sources }: { sources?: readonly CareSource[] }) {
 const references = sources?.filter(source => source.title?.trim());
 if (!references?.length) return null;
 const verified = references.filter(source => source.verification === 'verified' && publicSourceUrl(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.accessedAt || ''));
 const unverified = references.filter(source => !verified.includes(source));
 const list = (items: readonly CareSource[]) => <Box component="ul" sx={{ pl: 2.5, my: 1, '& li + li': { mt: 1 } }}>{items.map((source, i) => {
  const url = publicSourceUrl(source.url);
  return <Box component="li" key={`${source.title}-${i}`} sx={{ overflowWrap: 'anywhere' }}><Typography component="span" variant="body2">{url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title}{verified.includes(source) && source.accessedAt ? ` · Consultada ${source.accessedAt}` : ''}</Typography></Box>;
 })}</Box>;
 return <Box sx={{ mt: 3 }}>
  {verified.length > 0 && <Box component="section" aria-label="Fuentes verificadas"><Typography component="h2" variant="h3" sx={{ fontSize: 20 }}>Fuentes verificadas</Typography>{list(verified)}</Box>}
  {unverified.length > 0 && <Box component="section" aria-label="Referencias no verificadas" sx={{ mt: verified.length ? 2 : 0 }}><Typography component="h2" variant="h3" sx={{ fontSize: 20 }}>Referencias no verificadas</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>Notas y referencias aportadas para orientar la revisión. No se presentan como evidencia comprobada.</Typography>{list(unverified)}</Box>}
 </Box>;
}
