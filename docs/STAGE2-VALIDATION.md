# Verificación local de etapa 2

Fecha: 12 de noviembre de 2026. Base: checkout local de la Mac, incluidas las modificaciones previas sin subir. Se mantuvo una copia anterior en `Documents/Codex/2026-11-12/task/stage2-base`. El remoto no se usó para reemplazar la base. No se hizo commit, push, deploy ni configuración productiva.

## Resultados

| Comprobación | Resultado |
| --- | --- |
| ESLint | Pasa |
| TypeScript frontend y Functions | Pasa |
| Unitarias (contrato, catálogo, favoritos, administración, IA simulada) | 39 pasan |
| Firebase Auth/Firestore/Storage/Functions emulados | 11 pasan |
| E2E del catálogo en Chrome | 7 pasan; 320, 390, 768 y 1280 px |
| E2E del administrador en Chrome | 5 pasan; flujo completo a 320, 390 y 1280 px, acceso y error de red |
| JSON/recursos originales | 4 plantas y 3 categorías válidas; fotos presentes |
| Build | Pasa; entrada pública ~479 kB y administrador diferido ~838 kB sin comprimir |
| Dependencias runtime web: `npm audit --omit=dev` | 0 avisos |
| Dependencias runtime Functions | 0 avisos |

En backend se comprobó: lectura pública sin borradores, denegación de writes directos, claims sin lista de acceso, editor sin publicación, revisiones obsoletas, publicación sin campos privados, entrada de diez unidades, recibos idempotentes, rechazo de payload alterado, ventas concurrentes sin saldo negativo, atomicidad de lotes, reservas/liberación/venta reservada, archivo/restauración conservando cuidados, IA desactivada, tamaño/formato/privacidad/inmutabilidad de originales, revocación inmediata y plantillas que no cambian fichas publicadas.

En navegador se comprobó: recuperación tras recargar, conservación de texto escrito durante la subida de foto, guardado/publicación, doble clic en borrador y stock sin duplicación, error de IA sin perder texto, error de red y reintento, roles, ausencia de notas privadas en ficha pública, búsqueda y stock, copias idénticas de QR y **decodificación del PNG del QR** contra `https://rinconcito-verde-cr.web.app/#/plantas/ID`. Se midió ausencia de desbordamiento horizontal y no hubo errores JavaScript en el flujo completo.

La IA se probó con transporte simulado: identificación con incertidumbre, rechazo de fuentes no presentes en búsqueda/citas, categorías inválidas y campos de stock/precio/publicación; requisito de identificación humana, errores 429/401, entrada original y propuesta PNG separada, límites diarios, lease y máximo de reintentos. No se hicieron llamadas a OpenAI ni se probó la calidad real de identificación, fuentes o edición de imagen.

## Evidencia visual

- [Listado móvil](qa/admin-mobile-list.png)
- [Listado escritorio](qa/admin-desktop-list.png)
- [Inventario móvil](qa/admin-mobile-inventory.png)
- [Etiquetas escritorio](qa/admin-desktop-labels.png)

Las pruebas regeneran las cinco pantallas (listado, alta, revisión, inventario y etiquetas) para tres anchos en `test-results/admin-*.png`. Una suite posterior de Playwright puede limpiar `test-results`; las cuatro capturas anteriores se conservan en documentación.

## Avisos revisados y límites

- Se corrigió la dependencia gRPC vulnerable mediante override compatible a `^1.14.7`, comprobado con emuladores; Functions usa firebase-admin 14.5.1 y firebase-functions 7.4.0. No se aplicó `npm audit fix --force` ni se degradaron SDK principales.
- Quedan **22 avisos moderados en herramientas de desarrollo** (ESLint/typescript-eslint, minimatch/glob y dependencias de Firebase CLI como OpenTelemetry/uuid). Los arreglos automáticos restantes proponen cambios mayores; se dejaron documentados para una actualización dedicada. No aparecen en la auditoría runtime web/Functions. Las pruebas no equivalen a una auditoría exhaustiva de seguridad.
- Node local 24.13.0 queda por debajo del mínimo declarado por jsdom 31 en la rama 24; las suites pasaron. Recomendada versión compatible 22.22.2+ de Node 22 para alinear Functions. No se cambió Node global.
- Vite avisa del tamaño del chunk administrativo. Se carga bajo demanda; el catálogo estático no descarga Firebase antes de abrir el administrador. Queda margen para optimizar la carga privada si el volumen crece.
- Emuladores no equivalen a producción: App Check cloud, CORS de bucket, IAM entre reglas Storage y Firestore, región, identidad del servicio, cuotas y comportamiento del proveedor deben comprobarse en un entorno autorizado.
- Pendientes dispositivos/Safari reales, cámara física, impresión y escaneo físico de etiquetas. Las medidas de etiqueta son configurables; no se conoce aún impresora/papel.
- Firebase productivo, usuarios/roles reales, migración productiva, presupuesto/Blaze, Secret Manager, modelos habilitados y calidad IA siguen pendientes de configuración/autorización. Sin eso, el código funciona con catálogo estático o emuladores locales, sin activar administración productiva.

