# Pantalla de carga con riego

La entrada al sitio y las cargas completas de catálogo/administración muestran una regadera animada, gotas y dos plantas. Se conserva el icono existente `/rinconcito-icon.png`, la paleta de Rinconcito Verde y el crédito final Powered by Vision Mind. La ilustración es SVG/CSS, no un logo nuevo ni un recurso generado con IA; no requiere dependencias ni archivos externos.

## Duración y carga real

- La primera entrada muestra la pantalla durante al menos **3000 ms**.
- El catálogo y la administración se montan y cargan en paralelo, ocultos mientras aparece la pantalla.
- Si los datos o la comprobación de acceso tardan más, la pantalla permanece hasta que terminen.
- La descarga del módulo administrativo y la comprobación de acceso comparten el mismo reloj. No se suman tres segundos por cada fase.
- Una nueva carga completa después de haber mostrado contenido inicia su propio mínimo de tres segundos. Las operaciones internas, como guardar o esperar una propuesta IA, conservan sus indicadores actuales.
- Los errores de carga siguen liberando la pantalla y mostrando la alternativa/error existente. Los temporizadores se cancelan al desmontar.

`PageLoadingBoundary` coordina las fases señaladas por `PageLoading`. El mínimo está en `MINIMUM_LOADING_MS`, en `src/shared/loading/PageLoading.tsx`; el arranque lo conecta en `src/main.tsx`. Las llamadas de catálogo, Suspense administrativo y verificación de acceso están en `src/app/App.tsx` y `src/features/admin/Admin.tsx`.

## Accesibilidad y presentación

`WateringLoader.tsx` y `watering-loader.css` contienen el dibujo y la presentación adaptable. El texto de estado es una región `status` con anuncio cortés; el SVG decorativo está oculto a lectores de pantalla. El contenido pendiente usa `hidden`, por lo que no se puede alcanzar con el teclado hasta estar disponible. `prefers-reduced-motion: reduce` elimina las animaciones y conserva la ilustración, el texto y el mismo tiempo mínimo.

## Validación

- `npm run check`: **216 pruebas en 21 archivos**, lint, tipos de frontend/backend, catálogo y build aprobados con configuración ficticia de producción y la pausa autorizada de App Check.
- `tests/page-loading.test.tsx`: carga paralela, frontera 2999/3000 ms, carga lenta de ocho segundos, fases consecutivas, nuevo episodio, limpieza de temporizadores, StrictMode y error con alternativa.
- `tests/e2e/loading.spec.ts`: casos preparados para 320 y 1280 px, frontera de tiempo en navegador, ausencia de desbordamiento, capturas y movimiento reducido en `/admin`.
- Los tres casos de navegador **no pudieron ejecutarse** en cloud: Chromium terminó antes de abrir la página con `socket() failed: Operation not permitted`. El navegador alternativo tampoco puede conectar al servidor local del entorno. No se presentan como pruebas aprobadas ni como capturas obtenidas.
- Se revisó visualmente la ilustración SVG mediante una exportación PNG de Inkscape. Esa revisión estática no comprueba el movimiento ni el layout completo en navegador.
- El build conserva el aviso de chunks mayores de 500 kB. No se consultó Firebase ni se ejecutó IA para estas pruebas.

Para ejecutar los casos de navegador donde esté disponible Chromium/Chrome:

```bash
npm run test:e2e -- tests/e2e/loading.spec.ts --workers=1
```

Si se usa un Chrome instalado en lugar del navegador de Playwright, indicar su ejecutable mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Las capturas esperadas son `test-results/loading-320.png`, `test-results/loading-1280.png` y `test-results/loading-reduced-motion.png`. Son pruebas con catálogo local y Firebase desactivado; no requieren credenciales ni emuladores.

Para publicar, manteniendo la pausa de App Check solicitada:

```bash
git pull --ff-only origin main && npm run deploy:online -- --without-app-check
```

Después del despliegue, recargar `/` y `/admin` para comprobar la animación. Este comando no lanza la prueba de IA de pago.
