import { Box, Stack, Typography } from '@mui/material';
import { identity } from '../brand/identity';
import './watering-loader.css';

export const loadingMessage = 'Preparando tu rincón verde…';

/** A lightweight illustration, separate from the existing brand icon. */
export function WateringLoader({ message = loadingMessage }: { message?: string }) {
 return <Box component="section" className="rv-loading-screen" aria-label="Cargando Rinconcito Verde" aria-busy="true" sx={{ bgcolor: identity.paper, color: identity.ink }}>
  <Stack direction="row" sx={{ justifyContent: 'center', alignItems: 'center', gap: 1.25 }}>
   <Box component="img" src={identity.icon} alt="" sx={{ width: 36, height: 36, objectFit: 'contain' }}/>
   <Typography sx={{ fontSize: { xs: 16, sm: 18 }, fontWeight: 700 }}>{identity.name}</Typography>
  </Stack>
  <Box sx={{ alignSelf: 'center', textAlign: 'center', width: '100%', maxWidth: 440, mx: 'auto', py: 3 }}>
   <svg className="rv-watering-scene" viewBox="0 0 360 270" aria-hidden="true" focusable="false">
    <path d="M66 198C38 149 61 64 133 40c71-24 151 18 169 81s-15 102-75 110C158 241 99 232 66 198Z" fill="#e8eee6"/>
    <circle cx="284" cy="68" r="5" fill="#ccd8d0"/><circle cx="57" cy="175" r="3" fill="#ccd8d0"/>
    <ellipse cx="187" cy="239" rx="111" ry="8" fill="#dce5da"/>
    <g className="rv-watering-can" stroke="#2c694e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
     <path d="M80 82C47 65 42 117 79 109" fill="none"/>
     <path d="m126 99 20-5 19-22 10 7-20 32-29 14" fill="#8ab29a"/>
     <path d="m162 71 15 8 5-7-16-8Z" fill="#2c694e"/>
     <path d="M77 73h54l-4 51c-13 8-33 8-46 0Z" fill="#8ab29a"/>
     <ellipse cx="104" cy="74" rx="27" ry="6" fill="#cbdcc9"/>
     <path d="M91 91v25" stroke="#cbdcc9"/>
    </g>
    <g stroke="#659fa5" strokeWidth="3.5" strokeLinecap="round">
     <path className="rv-water-drop rv-water-drop-one" d="m180 96 3 7"/>
     <path className="rv-water-drop rv-water-drop-two" d="m191 109 3 7"/>
     <path className="rv-water-drop rv-water-drop-three" d="m183 124 3 7"/>
     <path className="rv-water-drop rv-water-drop-four" d="m200 135 3 7"/>
    </g>
    <g className="rv-leaves-main" stroke="#2c694e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
     <path d="M220 198v-55" fill="none"/>
     <path d="M220 174c-27 0-40-19-38-36 24-1 40 12 38 36Z" fill="#72a281"/>
     <path d="M220 159c-2-27 15-41 35-42 2 21-9 39-35 42Z" fill="#2c694e"/>
     <path d="M220 191c4-24 23-35 43-32-3 22-19 34-43 32Z" fill="#98b99a"/>
     <path d="m219 172-22-22m24 7 20-23m-19 56 25-18" fill="none" stroke="#cbdcc9" strokeWidth="2"/>
    </g>
    <path d="M184 195h72l-10 39c-16 7-36 7-52 0Z" fill="#c98f6b"/>
    <path d="m195 204 7 26" stroke="#e7bda0" strokeWidth="5" strokeLinecap="round"/>
    <rect x="180" y="187" width="80" height="16" rx="5" fill="#ddb091"/>
    <g className="rv-leaves-small" stroke="#2c694e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
     <path d="M124 216v-36" fill="none"/>
     <path d="M124 200c-20 0-29-13-27-25 17 0 29 9 27 25Z" fill="#8ab29a"/>
     <path d="M124 189c0-18 12-29 27-28 0 17-11 28-27 28Z" fill="#4d8260"/>
    </g>
    <path d="M101 213h47l-6 23c-10 5-25 5-35 0Z" fill="#f5f4eb" stroke="#b7c7b8" strokeWidth="2"/>
    <rect x="98" y="208" width="53" height="9" rx="3" fill="#ccd8d0"/>
   </svg>
   <Typography component="p" sx={{ fontSize: { xs: 25, sm: 30 }, fontWeight: 700, letterSpacing: '-.025em', mb: 1 }}>Un poquito de agua…</Typography>
   <Typography role="status" aria-live="polite" aria-atomic="true" sx={{ color: 'text.secondary', fontSize: 15, lineHeight: 1.7 }}>{message}</Typography>
  </Box>
  <Typography component="p" sx={{ textAlign: 'center', fontSize: 12, color: 'text.secondary', letterSpacing: '.025em' }}>Powered by <Box component="span" sx={{ fontWeight: 700 }}>Vision Mind</Box></Typography>
 </Box>;
}
