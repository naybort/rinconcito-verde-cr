import { Card, CardActionArea, CardContent, Chip, IconButton, Stack, Typography } from '@mui/material';
import { PlantIcon } from '../../shared/PlantIcon';
import { PlantPhoto } from '../../shared/PlantPhoto';
import type { Plant, Category } from './schema';
export function PlantCard({ plant, categories, selected, toggle }: { plant: Plant; categories: Category[]; selected: boolean; toggle: (id: string) => void }) {
 return <Card component="article" sx={{ borderRadius: '16px', position: 'relative', boxShadow: '0 4px 20px rgba(27,67,50,.08)' }}>
  <CardActionArea component="a" href={'#/plantas/' + plant.id} aria-label={'Ver detalle de ' + plant.name}>
   <PlantPhoto image={plant.image} height={256} />
   <CardContent sx={{ p: 2 }}>
    <Typography variant="h3" component="h2" sx={{ lineHeight: '32px' }}>{plant.name}</Typography>
    <Typography color="text.secondary" sx={{ fontStyle: 'italic', mt: .5 }}>Ver detalles y cuidados</Typography>
    <Stack direction="row" sx={{ mt: 2, gap: 1, flexWrap: "wrap" }}>{categories.filter(c => plant.categoryIds.includes(c.id)).map(c => <Chip key={c.id} label={c.name} size="small" sx={{ bgcolor: '#f3f4f3', color: 'primary.main', borderRadius: '6px' }} />)}</Stack>
   </CardContent>
  </CardActionArea>
  <IconButton aria-label={(selected ? 'Quitar ' : 'Guardar ') + plant.name + (selected ? ' de favoritos' : ' en favoritos')} aria-pressed={selected} onClick={() => toggle(plant.id)} sx={{ position: 'absolute', top: 12, right: 12, bgcolor: selected ? 'primary.light' : 'rgba(255,255,255,.85)', borderRadius: '50%', width: 48, height: 48, color: 'primary.dark', boxShadow: '0 2px 8px rgba(0,0,0,.12)', '&:hover': { bgcolor: 'primary.light' }, outline: selected ? '2px solid #2c694e' : undefined }}>
   <PlantIcon kind="heart" filled={selected} />
  </IconButton>
 </Card>;
}
