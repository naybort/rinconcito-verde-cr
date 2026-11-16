import { Box, Paper, Stack, Typography } from '@mui/material';

type PriceOption = { presentation: string; potNumber?: string; priceCRC: number };
const crc = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });

/** Uses only the explicitly authorized public snapshot, never private stock records. */
export function PlantPrices({ priceOptions }: { priceOptions?: readonly PriceOption[] }) {
 const seen = new Set<string>();
 const options = (Array.isArray(priceOptions) ? priceOptions : []).filter(option => {
  if (!option || typeof option.presentation !== 'string' || !option.presentation.trim() || seen.has(option.presentation) || !Number.isSafeInteger(option.priceCRC) || option.priceCRC < 0 || option.priceCRC > 100000000) return false;
  seen.add(option.presentation); return true;
 }).slice().sort((a,b) => a.presentation.localeCompare(b.presentation, 'es', { numeric: true }));
 if (!options.length) return null;
 return <Box component="section" aria-label="Precios y presentaciones" sx={{mt:3}}>
  <Typography component="h2" variant="h3" sx={{mb:1.5}}>Precios y presentaciones</Typography>
  <Stack component="ul" sx={{listStyle:'none',p:0,m:0,gap:1}}>{options.map(option=><Paper component="li" key={option.presentation} variant="outlined" sx={{p:2,display:'flex',justifyContent:'space-between',alignItems:'center',gap:2,flexWrap:'wrap'}}>
   <Box sx={{minWidth:0}}><Typography sx={{fontWeight:700,overflowWrap:'anywhere'}}>{option.presentation}</Typography>{typeof option.potNumber==='string'&&option.potNumber.trim()&&<Typography variant="body2" color="text.secondary" sx={{overflowWrap:'anywhere'}}>Maceta n.º {option.potNumber}</Typography>}</Box>
   <Typography sx={{fontWeight:700,whiteSpace:'nowrap'}}>{crc.format(option.priceCRC)}</Typography>
  </Paper>)}</Stack>
  <Typography variant="body2" color="text.secondary" sx={{mt:1}}>Consultá la presentación y disponibilidad por WhatsApp.</Typography>
 </Box>;
}
