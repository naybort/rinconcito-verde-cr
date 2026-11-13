# Alta asistida: instrucciones y siete pasos

El administrador conserva el flujo manual y las siete actividades del plan de etapa 2. No es necesario completar cada paso ni usar IA para avanzar:

1. **Foto y nombre:** original privado, nombre orientativo y descripción accesible de la foto.
2. **Manual o IA:** acceso directo al ingreso manual o a la identificación asistida. Elegir una opción no hace una llamada IA. El modo manual oculta el panel de generación; «Mostrar asistencia IA opcional» permite abrirlo cuando se necesita.
3. **Identificación:** confirmar/corregir el nombre manualmente o revisar una sugerencia con su incertidumbre.
4. **Contenido y cuidados:** descripción, categorías existentes, plantillas, cuidados, advertencias y fuentes; propuesta IA opcional.
5. **Mejora de imagen:** original o propuesta separada, comparación y elección humana explícita.
6. **Inventario:** movimientos auditables y presentación de esta ficha. Cantidades, precio y ubicación los introduce una persona. Se guardan por separado del contenido.
7. **Revisión y publicación:** campos faltantes, notas privadas, vista previa, envío a revisión y publicación explícita por un administrador. Luego se accede a etiquetas con QR compartido por ficha.

Para publicar, seguí este orden: **Guardar borrador → Enviar a revisión → marcar la casilla de revisión → Publicar ficha**. Tener todos los campos completos no cambia el estado editorial. El paso 7 explica el requisito pendiente y la casilla solo se habilita en revisión, con los datos guardados y completos. Una fotografía en subida también bloquea estas acciones hasta que termine y se guarde.

En móvil se elige el paso con «Ir al paso»; en escritorio hay navegación numerada. «Anterior», «Siguiente» y «Guardar borrador» están disponibles durante la edición. «Continuar borrador» permite volver desde otras secciones.

## Instrucciones opcionales

Identificación, contenido/cuidados y mejora de fotografía tienen campos independientes de hasta **2000 caracteres**. Identificación y contenido se guardan en `plants.ai.instructions.{identify,content}` junto con `ai.confirmedName`. La mejora guarda `enhanceInstructions` en cada fotografía (en la portada, en la raíz de la ficha). Las preferencias anteriores de `ai.instructions.enhance` se conservan para la portada al abrir un borrador antiguo. Vacío conserva las indicaciones base; no cambia modelos ni activa IA.

Después de escribir instrucciones, guardá el borrador y pulsá el botón de generación correspondiente. Guardar nunca genera ni publica. La solicitud validada contiene `additionalInstructions`; el trabajo `aiJobs` conserva una copia inmutable y su revisión, original, autor y fecha. El resultado muestra qué instrucciones utilizó.

Las preferencias autenticadas se separan del nombre, texto de fotos y fuentes externas, que se tratan como datos no confiables. Las reglas fijas de generación siguen prevaleciendo. No se envían claves en el prompt. Nunca escribas secretos en campos del administrador.

El backend valida tipo y longitud antes de crear el trabajo, y vuelve a validar al preparar el proveedor. Las respuestas siguen sujetas a esquemas estrictos, categorías permitidas, fuentes presentes en los resultados de búsqueda y fecha de consulta. Las instrucciones no habilitan publicación, cambios de stock/precio ni herramientas para acceder a configuración. Una imagen generada puede alterar detalles: la comparación humana sigue siendo necesaria.

## Recuperación y resultados

La copia local por usuario conserva durante siete días el paso, instrucciones, identificación, contenido incompleto y formulario de inventario de la ficha. Al recargar aparece «Recuperar borrador». Los borradores anteriores sin estos campos siguen siendo compatibles. Guardar sincroniza las preferencias con Firestore; la posición y el inventario aún no registrado quedan en el navegador. Cerrar sesión elimina la copia local, como antes.