## Ampliación: OpenAI real opcional en emuladores

Se agregó el modo local opt-in descrito en [LOCAL-AI.md](LOCAL-AI.md), apagado por defecto. Conserva los controles productivos y requiere indicadores backend explícitos, clave local y servicios de Firebase aislados en localhost/proyecto demo. No se leyeron ni usaron claves reales, ni se hicieron llamadas pagas.

- `npm run check`: lint, TypeScript de frontend/Functions, **48 pruebas unitarias**, catálogo y build pasan.
- `npm run test:emulators`: **14 pruebas pasan**, incluyendo el worker con transporte OpenAI simulado: admisión, cuota y lease concurrentes, contenido con fuentes, propuesta de imagen separada, original intacto y rechazo previo por falta de clave/indicadores.
- `npm run test:admin`: **5 pruebas pasan** en Chrome, con flujo a 320, 390 y 1280 px, recuperación, errores, permisos, inventario y QR compartido por ficha. IA apagada en la UI de pruebas.
- `npm run test:e2e`: **7 pruebas del catálogo pasan**. Las pruebas unitarias/E2E fuerzan datos estáticos aunque el checkout tenga configurados emuladores.
- Los tests usan `demo-rinconcito-verde-tests`, puertos separados y una copia temporal del backend sin configuración privada. No modifican la sesión interactiva de emuladores.
- El bundle de navegador no contiene variables de clave ni el transporte OpenAI. No se añadieron dependencias; se mantienen los avisos documentados arriba.

Pendiente: prueba con la clave/modelos que Bryan configure privadamente, disponibilidad real de modelos, calidad de identificación/fuentes/imágenes y consumo facturado. Los mocks verifican el flujo, no la calidad ni el coste del servicio real. No se hizo despliegue, push ni activación de facturación.

## Corrección de subida local de fotografías

El 500 observado en la sesión interactiva procedía de `ENOENT` al escribir en la carpeta temporal `firebase/storage/blobs`. El CLI comparte esa ubicación entre instancias y la elimina al cerrar Storage; el aislamiento anterior por proyecto/puertos era insuficiente. Se restauró solo la carpeta ausente, sin detener emuladores ni borrar registros. Una subida real al puerto interactivo 19199 y su descarga dieron bytes idénticos; el objeto ya existente también se pudo leer.

El ejecutor de pruebas ahora asigna `TMPDIR`, `TMP` y `TEMP` exclusivos antes de arrancar Firebase. El editor cancela la subida a los 30 segundos, comunica errores de conexión/permisos y vacía el selector para permitir reintentar la misma foto sin perder el borrador. Las reglas y permisos no se relajaron. No se leyeron archivos privados ni se llamó a OpenAI.

Verificación de esta corrección: `npm run check` pasa en el checkout (lint, tipos, **51 unitarias** y build); **14 pruebas de backend/reglas** y **6 E2E administrativas** pasan. La nueva prueba fuerza HTTP 500 durante 30 segundos, comprueba el mensaje de error y el borrador intacto, y vuelve a subir la misma foto con éxito. Una foto de control en Storage interactivo permaneció idéntica después de cerrar ambas suites aisladas. También se subió una foto desde la UI interactiva en 5175 a 390 px, con vista previa, texto conservado y cero errores JavaScript; no se guardó ni publicó ninguna ficha. Se eliminaron solo las dos fotos de diagnóstico. Los procesos interactivos se conservaron sin reinicios.

## Requisitos visibles de los botones IA

Los botones de IA no leen variables del backend: requieren fotografía original, una revisión guardada y ningún cambio pendiente; el contenido con fuentes requiere además una identificación confirmada. Se agregó una explicación del paso pendiente y la acción «Guardar borrador para usar IA» junto al panel, sin ejecutar IA ni publicar al guardar. Se impiden solicitudes mientras se sube una foto o la ficha está archivada. Las variables privadas y el backend no se modificaron.

Verificación: `npm run check` pasa (lint, tipos, 51 unitarias y build) y las 7 pruebas E2E administrativas pasan a 320/390/1280 px. La nueva prueba confirma bloqueo antes de guardar, habilitación posterior, requisito de identificación para contenido, nuevo bloqueo al editar y cero solicitudes IA durante los guardados. No se ejecutaron llamadas pagas ni se reiniciaron los emuladores interactivos.

