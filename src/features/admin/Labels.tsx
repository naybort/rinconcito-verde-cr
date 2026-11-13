import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import QRCode from 'qrcode';
import { plantUrl, type PlantRecord } from '../../../functions/src/domain';
function QR({id}:{id:string}){
 const [src,setSrc]=useState('');useEffect(()=>{let active=true;void QRCode.toDataURL(plantUrl(id),{errorCorrectionLevel:'M',margin:4,width:300}).then(url=>{if(active)setSrc(url);});return()=>{active=false;};},[id]);
 return <Box component="img" src={src||undefined} alt={`QR de ${id}`} sx={{width:'26mm',height:'26mm'}}/>;
}
export function Labels({plants}:{plants:PlantRecord[]}){
 const [selected,setSelected]=useState<string[]>([]);const [copies,setCopies]=useState(1);const [width,setWidth]=useState(60);const [height,setHeight]=useState(45);
 const printable=plants.filter(p=>selected.includes(p.id));
 return <Stack spacing={2}><Typography component="h1" variant="h2">Etiquetas por ficha</Typography>
 <Typography>Las macetas de un mismo tipo comparten URL y QR. Elegí fichas que ya se hayan publicado. El tamaño debe probarse con tu impresora antes de imprimir un lote.</Typography>
 <Box className="no-print">{plants.map(p=><FormControlLabel key={p.id} control={<Checkbox checked={selected.includes(p.id)} onChange={()=>setSelected(s=>s.includes(p.id)?s.filter(id=>id!==p.id):[...s,p.id])}/>} label={p.name}/>)}</Box>
 <Stack className="no-print" direction={{xs:'column',sm:'row'}} spacing={2}>
 <TextField label="Copias por ficha" type="number" value={copies} onChange={e=>setCopies(Math.min(100,Math.max(1,Number(e.target.value))))}/>
 <TextField label="Ancho (mm)" type="number" value={width} onChange={e=>setWidth(Math.min(100,Math.max(50,Number(e.target.value))))}/>
 <TextField label="Alto (mm)" type="number" value={height} onChange={e=>setHeight(Math.min(150,Math.max(45,Number(e.target.value))))}/>
 <Button variant="contained" disabled={!printable.length} onClick={()=>window.print()}>Imprimir / guardar PDF</Button></Stack>
 <Box className="labels" sx={{display:'flex',flexWrap:'wrap',gap:'2mm'}}>{printable.flatMap(p=>Array.from({length:copies},(_,i)=><Box key={`${p.id}-${i}`} className="plant-label" sx={{width:`${width}mm`,minHeight:`${height}mm`,border:'1px solid #ddd',p:'2mm',textAlign:'center',breakInside:'avoid'}}><QR id={p.id}/><Typography sx={{fontSize:12,fontWeight:700}}>{p.name}</Typography><Typography sx={{fontSize:10}}>{p.id}</Typography></Box>))}</Box>
 <style>{'@media print { body * { visibility:hidden; } .labels,.labels * { visibility:visible; } .labels { position:absolute; top:0;left:0; } .no-print {display:none!important;} @page {margin:8mm;} }'}</style></Stack>;
}