Un trabajo en cola o en curso muestra progreso y deshabilita otra solicitud del mismo tipo. Se puede seguir editando. Ninguna respuesta se aplica automáticamente: para aceptar identificación o contenido debe estar lista, corresponder a la revisión y original actuales y no haber cambios sin guardar. La mejora de imagen se vincula a su foto: debe conservar el mismo original, instrucciones y elección de imagen que tenía al solicitarla; editar otra foto o reordenar la galería no invalida esa propuesta. Una respuesta antigua permanece consultable sin reemplazar ediciones humanas. Los errores conservan el borrador y las instrucciones.

## Desarrollo y comprobación

- `npm run check`: lint, tipos frontend/backend, pruebas unitarias y build.
- `npm run test:emulators`: reglas, autorización, transacciones, idempotencia y proveedor simulado; verifica los tres tipos de instrucciones de solicitud a trabajo y prompt.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:admin`: flujo responsive, recuperación, errores de subida/guardado, revisión/publicación, inventario/QR y propuestas simuladas.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e`: regresión del catálogo público.

Las suites de emuladores usan proyecto `demo-rinconcito-verde-tests`, puertos de test (Firestore 28080, Auth 29099, Storage 29199 y Functions 25001), directorio temporal propio y configuración sin claves. Ejecutarlas secuencialmente entre sí. No utilizan ni reinician los emuladores interactivos. Las pruebas no llaman a OpenAI real.

Los límites diarios locales siguen desactivados; se conservan idempotencia, límites de tamaño/tiempo e intentos y controles productivos. Ver [LOCAL-AI.md](LOCAL-AI.md) para configuración local opt-in. No se necesita deploy para revisar estos cambios.

## Resultado verificado — 13 de noviembre de 2026

- Lint y tipos web/Functions: pasan. Build del catálogo (4 plantas, 3 categorías): pasa.
- 79 pruebas unitarias; 22 de reglas/backend/emuladores; 13 E2E del administrador; 7 E2E del catálogo.
- Administrador a 320, 390 y 1280 px; catálogo también a 768 px. Recuperación de instrucciones, identidad, paso y movimiento pendiente, modo manual, errores HTTP 500/red/proveedor, doble clic, permisos, propuestas tardías y QR compartido comprobados.
- Las tres generaciones transmiten sus instrucciones hasta el proveedor simulado. La validación con OpenAI real de estas nuevas preferencias queda pendiente y no se hizo ninguna llamada paga.
- No se cambiaron dependencias. Permanece el aviso de Vite por chunks mayores a 500 kB; en la comprobación final del checkout local, el mayor módulo diferido fue de ~613 kB sin comprimir. No impide compilar. No se modificaron configuración de IA, secretos, facturación ni producción.

Capturas con datos sintéticos: [móvil](qa/workflow-mobile.png), [escritorio](qa/workflow-desktop.png).

Para revisar en la sesión local existente: recargá el administrador, recuperá el borrador si aparece el aviso, elegí un paso y escribí instrucciones. Guardalas antes de solicitar una generación. No reinicies ni vuelvas a sembrar los emuladores: el código de Functions se recompila y se recarga conservando los datos. No se migra ni borra ninguna ficha existente.

## Nombres, cuidados base y varias fotografías

- **Identificación:** las nuevas propuestas muestran `scientificName` y `commonName` por separado. «Usar nombre común/científico en la ficha» cambia el título únicamente después de tu elección. Para consultar cuidados se conserva la identificación científica, cuando existe; podés corregirla manualmente. Los trabajos anteriores con un solo nombre siguen siendo legibles. Los resultados ya guardados no se regeneran solos.
- **Cuidados:** el prompt pide una o dos frases prácticas por campo y evita listas extensas de variaciones. Las diferencias habituales de clima o cultivar no justifican dejar el cuidado vacío. Se conserva la búsqueda/verificación de fuentes y solo se deja un campo pendiente cuando no hay una recomendación fiable aplicable. La incertidumbre importante va en una nota breve. Aceptar contenido conserva el nombre elegido por la persona.
- **Fotos:** en el paso 1, «Tomar o subir fotografía» ingresa/reemplaza la portada y «Agregar varias fotografías» admite una selección múltiple. La primera imagen es la portada; «Usar foto N como portada» la mueve al inicio. Podés ordenar las adicionales y quitar referencias de la ficha sin borrar los originales privados. Máximo diez imágenes por ficha, JPEG/PNG/WebP de hasta 10 MB cada una.
- Las fotos terminadas se agregan al borrador mientras se suben las siguientes. Si una falla, se conserva lo ya subido y se indica reintentar únicamente las pendientes. Las referencias, orden y descripciones se recuperan con el borrador local; guardar las sincroniza con Firestore.
- La mejora de imagen es opcional para cada foto. Cambiar la portada u ordenar la galería mantiene cada propuesta e instrucción asociadas a su original, sin alterar las demás fotos.
- **Publicación:** valida todas las imágenes antes de copiar alguna. El documento público incluye `image` (portada, compatible con el catálogo anterior) e `images` (galería ordenada). Solo se publican URLs de las copias aprobadas y descripciones, nunca las referencias originales. El catálogo muestra la portada y el detalle permite recorrer las imágenes mediante miniaturas, botones y flechas del teclado. La URL/QR de la ficha no cambia.
- Las fichas de una sola imagen y los borradores anteriores siguen funcionando. La foto demo de detalle se conserva como imagen adicional cuando se edita una ficha antigua.

