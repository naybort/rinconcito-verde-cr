import { useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { PlantPhoto } from '../../shared/PlantPhoto';
import type { Plant, PlantImage } from './schema';
export function plantImages(plant:Plant):PlantImage[]{
 if(plant.images?.length)return plant.images;
 return [plant.image,...(plant.detailImage&&plant.detailImage.src!==plant.image.src?[plant.detailImage]:[])];
}
export function PlantGallery({plant}:{plant:Plant}){
 const images=plantImages(plant);const [selected,setSelected]=useState(0);const index=Math.min(selected,images.length-1);const image=images[index];
 const choose=(next:number)=>setSelected((next+images.length)%images.length);
 return <Box sx={{maxWidth:896,mx:'auto'}}>
 <Box sx={{position:'relative'}}><PlantPhoto key={image.src} image={image} height={{xs:360,md:470}} eager/>
 <Box sx={{position:'absolute',inset:0,background:'linear-gradient(0deg,#f9f9f8,transparent 50%)',pointerEvents:'none'}}/>
 <IconButton component="a" href="#/" aria-label="Volver al catálogo" sx={{position:'absolute',top:20,left:20,width:48,height:48,bgcolor:'rgba(255,255,255,.8)',backdropFilter:'blur(12px)'}}><img src="/icons/back.svg" alt=""/></IconButton>
 </Box>
 {images.length>1&&<Stack role="group" aria-label={`Fotografías de ${plant.name}`} spacing={1} sx={{px:{xs:2,md:4},pb:2}} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();choose(index+(e.key==='ArrowLeft'?-1:1));}}}>
 <Stack direction="row" sx={{alignItems:'center',justifyContent:'space-between',gap:1}}><Button aria-label="Foto anterior" onClick={()=>choose(index-1)}>Anterior</Button><Typography variant="body2" role="status">Foto {index+1} de {images.length}{index===0?' · portada':''}</Typography><Button aria-label="Foto siguiente" onClick={()=>choose(index+1)}>Siguiente</Button></Stack>
 <Stack direction="row" sx={{gap:1,overflowX:'auto',py:1}}>{images.map((photo,i)=><Button key={photo.src} aria-label={`Ver foto ${i+1}${i===0?' · portada':''}`} aria-pressed={index===i} onClick={()=>choose(i)} sx={{p:.5,minWidth:72,flexShrink:0,border:'2px solid',borderColor:index===i?'primary.main':'transparent',borderRadius:2}}><Box component="img" src={photo.src} alt="" loading="lazy" sx={{width:64,height:64,objectFit:'cover',borderRadius:1}}/></Button>)}</Stack>
 </Stack>}
 </Box>;
}
