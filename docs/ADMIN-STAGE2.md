# Etapa 2: administración, inventario y QR

Implementación local sobre la versión de la Mac, conservando las cuatro plantas (incluida Sansevieria), favoritos, WhatsApp `+506 71160290`, fotos y crédito Vision Mind. Ningún servicio productivo se configura ni se publica al ejecutar las pruebas.

La guía del [flujo de siete pasos e instrucciones por generación](ADMIN-WORKFLOW.md) describe navegación, recuperación, revisión de propuestas y pruebas.

## Uso local

Requisitos: Node 22.22.2+ de la rama 22 (runtime de Functions), Java 21 y Chrome/Chromium. Node 24.13.0 disponible en la Mac ejecutó las pruebas, aunque jsdom declara un mínimo de 24.15.0 para esa rama y el emulador avisa de la diferencia con Node 22. No se modificó la instalación global de Node.

```bash
npm ci
npm --prefix functions ci
cp .env.example .env.local
npm run emulators
# En otra terminal:
npm run seed:emulators
npm run dev -- --host 127.0.0.1
```

Abrir `http://127.0.0.1:5173/#/admin`. El seed crea exclusivamente cuentas ficticias en Auth Emulator: `admin@example.test`, `editor@example.test` y `outsider@example.test`, con contraseña `Local-test-123!`. La última no recibe permisos. El script exige hosts de localhost y uno de los dos proyectos demo autorizados; no sirve para provisionar usuarios reales.

Puertos propios para no interferir con AFP u otros emuladores: Auth 19099, Firestore 18080, Storage 19199, Functions 15001, UI 14000, hub 14400, logs 14500, WebSocket Firestore 19150, Eventarc 19299 y tareas 19499. El proyecto es siempre `demo-rinconcito-verde`. El backend de IA sigue apagado por defecto; existe una opción local explícita y aislada para OpenAI real, documentada en [LOCAL-AI.md](LOCAL-AI.md). `AI_ENABLED=true` por sí solo no la habilita en emuladores.

Sin `VITE_FIREBASE_MODE` el sitio usa el JSON original y muestra administración pendiente de configuración. `emulator` solo funciona en localhost con uno de los dos proyectos demo y su bucket correspondiente. `cloud` requiere configuración explícita; no se activa por omitir una variable. Para volver al catálogo estático, quitar `.env.local` y reiniciar Vite. No hacer un build de producción con modo emulator.

## Flujo de trabajo

1. Crear una ficha desde móvil o escritorio. El UUID se fija antes de la primera subida y nunca cambia al renombrar.
2. Cargar JPEG, PNG o WebP de hasta 10 MB, completar datos y guardar borrador. Las categorías deben estar activas. La fotografía original queda privada y no puede reemplazarse.
3. Aplicar una plantilla de cuidados copia su contenido al borrador. Modificar la plantilla no modifica fichas publicadas. La pantalla de plantillas muestra las fichas relacionadas.
4. Enviar a revisión exige descripción, foto, texto alternativo, categoría y cuatro campos de cuidado. Solo admin puede publicar; editor puede redactar, enviar a revisión y registrar inventario.
5. Revisar datos y fotografía; publicar crea una proyección pública sin notas, originales, movimientos ni roles. La publicación de un original genera una copia pública separada.
6. Archivar conserva la ficha pública y sus cuidados en la misma URL, con aviso de archivo y fuera del listado. Restaurar crea un borrador; se debe volver a revisar/publicar.

El borrador en edición se recupera desde una copia local por UID, con caducidad de siete días. Si localStorage falla se avisa; el guardado al servidor continúa. Cerrar sesión elimina la copia local de ese usuario. Cambiar de ficha con texto sin guardar exige elegir entre volver o descartar. El servidor rechaza revisiones antiguas para evitar pisar cambios de otra persona. Ante conflicto, conservar el texto y recargar la ficha para reconciliarlo manualmente.

## Inventario y etiquetas

