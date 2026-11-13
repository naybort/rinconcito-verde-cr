# Rinconcito Verde CR — etiquetas, marca fotográfica y ficha completa

Implementación local en nube, 13 de noviembre de 2026. Base exacta: `8d5f95c1a434dacb5e57edd4dd60d04178015152` de `naybort/rinconcito-verde-cr`.

La implementación se preparó en una copia cloud nueva, preservando el checkout preexistente. La entrega inicial fue un paquete sin commit ni push; posteriormente Bryan autorizó subir únicamente esta entrega al repositorio para descargarla con pull. No se hizo PR ni deploy y no se modificó producción. No se usaron secretos ni IA real, ni se activó facturación. Los datos, originales de fotos, contactos y enlaces de patrocinio permanecen iguales a la base.

## Qué cambió y dónde

- `src/shared/brand/identity.ts`: identidad centralizada, reutilizando `/rinconcito-icon.png`, nombre configurado y colores existentes; carga de recursos y descarga local.
- `src/shared/brand/BrandSignature.tsx` y `src/shared/PlantPhoto.tsx`: icono, firma y líneas en una franja separada de la foto; marco discreto. La ficha usa `contain`, sin recortar la planta.
- `src/shared/brand/photoExport.ts`: composición canvas determinística y reutilizable. Exporta una copia PNG con margen y firma; nunca escribe sobre el original. Conserva la relación de aspecto; limita el lado mayor de la foto a 2400 px para controlar memoria. Las imágenes menores no se amplían. Las imágenes externas necesitan CORS para exportarse; si falla, se muestra un error y el visor sigue disponible.
- `src/features/admin/labelTemplate.ts`: SVG autocontenido descargable, con iconos existentes a ambos lados del QR. QR de 26 mm, corrección M, fondo opaco y zona de silencio de cuatro módulos. Usa la función existente `plantUrl(id)`; editar nombre/tamaño/copias no cambia el enlace. Una ficha equivale a un QR, compartido por sus macetas.
- `src/features/admin/Labels.tsx`: selector de fichas publicadas, copias enteras 1–100, ancho 50–100 mm y alto 45–150 mm, previsualización, descarga SVG, impresión/guardar PDF mediante el navegador. Precarga el SVG completo; desactiva salidas inválidas o incompletas y ofrece reintento ante error. El CSS de impresión elimina navegación y controles y evita partir una etiqueta.
- `src/features/catalog/PlantGallery.tsx`: galería con miniaturas, contador, flechas y visor amplio; diálogo de pantalla completa en móvil, teclado, Escape, retorno de foco y descarga de foto con marca.
- `src/app/App.tsx`: ficha de dos columnas en desktop y una en móvil, cuidados separados y legibles, regreso al catálogo. Se mantienen favoritos, consulta por WhatsApp, notas, fuentes, fichas archivadas y `Powered by Vision Mind` al final.
- `package-lock.json`: solo repone las dos entradas transitivas opcionales `@emnapi/core` y `@emnapi/runtime` que faltaban e impedían `npm ci`; sin nuevas dependencias de aplicación.

## Verificación realizada

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | Correcto: lint, tipos frontend/backend, 95 pruebas en 12 archivos, catálogo y build. |
| `npm ci --dry-run --ignore-scripts --no-audit --no-fund` | Correcto después de reparar el lockfile. |
| QR por ficha | Pruebas con `jsQR`: Sansevieria, demo Monstera e ID máximo de 80 caracteres; borde blanco, escape XML y estabilidad ante cambios de nombre/tamaño. |
| SVG descargado completo | Renderizado a 300 dpi y QR decodificado: Sansevieria y etiqueta mínima 50 × 45 mm con nombre largo/ID de 80 caracteres. |
| PDF de muestra | Conversión offline del SVG descargado, una página de exactamente 60 × 50 mm; render inspeccionado. No es evidencia de paginación del navegador. |
| Foto descargada | Monstera original 512 × 279, copia 528 × 337, margen de 8 px; todos los píxeles del rectángulo original coinciden exactamente (Pillow). |
| Navegador cloud real | Fichas en viewport/iframe 320, 390, 768 y 1280; sin desbordamiento horizontal del documento. Visor móvil a 390 × 900, siguiente/anterior, flechas, Escape y retorno de foco. |
| Regresiones manuales | Sansevieria y demo; favorito persistente al navegar; regreso al catálogo conserva búsqueda; WhatsApp correcto sin enviar mensajes; footer Vision Mind. |
| Etiquetas manuales | 3 copias con fuente idéntica, SVG descargable, valores fraccionarios desactivan salida, mínimo y nombre largo, móvil 320 y etiqueta de ancho 100 con scroll interno. |

El build mantiene el aviso de bundle admin grande (aprox. 872 kB). No se expandió el alcance para cambiar su arquitectura.

## Pruebas preparadas y limitaciones concretas

