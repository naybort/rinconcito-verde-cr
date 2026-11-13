# Probar OpenAI real con Firebase local

Este modo permite usar el flujo IA desde `/admin` sin desplegar Firebase. Está **apagado por defecto**. El desarrollo y las pruebas de esta opción no usaron claves reales ni hicieron llamadas a OpenAI; la prueba real queda a cargo de Bryan tras su configuración local.

## Costes y separación de entornos

Firebase Emulator Suite con el proyecto `demo-rinconcito-verde` no requiere desplegar, crear un proyecto Google real ni activar Blaze/facturación. Los datos, usuarios, fotos y propuestas se guardan en los emuladores. Si falta un emulador, el backend rechaza la configuración: no cambia a un recurso productivo. [Documentación Firebase](https://firebase.google.com/docs/emulator-suite/connect_firestore#choose_a_firebase_project).

**Las llamadas reales a OpenAI sí pueden tener coste.** La API se factura por separado del uso de ChatGPT; esta integración no usa la cuota de conversaciones de tu suscripción. Revisá saldo, límites y [precios vigentes de API](https://developers.openai.com/api/docs/pricing) antes de activarla. Algunas suscripciones elegibles ofrecen [créditos de API](https://developers.openai.com/api/docs/guides/chatgpt-api-credits) que deben reclamarse/vincularse; no se supone que tu cuenta los tenga. No se fija un precio ni un modelo automático en este proyecto.

La foto y el nombre orientativo se envían a OpenAI al pulsar una acción IA. Usá fotografías de prueba que quieras procesar con ese servicio. Una propuesta no modifica inventario, precio ni contenido publicado.

## Preparación local

Desde el checkout del proyecto:

```bash
npm ci
npm --prefix functions ci
cp -n .env.example .env.local
cp -n functions/.env.example functions/.env.local
chmod 600 functions/.env.local
```

`cp -n` conserva archivos existentes. Si ya tenías configuración, revisala en tu editor local y ajustala; no la pegues en el chat, Git, Notion ni capturas. Los archivos privados no se leyeron ni se modificaron durante esta implementación.

La `.env.local` de la **raíz** contiene únicamente la configuración pública de Firebase Emulator Suite:

```dotenv
VITE_FIREBASE_MODE=emulator
VITE_FIREBASE_PROJECT_ID=demo-rinconcito-verde
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-rinconcito-verde.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=demo-rinconcito-verde.appspot.com
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_REGION=us-central1
```

Nunca pongas una clave OpenAI en ese archivo ni en una variable `VITE_`.

Abrí `functions/.env.local` en un editor local, por ejemplo:

```bash
nano functions/.env.local
```

Configurá estas variables **del backend**, sin imprimir su contenido ni poner la clave en un comando del historial:

| Variable | Valor que debes configurar |
| --- | --- |
| `AI_ENABLED` | `true` para habilitar IA |
| `AI_EMULATOR_OPENAI` | `true` para permitir explícitamente OpenAI real en emuladores |
| `OPENAI_LOCAL_API_KEY` | Tu clave API, escrita solo dentro del editor local |
| `OPENAI_TEXT_MODEL` | ID exacto de un modelo disponible en tu cuenta que admita imágenes y búsqueda web en Responses |
| `OPENAI_IMAGE_MODEL` | ID exacto de un modelo disponible en tu cuenta compatible con Images Edits; puede quedar vacío si no probarás mejoras de foto |

Consultá el [catálogo de modelos](https://developers.openai.com/api/docs/models), [búsqueda web](https://developers.openai.com/api/docs/guides/tools-web-search) y [edición de imagen](https://developers.openai.com/api/docs/guides/image-generation). Elegir un modelo inexistente o sin acceso hará fallar la propuesta; el borrador manual se conserva.

No uses `OPENAI_API_KEY` ni `firebase functions:secrets:set` para esta prueba local. El backend local lee exclusivamente `OPENAI_LOCAL_API_KEY`. El entorno productivo conserva `OPENAI_API_KEY` en Secret Manager y no utiliza la clave local. En emuladores no se vinculan secretos productivos.

`functions/.env.local` está excluido de Git mediante `.gitignore` y del paquete de Functions mediante `firebase.json`. Podés comprobar la exclusión sin mostrar valores:

```bash
git check-ignore functions/.env.local
```

## Arrancar y probar desde la interfaz

Terminal 1, desde el proyecto:

```bash
npm run emulators
```

Terminal 2:

```bash
npm run seed:emulators
npm run dev -- --host 127.0.0.1
```

Abrí `http://127.0.0.1:5173/admin`. Para los datos ficticios del seed: `admin@example.test` / `Local-test-123!`. No son usuarios productivos. El seed preserva fichas que ya existan dentro de esa sesión de emuladores.

1. Agregar planta → nombre orientativo → tomar/subir foto → **Guardar borrador**.
2. **Sugerir identificación**. Esperar a que el trabajo aparezca como propuesta lista. Revisar incertidumbre y confirmar/corregir la identificación en el campo humano.
3. **Proponer contenido con fuentes**. Revisar fuentes y campos. Aceptar la propuesta únicamente si es correcta; entonces se copia al borrador. Guardar antes de solicitar otro paso IA.
4. Opcional: **Proponer mejora de fotografía**. Comparar original y propuesta; conservar el original si cambió alguna hoja, flor, tamaño, daño o condición comercial. Elegir foto explícitamente y guardar.
5. Completar datos manuales → enviar a revisión → revisar → publicar. En este entorno, publicar actualiza **solo el catálogo emulado**; el Hosting real no cambia.

La IA no inventa cantidades ni precio. El stock se registra en Inventario mediante movimientos. Una propuesta de una revisión anterior no puede sobrescribir la edición actual. Las etiquetas siguen usando el dominio público estable: una ficha creada solo en emuladores no existe aún en ese sitio público.

Para apagar: cambiar `AI_ENABLED=false` y `AI_EMULATOR_OPENAI=false`, detener con Ctrl+C y reiniciar los emuladores. El cambio exige reinicio; no puede cancelar una petición ya enviada al proveedor. El ingreso manual continúa disponible. El arranque normal de emuladores sin import/export es efímero: al cerrarlo se pierden los datos emulados; no usarlo como inventario real. No borres ni reinicies otro entorno que use los mismos puertos.

## Comprobaciones y límites

El backend local exige `FUNCTIONS_EMULATOR=true`, proyecto `demo-rinconcito-verde` y su bucket (o el proyecto separado `demo-rinconcito-verde-tests` para las pruebas). Todos los servicios deben apuntar a `127.0.0.1` con puertos válidos y ambos hosts de Storage deben coincidir. Los valores habituales los suministra el CLI automáticamente:

- `FIRESTORE_EMULATOR_HOST=127.0.0.1:18080`
- `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:19099`
- `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:19199`
- `STORAGE_EMULATOR_HOST=http://127.0.0.1:19199`

No debes escribir esas variables internas en tus archivos de configuración ni cambiar las IP por una interfaz de red. Usar `npm run emulators` inicia todos los servicios necesarios. El navegador también exige localhost y uno de esos proyectos demo con su bucket correspondiente. Los puertos alternativos del navegador (`VITE_EMULATOR_AUTH_PORT`, `VITE_EMULATOR_FIRESTORE_PORT`, `VITE_EMULATOR_STORAGE_PORT`, `VITE_EMULATOR_FUNCTIONS_PORT`) se reservan para el ejecutor de pruebas; normalmente se dejan sin definir. Producción conserva App Check y Secret Manager; el indicador local no reduce esos controles.

Por solicitud de Bryan, los emuladores autorizados ya no bloquean por cantidad de trabajos diarios, ni por usuario ni por proyecto. Se conservan los contadores auditables, el lease, los recibos idempotentes y hasta tres intentos ante fallos temporales 429/5xx (la falta de saldo/cuota API no se reintenta). Producción mantiene cinco trabajos por usuario/día UTC y treinta por proyecto/día UTC. Los límites de texto, búsqueda e imagen siguen vigentes. Los emuladores son efímeros: reiniciarlos sin importar estado reinicia también sus contadores. Estos límites no son un presupuesto monetario; revisá límites/saldo en tu cuenta API. Los resultados inciertos por caída/red no se repiten automáticamente a ciegas.

Si los botones están grises, el bloqueo se debe a los requisitos de la ficha, no a las variables del backend: esperá la subida, escribí un nombre y pulsá **Guardar borrador para usar IA** dentro del panel. Guardar no publica ni genera contenido. Cualquier edición posterior exige volver a guardar. Para **Proponer contenido con fuentes**, además completá **Identificación confirmada por una persona**. La interfaz muestra el paso pendiente; una ficha archivada requiere restauración.

Errores habituales:

- **IA desactivada:** faltan ambos indicadores con valor exacto `true`, o hace falta reiniciar.
- **Falta configurar la clave local:** el backend no encuentra `OPENAI_LOCAL_API_KEY`; no se intentó usar Secret Manager como alternativa.
- **Emulador ausente / proyecto incompatible:** revisar comando, puertos y configuración demo; no cambiar a un proyecto real para resolverlo.
- **Modelo pendiente:** el error indica `OPENAI_TEXT_MODEL` para identificación/contenido u `OPENAI_IMAGE_MODEL` para mejora de foto. Comprobá esa variable no secreta en el backend y ejecutá `npm run build:backend` para recargar Functions.
- **Propuesta fallida:** revisar el diagnóstico de acceso al modelo, saldo API, conexión o fuentes. El código evita mostrar claves o respuestas crudas del proveedor.
- **Límite diario:** solo se aplica en producción. Si aparece con los emuladores autorizados, compilá el backend actualizado con `npm run build:backend`; no borres datos ni contadores.

Verificaciones realizadas con mocks: activación doble, bloqueo por host/proyecto/bucket incorrectos, ausencia de clave, separación de secreto productivo, solicitud y cuota idempotentes, lease concurrente, propuesta de identificación/contenido/foto, original conservado y ausencia de publicación automática. La validación con una clave real, modelos de tu cuenta, respuesta real de fuentes, calidad de imagen y consumo facturado permanece pendiente.

## Pruebas automatizadas sin coste de OpenAI

```bash
npm run check
npm run test:emulators
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:admin
```

`test:emulators` y `test:admin` construyen el backend y copian **solo** su código compilado y package.json a una carpeta temporal, con IA apagada y sin claves. No cargan ni copian `functions/.env.local` del checkout. Ejecutan el proyecto `demo-rinconcito-verde-tests` en puertos separados (Auth 29099, Firestore 28080, Storage 29199, Functions 25001, hub 24400). Al terminar eliminan esa carpeta temporal. Pueden convivir con los emuladores interactivos; las dos suites de pruebas deben ejecutarse una después de la otra. Si un puerto de prueba está ocupado, fallan sin detener el proceso ajeno.

La prueba específica del worker activa la opción **solo dentro del proceso de prueba**, usa un valor ficticio y sustituye el transporte OpenAI por mocks. La UI continúa con IA apagada y verifica el error recuperable. No se ejecutó ninguna validación con OpenAI real.

## Si una fotografía queda esperando o Storage devuelve 500

El editor cancela una subida que exceda 30 segundos, conserva el texto del borrador y permite volver a seleccionar la misma foto. Un error de permisos se muestra sin esperar ese plazo. No se acepta la foto en la ficha hasta confirmar la subida.

Si el log muestra `ENOENT` en `firebase/storage/blobs`, falta la carpeta temporal usada por Storage. Firebase CLI 15.36.0 la comparte entre procesos que usan el mismo directorio temporal del sistema, aunque sus proyectos y puertos sean distintos; cerrar otra instancia puede borrarla. Las suites de este repositorio ahora usan su propio directorio temporal para evitar esa colisión. No basta con cambiar puertos.

No reinicies ni borres los emuladores que contienen tus datos para diagnosticarlo. Se puede restaurar únicamente la carpeta ausente indicada por el log y volver a probar, sin reiniciar. Restaurar la carpeta permite nuevas subidas, pero no reconstruye archivos anteriores que hubieran sido eliminados. Otras instancias de Firebase CLI iniciadas manualmente también deben usar un `TMPDIR` distinto si van a convivir; no modifiques variables globales de la máquina.

## Cambios del backend con emuladores ya abiertos

Vite actualiza el frontend, pero Functions ejecuta `functions/lib`, generado desde TypeScript. Si el código fuente cambió mientras el emulador seguía abierto, compilá desde la raíz:

```bash
npm run build:backend
```

El observador de Functions recarga el código compilado sin reiniciar Auth, Firestore ni Storage. Esperá la confirmación `Loaded functions definitions from source` antes de reintentar. No es necesario volver a ejecutar el seed. Una versión compilada anterior a la opción local rechazaba siempre IA en emuladores, aunque las variables estuvieran configuradas.

Esta recarga no valida por sí sola el modelo ni el servicio OpenAI. Si hay trabajos IA pendientes y la opción está habilitada, revisá su estado antes de recargar para evitar procesamiento inesperado; no uses una generación paga como comprobación de arranque.

## Diagnóstico seguro de trabajos fallidos

Los nuevos fallos guardan un mensaje específico, `errorCode`, `errorStage` y metadatos limitados (`httpStatus`, un código y un parámetro del proveedor solo si figuran en una lista permitida). El log contiene únicamente esos datos y el ID del trabajo; nunca claves, cabeceras, mensajes crudos, fotografías o prompts. Las fichas fallidas anteriores al cambio conservan el mensaje genérico, porque la causa original no quedó registrada.

- `provider_auth` / `provider_permission`: revisar autenticación o permisos/acceso al modelo en la cuenta API.
- `provider_model` / `provider_request`: revisar el ID del modelo y la compatibilidad de los parámetros indicados.
- `provider_quota`: revisar saldo y límites API; no se reintenta automáticamente.
- `provider_network`: el resultado es incierto; no se repite automáticamente una petición posiblemente procesada.
- `response_invalid` / `sources_unverified`: hubo una respuesta, pero no se acepta como propuesta válida.
- `photo_unavailable` / `catalog_unavailable` / `result_storage`: fallo local al leer la foto, consultar el catálogo o guardar el resultado.

Referencia de [errores API](https://developers.openai.com/api/docs/guides/error-codes). Los modelos informados para esta prueba, [gpt-6.1-terra](https://developers.openai.com/api/docs/models/gpt-6.1-terra) y [gpt-image-2.6-sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst), están documentados; eso no confirma acceso, saldo ni permisos de una cuenta concreta. No se cambian modelos ni se prueban claves automáticamente.

Cada nueva solicitud local conserva su registro en los contadores, sin un bloqueo diario de la aplicación. Las llamadas siguen pudiendo generar coste API y siguen sujetas a límites del proveedor. Los trabajos fallidos y los contadores se conservan. La lectura de un diagnóstico y la recompilación del backend no reintentan trabajos fallidos.

Los límites de producción usan días UTC y se renuevan a las **18:00 de Costa Rica**. Los emuladores ya no requieren esperar esa renovación. `provider_auth` con HTTP 401 / `invalid_api_key` corresponde al rechazo de la credencial por OpenAI, independiente del cupo de la aplicación. Corregí `OPENAI_LOCAL_API_KEY` únicamente en el editor privado del backend y ejecutá `npm run build:backend` para recargar Functions; conservá la sesión de los demás emuladores.


## Respuesta de contenido rechazada por formato

El aviso `response_invalid` de los trabajos antiguos no permite reconstruir el campo que falló: esos trabajos guardaban un diagnóstico genérico y no conservan la respuesta cruda. No debe interpretarse como un fallo de clave, saldo ni cupo local.

Identificación y contenido ahora solicitan `text.format` con un esquema JSON estricto. El parser separa los mensajes de progreso (`commentary`) de la respuesta final (`final_answer`); con proveedores sin fase usa el último mensaje, sin concatenar mensajes anteriores. Los metadatos de razonamiento y herramientas no se confunden con la propuesta. Se mantienen la validación local de tamaño/tipos, categorías y URLs verificadas en la búsqueda, fecha de consulta y revisión humana. No se aceptan campos de stock, precio ni publicación.

Los errores nuevos distinguen respuesta incompleta (`response_incomplete`), sin contenido (`response_empty`), rechazo (`response_refused`) y JSON/esquema inválido (`response_invalid`). `errorDetails` guarda solamente fase de validación, motivo de una lista cerrada, nombres de campos conocidos y conteos de tokens si existen. Nunca guarda mensajes, valores desconocidos, respuesta cruda ni claves. Estos casos no se reintentan automáticamente ni se reparan haciendo una segunda llamada paga.

La corrección no cambia modelos, `max_output_tokens` (3000), límites productivos ni configuración privada. Si el proveedor informa `max_output_tokens`, el nuevo diagnóstico lo distingue; cualquier ajuste de presupuesto se evalúa después con ese dato. No se supone que un error antiguo tuviera esa causa.

Para continuar: guardá el borrador (la captura mostraba cambios sin guardar), recargá el administrador local y solicitá contenido una sola vez cuando quieras probarlo. El aviso del intento anterior permanece en el historial; no se vuelve a ejecutar solo. No hace falta reiniciar emuladores ni volver a cargar datos. La siguiente generación real puede tener coste; las comprobaciones del código usan exclusivamente mocks.

Referencias: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [fase de los mensajes y respuestas incompletas](https://developers.openai.com/api/docs/guides/reasoning#phase-parameter).
