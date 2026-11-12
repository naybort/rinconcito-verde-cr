import { SvgIcon } from '@mui/material';
export function PlantIcon({ kind, filled = false }: { kind: 'heart' | 'light' | 'watering' | 'humidity' | 'temperature'; filled?: boolean }) {
 const paths = {
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  watering: <><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0C19 10 12 2 12 2Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
  humidity: <><path d="M5 3S2 7 2 9a3 3 0 0 0 6 0c0-2-3-6-3-6Zm13 3s-4 5-4 8a4 4 0 0 0 8 0c0-3-4-8-4-8Z" /><path d="M3 20c3-2 5 2 8 0s5 2 8 0" /></>,
  temperature: <><path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z" /><path d="M12 8v9m0 0v2m6-12h3m-3 4h2" /></>,
 };
 return <SvgIcon aria-hidden="true" viewBox="0 0 24 24" sx={{ width: 24, height: 24, fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }}>{paths[kind]}</SvgIcon>;
}