`tests/branding.test.ts` aporta las pruebas unitarias de composición y QR. `tests/e2e/branding.spec.ts` agrega ocho casos de navegador: cuatro anchos, exportación/píxeles, QR de etiqueta completa, copias, tamaños, descarga, PDF, error de icono/reintento y error de foto. `tests/admin-e2e/admin.spec.ts` adapta el flujo admin a la plantilla SVG. Los tests e2e locales rechazan cualquier host distinto de `127.0.0.1`.

La suite Playwright CLI no pudo lanzar Chromium en este contenedor: `socket() failed: Operation not permitted` en `process_singleton_posix.cc`. La instalación estándar alternativa de Chromium headless shell falló por una descarga ZIP truncada del CDN. Los ocho casos nuevos están preparados, pero no se declaran aprobados. La validación manual cloud anterior sí se completó con la vista previa local y se guardaron capturas. La vista previa temporal ya está detenida.

**Bloqueo de aprobación automática:** el intento `npm run test:admin` (`scripts/test-emulators.mjs --ui`, proyecto demo `demo-rinconcito-verde-tests`) fue rechazado por el revisor automático porque Firebase CLI intentó contactar el endpoint público `https://firebase-public.firebaseio.com/cli.json`, fuera de los emuladores locales; el revisor indicó que el payload no estaba verificado como seguro/autorizado para ese destino. No se reintentó esa operación. El log registra GET de metadatos del CLI y comienzo de descarga del emulador oficial; no contiene ejecución del seed ni resultados de la suite. El resultado de esa suite queda **no verificado**, sin evidencia de escrituras a producción.

El navegador cloud no expuso el diálogo nativo al accionar `Imprimir / guardar PDF`. Por ello siguen pendientes la paginación real de varias hojas desde el navegador y una prueba física con teléfono/impresora. Las dimensiones SVG/PDF y la decodificación de la composición completa sí están verificadas. No se probaron imágenes privadas/remotas con credenciales.

## Revisar sin conectar Firebase ni IA

Requiere Node >=22.18.0. Después de recibir el commit por `git pull --ff-only`, instalar las dependencias y continuar desde `npm run check`. Como alternativa, para revisar el paquete inicial en una copia limpia de la base:

```sh
git switch -c review/etiquetas-galeria 8d5f95c1a434dacb5e57edd4dd60d04178015152
git apply --check /ruta/rinconcito-verde-brand-detail.patch
git apply /ruta/rinconcito-verde-brand-detail.patch
npm ci --ignore-scripts --no-audit --no-fund
npm --prefix functions ci --ignore-scripts --no-audit --no-fund
npm run check
VITE_FIREBASE_MODE= npm run dev -- --host 127.0.0.1 --port 4173
```

No crear `.env` de producción. Abrir `http://127.0.0.1:4173/#/plantas/demo-monstera` y `/#/plantas/sansevieria`. El fixture `http://127.0.0.1:4173/tests/labels-browser.html` permite revisar las etiquetas sin login, backend ni secretos. `tests/responsive-browser.html` permite elegir anchos 320/390/768/1280; solo son fixtures de desarrollo y no entran en `dist`.

Para automatizar en un equipo que permita Chromium, detener el servidor manual y ejecutar `npm run test:e2e`. Instalar antes el navegador de Playwright si no existe (`npx playwright install chromium`). Revisar la impresión desde el fixture al 100 %, sin encabezados/pies, primero una etiqueta y luego varias hojas. Escanear con un teléfono antes de imprimir un lote. El QR apunta al catálogo canónico existente, no al servidor local.

No ejecutar `npm run test:admin` como paso obligatorio de esta revisión sin resolver primero la restricción de red del CLI y confirmar que se usará exclusivamente el proyecto demo con IA desactivada. No ejecutar scripts de deploy.

## Evidencias entregadas

Las evidencias están en el paquete de Biblioteca `rinconcito-verde-brand-detail-20261113.zip`, bajo `source/docs/qa/brand-detail/`. Son artefactos de revisión y no se incluyen en el commit de código:

- `detail-desktop.jpg`, `detail-mobile-320.jpg`, `gallery-mobile-390.jpg`.
- `labels-desktop.jpg`, `labels-mobile-320.jpg`, `labels-minimum-long-name.jpg` (esta última precede únicamente al ajuste del ancho de los campos del formulario).
- `monstera-branded.png`: descarga real del visor.
- `etiqueta-sansevieria.svg` y `etiqueta-long-id-50x45.svg`: descargas reales autocontenidas.
- Renderizados `*-300dpi.png`, `etiqueta-sansevieria.pdf` y su preview. El PDF es una muestra offline de la etiqueta, no una impresión multipágina del navegador.

El paquete inicial contiene el parche de código, una copia completa de fuentes sin `.git`, dependencias, secretos ni resultados temporales de test, y estas evidencias. El parche es sobre la base indicada y no requiere sobrescribir otro checkout. El commit autorizado contiene código, pruebas y esta guía; no incluye cambios del plan UX paralelo ni artefactos generados. Si los cambios ya llegaron mediante pull, no aplicar además el parche.