El inventario se identifica con `plantId--presentation`; `general`, `pequena` o `maceta-20cm` son ejemplos de presentación. No existe un documento por maceta. Entrada, reserva, liberación, venta disponible, venta reservada, baja y ajuste tienen cantidad, motivo, autor, fecha y saldos anterior/posterior. Precio CRC entero y ubicación se introducen manualmente; son privados. No se deducen desde IA.

Cada lote acepta hasta 30 fichas/presentaciones distintas y se aplica por completo o se rechaza. Las transacciones impiden saldo negativo. Un `requestId` UUID tiene recibo persistente por actor; repetirlo con el mismo contenido devuelve el resultado y con otro contenido se rechaza. WhatsApp nunca llama al backend de inventario.

Las etiquetas codifican `https://rinconcito-verde-cr.web.app/#/plantas/ID`. Repetir copias conserva exactamente la URL. Incluyen nombre, ID legible y QR con zona de silencio; se puede configurar ancho, alto y copias y usar impresión/guardar PDF del navegador. Las etiquetas de fichas nuevas locales no abrirán en producción hasta una futura migración/publicación autorizada. Confirmar dominio duradero, impresora, papel y escaneo físico antes de producir volumen.

## Modelo y permisos

| Colección | Acceso / propósito |
| --- | --- |
| publicPlants / publicCategories | Lectura pública; escritura solo servidor |
| plants | Borrador actual, estado, revisión, foto original, notas y fuentes |
| categories / careTemplates | Catálogos reutilizables con archivo recuperable |
| stocks / movements | Saldos y registro inmutable de cada movimiento |
| operations / audit | Recibos de idempotencia y trazabilidad de comandos |
| adminUsers | Lista de acceso activa; roles coinciden con custom claims |
| aiJobs / aiQuotas | Propuestas privadas, intentos, consumo devuelto y límites |

Todos los writes de Firestore desde clientes están prohibidos. `adminCommand` valida autenticación, claim admin/editor y documento `adminUsers` activo en cada llamada, además de esquemas estrictos y revisión. Las reglas también comprueban esa lista en lecturas privadas y Storage. Revocar `active` corta el acceso sin esperar a que caduque el claim. No existe UI ni endpoint para autorregistro o asignación de roles.

`originals/UID/plantId/UUID` admite creación por su propietario autorizado y lectura del equipo, nunca reemplazo ni eliminación por cliente. `proposals/plantId/jobId` es privado y solo lo escribe el backend. `public/plantId/requestId` es público y solo lo escribe el backend. La publicación valida tamaño, formato y firma de imagen. La app usa lecturas autenticadas para originales, no URLs públicas con tokens. Una copia pública ya aprobada puede seguir en cachés después de archivar; archivar no es una función de eliminación de fotografías.

## IA opcional

Identificación y contenido usan Responses API; las propuestas de cuidados requieren nombre confirmado por una persona y fuentes presentes en los resultados/citas de la búsqueda. Se validan categorías existentes, fecha y estructura; campos de stock, precio o publicación se rechazan. La revisión acepta campos en el borrador solo si la versión sigue vigente. No aplica automáticamente nuevas propuestas sobre texto humano.

La mejora opcional usa Images Edits con el original privado, instrucciones para preservar características reales y una única imagen de salida. Original y propuesta se muestran separados y la selección es explícita. El modelo puede alterar detalles: la comparación humana es obligatoria antes de elegir/publicar; el código no garantiza equivalencia botánica o visual por sí mismo.

`AI_ENABLED` debe ser exactamente `true`; para OpenAI real en emuladores también se requiere `AI_EMULATOR_OPENAI=true`, clave exclusivamente local y controles de aislamiento descritos en [LOCAL-AI.md](LOCAL-AI.md). En producción, los modelos `OPENAI_TEXT_MODEL` / `OPENAI_IMAGE_MODEL` deben configurarse explícitamente y `OPENAI_API_KEY` se vincula mediante Secret Manager solo a la función procesadora. No hay clave en Vite ni se creó un secreto. El código se comprobó con respuestas simuladas, sin llamadas pagas. Modelos disponibles, límites y calidad real se deben validar con presupuesto autorizado.

