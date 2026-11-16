# Pantalla de carga pública: entrega de desarrollo

La configuración se administra en «Pantalla de carga pública» dentro de Administración. Permite editar título, subtítulo, ilustración animada y hasta 30 consejos. Las animaciones disponibles son riego (`watering`), hojas (`leaves`) e ilustración estática (`none`). No se ejecuta HTML, CSS ni código ingresado por un administrador.

Cada consejo tiene dos controles: «Revisé este consejo» y «Mostrar al público». Para activarlo primero debe estar revisado. Al editar su texto, ambos controles se desactivan. Los cambios se aplican al guardar la bienvenida; el guardado compara e incrementa `revision` para evitar sobrescribir una edición concurrente.

«Sugerir consejos con IA» acepta instrucciones opcionales para orientar la propuesta. Solo el botón «Solicitar sugerencias de consejos» crea un trabajo; escribir, guardar o visitar el catálogo no solicita IA. Las propuestas deben agregarse explícitamente como borradores; quedan inactivas y pendientes de revisión. La generación comparte los cupos existentes de 50 trabajos por usuario y 200 globales por día. Las propuestas son consejos no verificados y no incluyen citas inventadas.

## Datos y flujo

- Documento privado: `siteSettings/publicLoading`, accesible por las acciones administrativas `getLoadingSettings` y `saveLoadingSettings`; ambas devuelven `{ settings }`. La acción `requestLoadingTips` devuelve `{ jobId }`.
- Campos del documento: `revision`, `title`, `subtitle`, `animation`, `tips: [{ id, text, active, reviewed }]`. Metadatos de auditoría permanecen privados.
- Trabajo de sugerencias: `aiJobs/{requestId}`, `kind: 'loadingTips'`, sin ficha asociada. El worker usa el modelo de texto configurado y devuelve `proposal: { tips: string[] }`.
- GET público `getPublicLoadingSettings`: devuelve únicamente `{ title, subtitle, animation, tips: string[] }`; los consejos incluidos deben estar revisados y activos. No devuelve IDs, revisión, instrucciones, usuarios, claves ni metadatos del documento.
- URL de producción prevista: `https://us-central1-rinconcito-verde-cr.cloudfunctions.net/getPublicLoadingSettings`. El cliente usa ese destino solo para el proyecto confirmado y modo `cloud`; el modo `emulator` usa únicamente proyectos demo y host local. Sin configuración se emplean los textos locales.

El cliente consulta una sola vez al entrar a la sección pública, sin credenciales, cookies ni reintentos. Una respuesta inválida, un error o 1500 ms de espera activan la configuración local de respaldo. Se elige un consejo aleatorio por episodio de carga; permanece estable aunque cambie la fase de carga. Si no hay consejos activos se usa uno predeterminado. Las visitas nunca producen trabajos IA.

La espera mínima de 3 segundos y la espera por contenido pendiente siguen en `PageLoadingBoundary`. La verificación privada de acceso mantiene su regadera, título y mensajes originales, sin consejos ni consulta a la configuración pública. Navegar entre público y privado separa ambas configuraciones. Se conserva `prefers-reduced-motion` y «Powered by Vision Mind».

## Archivos

- `functions/src/loadingSettings.ts`: contratos compartidos, validación, valores predeterminados y proyección pública.
- `functions/src/loadingTips.ts`: generación explícita con transporte inyectable para pruebas.
- `src/features/admin/LoadingSettings.tsx`: formulario, paginación, vista previa y revisión de propuestas.
- `src/shared/loading/publicLoadingConfig.ts`: lectura pública con timeout y selección de consejo.
- `src/shared/loading/LoadingAppBoundary.tsx`, `PageLoading.tsx`, `WateringLoader.tsx`, `watering-loader.css` y `src/main.tsx`: selección público/privado e ilustraciones.
- La integración del menú, las acciones, el worker y el endpoint se encuentra en `Admin.tsx` y `functions/src/index.ts`.

## Revisión local

```bash
npm run test -- --run tests/loading-settings.test.ts tests/public-loading-config.test.tsx tests/loading-settings-ui.test.tsx tests/page-loading.test.tsx
npm run typecheck
npx eslint src/shared/loading src/main.tsx src/features/admin/LoadingSettings.tsx functions/src/loadingSettings.ts functions/src/loadingTips.ts tests/loading-settings.test.ts tests/public-loading-config.test.tsx tests/loading-settings-ui.test.tsx
npx playwright test tests/e2e/loading.spec.ts
```

Las pruebas unitarias emplean respuestas mock y verifican proyección pública, revisión obligatoria, rechazo de datos inválidos, fallback/timeout, generación exclusivamente manual, consejo estable y aislamiento privado. La generación IA real y los servicios de producción no se invocaron para esta entrega.

La validación visual automatizada quedó bloqueada en este entorno: el navegador descargado de Playwright no existe y el Chromium ya instalado falla antes de abrir páginas con `socket() failed: Operation not permitted`. No se generaron screenshots nuevos. El último comando debe ejecutarse en un entorno con Chromium permitido; cubre 320 px, 1280 px, mínimo de 3 segundos y movimiento reducido en privado.

Para revisar el formulario con emuladores, iniciar sesión como administrador, abrir la pantalla de carga, editar un consejo, comprobar que queda desactivado, revisarlo, activarlo y guardar. En el catálogo debe aparecer la bienvenida guardada y un consejo activo; en `/admin` debe permanecer la verificación original. La prueba manual de sugerencias requiere un worker mock/local; no es necesario habilitar IA real para revisar el resto.

Esta entrega prepara código y documentación. No publica cambios ni ejecuta un despliegue.
