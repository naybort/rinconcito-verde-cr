import { useId, useRef, type ReactNode, type KeyboardEvent, type TouchEvent, type MouseEvent } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

/** Controlled selection lets editors keep a stable photo identity while reordering. */
export function ImageCarousel({ count, index, onChange, children, thumbnails, disabled = false, label = 'Imágenes de la planta' }: {
 count: number; index: number; onChange: (index: number) => void; children: ReactNode;
 thumbnails?: ReactNode[]; disabled?: boolean; label?: string;
}) {
 const id = useId();
 const start = useRef<{ x: number; y: number } | null>(null);
 const suppressClickUntil = useRef(0);
 const choose = (next: number) => { if (!disabled && count > 1) onChange((next + count) % count); };
 const keyboard = (event: KeyboardEvent) => {
  if (disabled || count < 2 || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
  const next = event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : undefined;
  if (next !== undefined) { event.preventDefault(); choose(next); }
 };
 const touchStart = (event: TouchEvent) => {
  const touch = event.touches.length === 1 ? event.touches[0] : undefined;
  start.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
 };
 const touchEnd = (event: TouchEvent) => {
  const first = start.current; start.current = null;
  const touch = event.changedTouches[0];
  if (disabled || !first || !touch || count < 2) return;
  const dx = touch.clientX - first.x, dy = touch.clientY - first.y;
  // A vertical gesture remains a page scroll. No preventDefault on touch events.
  if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
   suppressClickUntil.current = Date.now() + 450;
   choose(index + (dx < 0 ? 1 : -1));
  }
 };
 const clickCapture = (event: MouseEvent) => {
  if (Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation(); suppressClickUntil.current = 0; }
 };
 if (!count) return null;
 return <Box role="group" aria-roledescription="carrusel" aria-label={label} onKeyDown={keyboard} sx={{ minWidth: 0 }}>
  <Box id={id} data-testid="carousel-stage" onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={() => { start.current = null; }} onClickCapture={clickCapture} sx={{ touchAction: 'pan-y pinch-zoom', borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
   {children}
  </Box>
  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: .5, py: 1 }}>
   <Button aria-label="Imagen anterior" aria-controls={id} disabled={disabled || count < 2} onClick={() => choose(index - 1)} sx={{ minWidth: 44 }}>Anterior</Button>
   <Typography variant="body2" role="status" aria-live="polite" aria-atomic="true" sx={{ textAlign: 'center' }}>Imagen {index + 1} de {count}</Typography>
   <Button aria-label="Imagen siguiente" aria-controls={id} disabled={disabled || count < 2} onClick={() => choose(index + 1)} sx={{ minWidth: 44 }}>Siguiente</Button>
  </Stack>
  {count > 1 && thumbnails && <Stack direction="row" sx={{ gap: 1, overflowX: 'auto', pb: 1, px: .5 }}>
   {thumbnails.map((thumbnail, i) => <Button key={i} aria-label={`Seleccionar imagen ${i + 1}`} aria-pressed={index === i} aria-controls={id} disabled={disabled} onClick={() => choose(i)} sx={{ p: .5, minWidth: 64, flexShrink: 0, border: '2px solid', borderColor: index === i ? 'primary.main' : 'transparent', borderRadius: 2, bgcolor: 'background.paper' }}>{thumbnail}</Button>)}
  </Stack>}
 </Box>;
}
