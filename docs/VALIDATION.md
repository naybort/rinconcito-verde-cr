# Validación final local — 12 noviembre 2026

Mac de Bryan, Chrome instalado y Node 24.13.0.

- 29 pruebas unitarias aprobadas: catálogo, filtros, favoritos, cuidados, WhatsApp, errores y storage.
- 6 E2E aprobadas: catálogo y footer a 320/390/768/1280 px, teclado/favoritos retirados/ruta inválida, detalle con cuidados y favorito seleccionado.
- ESLint, TypeScript, validador JSON (3 plantas/3 categorías) y build aprobados.
- Revisión visual de capturas de catálogo móvil 320 px y detalle: corazón claro, iconos de cuidados, footer debajo del menú sin superposición.
- Se conservan exactamente plantas/fotos de prueba por corrección explícita de Bryan; se quitó solo aviso/badge demo. Datos reales pendientes.
- WhatsApp apunta al número confirmado sin enviar mensajes ni visitar el servicio durante pruebas.
- `git diff --check` limpio. Cambio previo package-lock preservado. Sin commit/push/deploy.

Ejecutar: `npm run check` y `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e`.

Límites: Safari no probado; datos/cuidados/fotos siguen siendo ejemplos. Calathea conserva foto original con elementos de captura. La marca es adaptación generativa de imagen de Bryan. Dominio/hosting pendientes.