## Recarga del backend local de IA

Se encontró que el emulador interactivo ejecutaba `functions/lib/index.js` anterior a la opción local (bloqueo incondicional por `emulator`), mientras `functions/src` ya contenía la implementación actualizada. Se comprobó que no hubiera trabajos IA pendientes, se ejecutó `npm run build:backend` y el observador recargó Functions sin detener Auth/Firestore/Storage. Una solicitud intencionadamente inválida pasó las comprobaciones de activación/configuración y fue rechazada por el esquema antes de cuota o creación de trabajo; la colección de trabajos permaneció vacía. No se leyeron archivos privados ni se hicieron llamadas a OpenAI. La generación real y la disponibilidad de modelos siguen sin comprobarse por el agente.

## Diagnóstico de propuestas fallidas

Se inspeccionaron cuatro trabajos fallidos de la sesión interactiva, con un intento cada uno. La foto PNG de 3.023.247 bytes se pudo leer tanto por REST local como mediante el mismo SDK Admin del worker; el acceso administrativo estaba activo. Los errores anteriores habían sido sustituidos por un mensaje genérico, por lo que no permiten atribuir retrospectivamente el fallo a credenciales, acceso, parámetros o respuesta del proveedor.

El backend ahora conserva una clasificación segura del fallo y muestra un mensaje específico, sin almacenar respuestas crudas ni secretos. Diferencia errores del proveedor, red, formato/fuentes, fotografía y persistencia; el agotamiento de saldo/cuota no se reintenta. No se reinician trabajos fallidos ni se restablecen contadores. Los modelos comunicados por el usuario figuran en documentación oficial, pero no se verificó acceso de su cuenta ni se hicieron llamadas reales por parte del agente.

Verificación: lint, tipos y build pasan; **61 pruebas unitarias** y **15 de backend/reglas** pasan. Los mocks cubren 401, 403, modelo no disponible, parámetros incompatibles, cuota insuficiente sin reintento, fallos temporales, red y respuesta inválida. Se comprobó que datos privados simulados no aparezcan en el diagnóstico y que un trabajo fallido no vuelva a llamar al proveedor.

El siguiente intento manual del usuario produjo un diagnóstico verificable: `provider_auth`, etapa `provider`, HTTP 401 y código OpenAI `invalid_api_key`. No fue una generación iniciada por el agente. El contador local llegó a cinco solicitudes el 12 de noviembre de 2026 (día UTC); el cupo diario cambia a las 18:00 de Costa Rica. No se modificaron trabajos ni contadores. Queda pendiente que el usuario corrija privadamente la credencial y valide el proveedor con su propia cuenta.

## Retiro autorizado del cupo diario local

Bryan solicitó quitar el límite diario que bloqueaba sus pruebas. La admisión en los emuladores demo autorizados ya no impone topes por usuario/proyecto; en esa etapa producción conservaba 5/30 solicitudes diarias. El 13 de noviembre de 2026 el propietario autorizó aumentarlas a 50 por usuario y 200 por proyecto; ver `DEPLOY-ONLINE.md`. Los contadores siguen aumentando de manera idempotente y no se borran trabajos, datos ni historial. Se mantienen los límites del proveedor, los tres intentos por trabajo y las restricciones de tamaño/salida.

La extracción limitada de configuración no secreta confirmó `OPENAI_TEXT_MODEL=gpt-6.1-terra` y `OPENAI_IMAGE_MODEL=gpt-image-2.6-sunburst` en el backend local. El mensaje de modelo faltante ahora identifica la variable correspondiente a la acción y se rechazan valores vacíos o de solo espacios. No se extrajeron ni mostraron valores de claves.

Verificación: lint, tipos, build, **62 pruebas unitarias** y **17 de backend/reglas** pasan. Se comprobó admisión local con usuario en 5 y proyecto en 30, avance a 6/31 con recibo duplicado sin doble conteo ni doble generación, límites productivos conservados y errores específicos para cada modelo ausente sin crear trabajos ni consumir cuota. Todas las generaciones automatizadas usaron mocks.

Tras compilar y recargar Functions se verificaron identificación, contenido y mejora con una ficha inexistente: las tres acciones pasaron la comprobación de configuración y se rechazaron por revisión inexistente antes de crear trabajos o contar solicitudes. También se observó una propuesta de mejora de fotografía ya lista, originada por la sesión del usuario. No se inició ninguna generación real para esta verificación ni se reiniciaron los emuladores de datos.
