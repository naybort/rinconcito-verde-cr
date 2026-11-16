# Entrega local: cinco frentes de Rinconcito Verde CR

Estado: implementación integrada para revisión, con [seguimiento y matriz de verificación](REVIEW-FOLLOWUP.md), **sin push, PR, publicación ni despliegue**. Base `d3fc0b919d35720a9e77905448704ba0293bd0ea`; rama local `work/five-fronts-20261116`. La copia anterior y su directorio de evidencia `docs/qa/brand-detail/` se conservaron.

## Entregas y responsables

| Frente | Agente | Resultado y documentación | Estado |
| --- | --- | --- | --- |
| 1. Registro | editor | [Tres secciones, categorías en contexto y recuperación](EDITOR-SECTIONS.md) | Integrado y probado |
| 2. IA contextual | ai | [Nombre/fotos, selección por campo, referencias y dictado](AI-CONTEXTUAL.md) | Integrado y probado con mocks |
| 3. Inventario | inventory | [Maceta, metadatos parciales y precios por presentación](INVENTORY-PRESENTATIONS.md) | Integrado y probado |
| 4. Identidad | identity | [Tipografía, fondo y carruseles público/admin](IDENTITY-GALLERIES.md) | Integrado, incluida casita original y variante QR; pendiente revisión en navegador |
| 5. Bienvenida | loading_backoffice | [Configuración, consejos revisados y animación pública](LOADING-BACKOFFICE.md) | Integrado y probado |
| Integración | root | Contratos, transacciones, evidencia de fuentes, guardias de navegación, scripts y pruebas conjuntas | Terminada |

No quedan agentes implementando ni dependencias de código pendientes. Los cinco agentes trabajaron con archivos asignados; la integración de `domain.ts`, `index.ts` y `Admin.tsx` se mantuvo centralizada.

## Cambios compartidos y compatibilidad

- `functions/src/domain.ts`: `showPrice` falso para fichas antiguas; `Stock.potNumber` por presentación; solicitud IA por nombre o hasta cuatro originales; referencias de texto opcionales; preferencias y propuestas compatibles con trabajos antiguos.
- `functions/src/index.ts`: publicación selectiva de precios, actualización por presentación sin perder cantidades ni otros precios, rechazo de colisiones de claves antiguas, comprobación de evidencia de fuentes, acciones administrativas de bienvenida, trabajo explícito de consejos y GET público sanitizado.
- `functions/src/sourceTrust.ts`: el cliente no puede autodeclarar una referencia como verificada. Se conserva evidencia anterior idéntica o de un trabajo de contenido listo para la misma ficha, revisión e identificación.
- `src/features/admin/Admin.tsx`, `pendingEditing.ts`: acceso a bienvenida desde Más y protección de borrador/inventario al salir o cambiar de ficha. Guardar ficha no registra inventario.
- `scripts/deploy-online.ts`: preparado para publicar `getPublicLoadingSettings` antes de Hosting en una entrega futura autorizada. No se ejecutó. `scripts/verify-online.ts` corresponde a las tres secciones y conserva su aviso de IA real.
- `scripts/test-emulators.mjs --direct`: alternativa de integración en entornos que impiden los sockets Unix internos de Functions. Usa los mismos handlers con Auth, Firestore y Storage emulados; no sustituye la prueba del transporte callable de Firebase.

El número de maceta se interpreta como atributo de presentación. El QR continúa por ficha, con el mismo ID/URL. No se descuentan existencias desde WhatsApp. Se mantienen las cuatro fichas demo, Sansevieria, contactos, marca de imágenes y Powered by Vision Mind. No se incorporan pagos, compradores ni comunidad.

No hay migración destructiva. Las copias locales antiguas conservan datos y traducen su posición a las tres secciones. Fuentes antiguas sin evidencia explícita se consideran sin verificar. Los precios solo aparecen tras publicar la autorización y si hay un precio válido; los cambios posteriores de una presentación actualizan únicamente las opciones ya autorizadas. Publicar una ficha con autorización apagada retira sus precios públicos.

Las reglas Firestore/Storage, Firebase/App Check, IAM, secretos, modelos configurados y límites productivos **50 por usuario / 200 por día UTC** permanecen sin cambios. Los consejos IA comparten esos cupos. No se usaron credenciales reales ni se ejecutaron solicitudes pagas.

## Evidencia de validación