En producción: máximo cinco trabajos por usuario/día UTC y treinta por proyecto/día UTC. Los emuladores autorizados no tienen bloqueo diario por usuario/proyecto, por solicitud de Bryan; mantienen los contadores, el historial y la protección contra duplicados. En ambos entornos, hasta tres intentos ante fallos temporales 429/5xx (la falta de saldo/cuota no se reintenta). Texto limita salida a 3000 tokens y dos llamadas de búsqueda; imagen limita a una salida 1024×1024 de calidad baja. Son cotas de actividad, no un presupuesto monetario. Los trabajos tienen lease transaccional y resultado único. Un timeout/red interrumpida o un worker cuyo lease venció sin resultado confirmado queda fallido para revisión manual, evitando repetir a ciegas una llamada posiblemente cobrada. La facturación del proveedor no tiene garantía de exactamente una vez. Apagar `AI_ENABLED` detiene nuevas solicitudes/procesamiento; los borradores manuales siguen disponibles.

Referencias verificadas: [emuladores de Functions](https://firebase.google.com/docs/functions/local-emulator), [configuración de Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure), [búsqueda en Responses](https://developers.openai.com/api/docs/guides/tools-web-search), [Images Edits](https://developers.openai.com/api/reference/resources/images/methods/edit).

## Configuración y despliegue posteriores

No se hizo push ni deploy. No se activó Blaze, facturación, API, Storage/Firestore productivos, App Check ni usuarios reales. Antes de cualquier activación:

- Confirmar proyecto, región, bucket, presupuesto, límites y personas/roles concretos. La región de desarrollo es `us-central1`; Functions acepta `FUNCTION_REGION` y el cliente `VITE_FIREBASE_REGION`. No cambiarla tras desplegar sin plan de migración.
- Habilitar servicios solo con autorización. Auth debe admitir únicamente cuentas administrativas provisionadas; el registro de una cuenta en Auth por sí solo no concede acceso, pero revisar también restricciones de creación de cuentas del proveedor.
- Provisionar claims y `adminUsers` fuera del cliente, con privilegios controlados. No reutilizar usuarios/contraseñas del seed.
- Configurar App Check (`VITE_FIREBASE_APPCHECK_SITE_KEY`) para las callables cloud; en producción el backend lo exige. Revisar dominios autorizados y CORS de Storage para las lecturas autenticadas de fotos.
- Revisar retención de originales, auditoría, movimientos, recibos e índices y respaldos antes de borrar cualquier historial. No configurar TTL en recibos sin definir ventana de idempotencia.
- Migrar las cuatro fichas JSON preservando IDs y copias públicas. El seed actual es deliberadamente exclusivo de emuladores; la migración productiva debe hacerse mediante herramienta revisada con destino explícito y respaldo, pendiente de autorización.
- Desplegar reglas, Functions y luego Hosting mediante comandos explícitos revisados. `npm run deploy` conserva su comportamiento anterior: publica exclusivamente Hosting y **no** configura backend.
- Realizar smoke tests con cuentas autorizadas y visitantes, validar cuotas y alertas, habilitar IA solo después de pruebas controladas y autorización de consumo.

Rollback del frontend: release anterior de Hosting. Rollback de datos: restaurar desde respaldo/revisiones auditadas con un procedimiento aprobado; nunca resetear inventario desde el JSON ni borrar movimientos para cuadrar un saldo. Un ajuste documentado corrige stock. Conservar IDs, URLs y proyecciones de cuidados ya entregadas mediante QR.

## Comprobaciones

```bash
npm run check
npm run test:emulators
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:admin
```

Las suites `test:emulators` y `test:admin` inician/paran un entorno limpio en el proyecto separado `demo-rinconcito-verde-tests`, con puertos y directorio temporal alternativos y sin cargar secretos locales; deben ejecutarse por separado entre sí y pueden convivir con `npm run emulators`. Las pruebas unitarias y E2E del catálogo fuerzan el modo estático sin modificar `.env.local`; la configuración de Playwright admin inyecta su propio modo emulador. Ver `docs/STAGE2-VALIDATION.md` para evidencia y límites de la verificación.
