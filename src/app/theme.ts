import '@fontsource/playfair-display/latin-600.css';
import { createTheme } from '@mui/material/styles';
export const theme = createTheme({
 palette: { primary: { main: '#2c694e', dark: '#012d1d', light: '#aeeecb' }, background: { default: '#f9f9f8', paper: '#ffffff' }, text: { primary: '#012d1d', secondary: '#414844' } },
 typography: { fontFamily: '"DM Sans", sans-serif', body1: { lineHeight: 1.65 }, body2: { lineHeight: 1.6 }, h1: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: '3rem', fontWeight: 600, lineHeight: 1.2, letterSpacing: '-.02em' }, h2: { fontFamily: '"Playfair Display", Georgia, serif', fontSize: '2rem', fontWeight: 600, lineHeight: 1.25 }, h3: { fontFamily: '"DM Sans", sans-serif', fontSize: '1.5rem', fontWeight: 700 }, button: { textTransform: 'none', fontWeight: 500 } },
 shape: { borderRadius: 12 },
 components: {
  MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44 } } },
  MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
  MuiCssBaseline: { styleOverrides: { '*': { boxSizing: 'border-box' }, body: { margin: 0, backgroundImage: 'url(/botanical-pattern.svg)', backgroundSize: '640px 640px' }, 'a': { color: 'inherit' }, ':focus-visible': { outline: '3px solid #2c694e', outlineOffset: '4px' }, 'button, a': { WebkitTapHighlightColor: 'transparent' } } }
 }
});