| Comprobación | Resultado |
| --- | --- |
| `npm run check` | Correcto: lint, tipos frontend/Functions, **310 pruebas en 33 archivos** en el seguimiento (305/32 en la entrega inicial), validación y build |
| Catálogo | 4 plantas, 3 categorías e imágenes presentes |
| `npm run build:backend` | Correcto; ejecutado por la suite aislada |
| Emuladores con `--direct` | **30/30 pruebas aprobadas**: reglas, roles, transacciones, concurrencia, idempotencia, privacidad, galería, precios, fuentes, endpoint público y worker IA con proveedor simulado |
| QR | URL estable y zona blanca comprobadas; tres etiquetas SVG completas rasterizadas a 300 dpi y decodificadas, incluida casita y nombres/IDs largos. [Evidencia](qa/identity-followup/README.md) |
| `git diff --check` | Correcto |
| Navegador / capturas nuevas | Chromium local falla con `socket() failed: Operation not permitted`. En el seguimiento, el navegador cloud tampoco pudo alcanzar el servidor de revisión (`ERR_CONNECTION_REFUSED`). No hay capturas nuevas de la aplicación |
| Transporte callable de Functions | No verificado en este entorno: `listen EPERM ...fire_emu_*.sock` |
| Producción / IA real / micrófono real | No ejecutados, fuera del alcance autorizado |

El primer intento de emuladores reveló que Firebase CLI dirige incluso 127.0.0.1 al proxy. El intento sin proxy llegó a Functions, cuyo socket Unix fue bloqueado. La alternativa directa aprobada ejecutó los handlers con servicios demo reales y transporte OpenAI interceptado. Comando usado únicamente para esta comprobación local:

```bash
env -u HTTPS_PROXY -u https_proxy -u HTTP_PROXY -u http_proxy npm run test:emulators -- --direct
```

Sin ese problema de proxy, basta `npm run test:emulators -- --direct`. En la Mac puede ejecutarse la suite habitual `npm run test:emulators` para comprobar además el transporte callable. Todas usan proyecto `demo-rinconcito-verde-tests`, puertos y almacenamiento temporal propios; no reinician ni reutilizan emuladores interactivos. El backend declara Node 22; esta validación usó Node 24 del entorno.

Se corrigió una espera de transición MUI en una prueba; una ejecución conjunta con emuladores agotó el tiempo de una prueba de colecciones. La ejecución inicial secuencial de `npm run check` aprobó las 305 sin cambiar el límite ni desactivar pruebas; el seguimiento de identidad aprobó 310. Vite conserva el aviso no bloqueante de chunks mayores de 500 kB (entrada ~593 kB y admin diferido ~845 kB antes de gzip).

## Revisión segura en la Mac

Primero revisar la rama local de la entrega, sin reemplazar el checkout actual ni aplicar sobre cambios pendientes. El bundle y parche adjuntos contienen solo código/documentación; no archivos `.env`, credenciales, dependencias o datos de emuladores. El archivo de entrega externo incluye el SHA final y su checksum.

Una vez descargado el bundle, desde el repositorio existente:

```bash
git status --short
git bundle verify /ruta/rinconcito-verde-five-fronts.bundle
git fetch /ruta/rinconcito-verde-five-fronts.bundle work/five-fronts-20261116:review/five-fronts-20261116
git worktree add ../rinconcito-verde-review review/five-fronts-20261116
cd ../rinconcito-verde-review
npm ci
npm --prefix functions ci
npm run check
npm run test:emulators
```

El `fetch` solo crea la rama de revisión; no hace pull, merge ni cambia main. Si esa rama ya existe, elegir un nombre nuevo en vez de forzarla. El parche es alternativa al bundle: comprobar con `git apply --check` en una copia nueva basada en el SHA indicado antes de aplicarlo. No usar reset/clean ni sobrescribir configuraciones locales.

Para UI, en un entorno que permita Chrome y sin otra suite de test ejecutándose:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:admin
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

Casos de revisión: crear ficha manual; identificar por nombre y fotos con mocks; aplicar solo campos seleccionados; crear categoría; recuperar un borrador viejo; registrar dos presentaciones con precios/macetas; apagar publicación de precio; verificar navegación pendiente; recorrer galerías con swipe/teclado; revisar/activar consejo y confirmar que `/admin` mantiene su loader privado. Las suites E2E ya están actualizadas; todavía requieren ejecución visual.

## Dependencias de Bryan y límites

1. **Pendiente de imagen resuelto:** el original estaba fuera del checkout. Se archivó sin cambios, se derivó la casita de forma determinística y se agregó la variante QR con contacto. No se añadieron promesas de envío. La etiqueta compacta y las marcas de fotografías conservan su icono anterior.
2. El dictado opcional mediante reconocimiento del navegador es un supuesto documentado, sujeto a confirmación. Siempre existe entrada manual; nunca inicia IA ni usa el micrófono sin clic.
3. Faltan capturas y revisión visual de las nuevas pantallas en móvil/escritorio, y la ejecución del transporte callable en un entorno con sockets permitidos.
4. El número de maceta por presentación y el dictado del navegador siguen como decisiones de producto para revisión, sin bloquear el desarrollo. La disponibilidad/calidad/costo de modelos reales no se verificó. Esta entrega no autoriza despliegue posterior. Los diagramas solicitados para otra sesión siguen como tarea separada.
