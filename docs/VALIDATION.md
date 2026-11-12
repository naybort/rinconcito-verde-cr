# Verificación de la primera base

## Resultado observado

Entorno: Linux, Node 24.22.1, npm 11.9.0.
Dependencias exactas en package.json y package-lock.json nuevos.

- ESLint: pasó.
- Vitest: 2 archivos, 26 pruebas aprobadas.
- Validador: 3 plantas, 3 categorías, imágenes locales presentes.
- TypeScript: pasó.
- Build Vite: pasó, 917 módulos; JS 389,20 kB (122,54 kB gzip).
- Todos los PNG y SVG previstos están presentes y no vacíos.
- SVG raíz: volver 16×16, explorar 20×20, favorito 32,6667×38,2917, añadir 14×14. El código no sobrescribe sus dimensiones.
- Servidor Vite local en 127.0.0.1 inició correctamente.

## Limitación de navegador

Las cinco pruebas E2E NO están aprobadas: Chromium del sistema no pudo iniciar por socket() Operation not permitted en process_singleton_posix. Se intentó instalar Chromium headless de Playwright; la descarga devuelta no era un ZIP válido y la instalación falló. La segunda ejecución no encontró el ejecutable. El navegador de revisión alternativo no pudo conectar con el loopback del entorno (ERR_CONNECTION_REFUSED).

Esto bloqueó la revisión visual de las tres pantallas, geometría real a 360/390/768/1280, foco real y persistencia tras recarga en navegador. Las pruebas unitarias e integración usan jsdom y no reemplazan esas comprobaciones.

Para completar en Mac: npm ci; npx playwright install chromium; npm run test:e2e. Revisar también manualmente en Safari y comparar el subconjunto del Figma. Los tests no envían mensajes ni visitan WhatsApp.

## Pruebas cubiertas

Contrato de catálogo válido/vacío, campos inválidos, IDs y categorías duplicados, referencias inválidas, rutas de imagen restringidas; favoritos deduplicados, productos retirados, versiones desconocidas, JSON corrupto, almacenamiento bloqueado; generación/codificación de mensajes y números inválidos; lista, detalle, estado vacío, foto fallida, guardar/quitar y botón WhatsApp deshabilitado.

## Pendientes antes de uso comercial

Revisión visual/E2E, datos y fotos definitivos, teléfono real, validación comercial del mensaje y decisión de repositorio/hosting. Búsqueda, filtros, perfil y guía siguen fuera de esta base.

No hubo mensajes enviados, pagos, merge, repositorios remotos ni despliegues.