La verificación usa exclusivamente imágenes de prueba y respuestas IA simuladas; no evalúa la calidad de una nueva respuesta real de OpenAI ni realiza llamadas pagas.

Verificación adicional: subida múltiple con fallo parcial y recuperación, cambio de portada, orden persistido, publicación/descarga anónima de las copias, originales privados, rechazo de referencias ajenas y de imágenes inválidas, conservación del título elegido y navegación de galería con teclado. Capturas con datos sintéticos: [galería móvil](qa/gallery-mobile.png), [administrador de fotos](qa/gallery-desktop.png), [nombres en móvil](qa/identification-names.png).

## Corrección IA opcional por fotografía

En el paso 1, «Revisar mejora IA de foto N» abre esa imagen en el paso 5. También podés elegirla con «Fotografía para mejorar». Cada imagen muestra si se usará su original o una propuesta revisada, y conserva sus instrucciones opcionales. Abrir el paso, cambiar de foto o guardar no genera IA.

1. Seleccioná una foto, escribí instrucciones si las necesitás y guardá el borrador.
2. Pulsá «Proponer mejora de fotografía» solo para esa imagen. El progreso y los errores corresponden a esa foto; las otras siguen disponibles.
3. Compará el original y la propuesta. «Verifiqué los detalles reales y elijo esta foto» la incorpora únicamente al borrador de esa imagen. «Volver a elegir el original» deshace la elección sin borrar ninguna imagen ni generar otra.
4. Guardá, enviá a revisión y publicá. El catálogo puede combinar originales y propuestas, cada una elegida por una persona.

La referencia inmutable del original es el `photoId` estable de la imagen. No se usa su posición: moverla, cambiar portada o quitar otras imágenes no redirige trabajos. `aiJobs` conserva `photoId`, `originalPath`, `baseApprovedImagePath` e instrucciones; el backend verifica que la foto existe antes de admitir y procesar la solicitud. Si se retiró antes de procesar, falla sin llamar al proveedor. Si se retiró durante una generación, el resultado no se aplica a otra foto.

Al guardar o publicar, el backend comprueba que cada propuesta elegida pertenece a un trabajo terminado de esa misma foto y ficha. Una respuesta no reemplaza una nueva elección o instrucciones cambiadas. Los trabajos antiguos de portada siguen visibles con la validación de versión anterior. La recuperación local conserva la selección de foto, instrucciones y elección de original/propuesta; no se pierden al recargar ni al fallar una solicitud. Las imágenes demo estáticas necesitan un original privado subido para solicitar una mejora.

Verificación sin consumo: pruebas de dominio y emuladores con proveedor simulado cubren identidad estable, límites de entradas, doble ejecución, origen correcto, foto retirada antes de procesar, rechazo de propuestas cruzadas y publicación con originales/propuestas mezclados. El flujo de interfaz prueba selección independiente, errores por foto, cambio de portada durante la espera, instrucciones, recuperación, vuelta al original y galería publicada en móvil y escritorio. No se cambian los límites productivos ni se hacen llamadas reales de OpenAI.
