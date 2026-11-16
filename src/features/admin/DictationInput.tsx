import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';

type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
 lang:string; continuous:boolean; interimResults:boolean;
 onresult:((event:{ results:ArrayLike<Result> })=>void)|null;
 onerror:((event:{ error:string })=>void)|null; onend:(()=>void)|null;
 start:()=>void; stop:()=>void; abort:()=>void;
};
type SpeechWindow = Window & { SpeechRecognition?:new()=>Recognition; webkitSpeechRecognition?:new()=>Recognition };
function getSpeechRecognitionConstructor(){const browser=window as SpeechWindow;return browser.SpeechRecognition??browser.webkitSpeechRecognition;}
/** Optional browser dictation. Nothing is recorded or applied before an explicit click. */
export function DictationInput({value,onChange,label,disabled=false,maxLength=2000}:{value:string;onChange:(text:string)=>void;label:string;disabled?:boolean;maxLength?:number}){
 const [listening,setListening]=useState(false);const [transcript,setTranscript]=useState('');const [error,setError]=useState('');
 const recognition=useRef<Recognition|null>(null);
 useEffect(()=>()=>{const active=recognition.current;if(active){active.onresult=null;active.onerror=null;active.onend=null;active.abort();recognition.current=null;}},[]);
 const supported=typeof window!=='undefined'&&!!getSpeechRecognitionConstructor();
 function start(){
  if(disabled||recognition.current)return;const Speech=getSpeechRecognitionConstructor();if(!Speech)return;
  const active=new Speech();recognition.current=active;active.lang='es-CR';active.continuous=false;active.interimResults=true;
  setError('');setTranscript('');setListening(true);
  active.onresult=event=>setTranscript(Array.from(event.results).map(result=>result[0]?.transcript??'').join(' ').slice(0,maxLength));
  active.onerror=event=>{if(recognition.current===active)recognition.current=null;active.onresult=null;active.onend=null;active.onerror=null;active.abort();setListening(false);setError(event.error==='not-allowed'||event.error==='service-not-allowed'?'No se autorizó el micrófono. Podés escribir las instrucciones.':'No se pudo completar el dictado. Revisá el texto o escribí las instrucciones.');};
  active.onend=()=>{if(recognition.current===active)recognition.current=null;setListening(false);};
  try{active.start();}catch{recognition.current=null;setListening(false);setError('El dictado no está disponible. Podés escribir las instrucciones.');}
 }
 const separator=value&&!/\s$/.test(value)?' ':'';const available=Math.max(0,maxLength-value.length-separator.length);
 return <Stack spacing={1}>
  <Typography variant="caption" color="text.secondary">Dictado opcional del navegador. Revisá el texto antes de agregarlo; también podés escribirlo. El servicio de voz depende de tu navegador.</Typography>
  {supported?<Button variant="text" disabled={disabled&&!listening} onClick={listening?()=>recognition.current?.stop():start}>{listening?'Detener dictado':`Dictar instrucciones · ${label}`}</Button>:<Typography variant="body2">Dictado no disponible en este navegador. Podés escribir las instrucciones.</Typography>}
  {listening&&<Typography role="status">Escuchando…</Typography>}
  {error&&<Alert severity="info">{error}</Alert>}
  {(transcript||listening)&&<><TextField label={`Texto dictado · ${label}`} value={transcript} multiline minRows={2} onChange={event=>setTranscript(event.target.value.slice(0,maxLength))} helperText="Corregí lo que escuchó el navegador antes de agregarlo."/>
   {transcript.trim().length>available&&<Alert severity="info">Se agregarán hasta {available} caracteres para respetar el límite del campo.</Alert>}
   <Button disabled={disabled||listening||!transcript.trim()||!available} onClick={()=>{onChange(value+separator+transcript.trim().slice(0,available));setTranscript('');}}>Agregar dictado al texto</Button>
  </>}
 </Stack>;
}
