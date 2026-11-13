# Despliegue completo: catálogo, administración e IA

Destino fijo: https://rinconcito-verde-cr.web.app y https://rinconcito-verde-cr.web.app/admin, proyecto `rinconcito-verde-cr`, Functions de segunda generación en `us-central1`.

Tras completar la preparación inicial, el comando que despliega y abre la prueba real es:

```bash
npm run release:online
```

Incluye QR con marca, fotografía con identidad, detalle ampliado, paginación y miniaturas, ruta `/admin`, acceso desde el catálogo para administradores conectados, backend e IA real. Una compilación correcta no significa que el sitio ya esté publicado.

## Estado de la preparación — 13 de noviembre de 2026

El propietario autorizó el despliegue completo, las pruebas reales de IA y la vinculación de facturación. Después del error inicial `429`, confirmó `billingEnabled: True` desde su Mac. También ejecutó el pull y `configure:online`: la app web quedó registrada y `.env.production.local` guardado. No se repiten estos pasos ni se crean apps adicionales.

**La publicación de Functions/Hosting y las pruebas reales siguen pendientes.** El propietario confirmó en su Mac: APIs Firestore/App Check habilitadas; base `(default)` creada en `us-central1`, edición Standard y modo Native; bucket `rinconcito-verde-cr.firebasestorage.app` creado; dos cuentas administrativas creadas en Authentication; versión 1 de `OPENAI_API_KEY` creada en Secret Manager. También reportó configurados los modelos y la clave pública de App Check. Después confirmó que la app está registrada con **reCAPTCHA Enterprise**, mientras el cliente y la comprobación anteriores esperaban v3; esa diferencia detenía la preparación.

Después de sincronizar Enterprise, el propietario completó el bloque de CORS, migración de catálogo, asignación de roles y publicación de reglas Firestore. La lectura HTTPS anónima confirmó las cuatro plantas y tres categorías con sus IDs originales. También ejecutó la activación de APIs de Functions y el primer `release:online`: pasó las comprobaciones productivas iniciales, pero se detuvo en una prueba de configuración antes de publicar Functions, Storage o Hosting. La prueba heredaba variables Vite del despliegue que prevalecían sobre su archivo temporal. Se reprodujo el fallo con valores ficticios y se aisló ese entorno de prueba; se conservan las comprobaciones reales y la configuración productiva. En el intento siguiente, las pruebas y compilaciones avanzaron y se completó la etapa de reglas/índices antes de preparar Functions. Firebase rechazó la variable reservada `FUNCTION_REGION` del archivo temporal; el worker, admin y Hosting todavía no se publicaron en ese intento. La configuración generada ahora contiene solo las opciones IA y modelos; ambas funciones declaran `us-central1` directamente en código. El parser real de la versión instalada de Firebase CLI valida el archivo en las pruebas, sin llamadas remotas. También se inspeccionaron las definiciones compiladas de ambas funciones con un proyecto demo: mantienen `us-central1` aunque el proceso herede otra `FUNCTION_REGION`, sin invocar los handlers. [Variables reservadas](https://firebase.google.com/docs/functions/config-env#reserved_environment_variables).

No hay un presupuesto mensual configurado ni se supone un límite monetario concreto.

La copia cloud continúa sin sesión Firebase/gcloud y sin acceso a la Mac. Los cambios de producción anteriores los ejecutó el propietario en su terminal. La configuración de los emuladores se conserva. El CLI de la Mac no reconoce `appcheck:apps:list`; ahora se usa la API REST oficial y `npm run check:appcheck`. Las peticiones REST incluyen `X-Goog-User-Project: rinconcito-verde-cr` para evitar usar el proyecto compartido del cliente OAuth de gcloud como proyecto de cuota. [Comportamiento documentado de gcloud](https://cloud.google.com/sdk/gcloud/reference/auth/print-access-token).

## Preparación inicial

### 1. Herramientas, sesión y facturación

Usar Node compatible (22.22.2+ o 24.15+), Google Cloud CLI y las dependencias fijadas en los lockfiles:

```bash
npm ci
npm --prefix functions ci
npx firebase login
gcloud auth login
gcloud billing projects describe rinconcito-verde-cr --format='value(billingEnabled)'
```

Las sesiones deben tener permisos sobre este proyecto. Functions requiere Blaze. Si la consulta devuelve `False`, un operador debe vincular únicamente la cuenta autorizada con `gcloud billing projects link`; la cuenta concreta se mantiene fuera de Git. El script de despliegue solo verifica el estado, nunca cambia la cuenta vinculada. [Requisito de Functions](https://firebase.google.com/docs/functions/get-started) y [comando de vinculación](https://cloud.google.com/sdk/gcloud/reference/billing/projects/link).

Si Cloud Billing responde `429 RATE_LIMIT_EXCEEDED`, no repetir el comando en un bucle. El límite indicado es de solicitudes por minuto. Se puede completar la vinculación autorizada desde Firebase Console → actualizar plan → Blaze y verificar después `billingEnabled`. Si también falla la consola, esperar a que se restablezca la cuota y revisar el servicio; no es un error de la clave OpenAI. [Cambiar al plan Blaze](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

### 2. Registrar la app y guardar su configuración pública

```bash
npm run configure:online
```

Consulta las apps web del proyecto; si no hay ninguna, registra `Rinconcito Verde Web`. Reutiliza una app existente; si hay varias, se detiene para evitar elegir otra por error. Obtiene del CLI los valores públicos reales y escribe `.env.production.local`. Conserva una copia de un archivo anterior, mantiene App Check/modelos ya configurados y no modifica `.env.local` ni `functions/.env.local`. Si una creación devuelve un resultado incierto, consultar `npx firebase apps:list WEB --project rinconcito-verde-cr` antes de repetir.

Completar `OPENAI_TEXT_MODEL` y `OPENAI_IMAGE_MODEL` en un editor local. Para App Check Enterprise, el comando de la siguiente sección obtiene el proveedor y la clave pública del registro existente. Para v3, configurar `VITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-v3` y su `VITE_FIREBASE_APPCHECK_SITE_KEY` correspondiente. Las claves Firebase y App Check de este archivo son públicas. Los modelos son nombres, nunca claves. `.env.production.example` contiene los campos admitidos; el archivo real y sus respaldos permanecen ignorados por Git. No poner secretos en variables `VITE_*`.

### 3. Servicios y administradores

- **Authentication:** habilitar correo/contraseña y comprobar los dominios autorizados `rinconcito-verde-cr.web.app` y `rinconcito-verde-cr.firebaseapp.com`. Crear las dos cuentas reales confirmadas por el propietario usando contraseñas privadas. Para cada UID, provisionar el custom claim `role: "admin"` y el documento `adminUsers/UID` con `active: true` y `role: "admin"`. Ambas comprobaciones son obligatorias; tener una cuenta Auth por sí solo no concede acceso. La asignación se hace con `prepare:online admins` y la sesión Google autorizada del operador, nunca desde el navegador del comprador. No reutilizar cuentas ni contraseñas del seed local. Volver a iniciar sesión después de cambiar claims.
- **Firestore y Storage:** crear/verificar `(default)` y el bucket del proyecto. Configurar CORS para descargar imágenes autenticadas desde ambos dominios, conservando cualquier origen anterior necesario. [Descargas y CORS](https://firebase.google.com/docs/storage/web/download-files).
- **App Check:** usar el proveedor registrado para esta app y permitir ambos dominios públicos en su clave. Este proyecto usa Enterprise; el cliente utiliza `ReCaptchaEnterpriseProvider` con la misma clave pública registrada en Firebase. Se conserva compatibilidad con v3 mediante la variable de proveedor; si se omite, se mantiene v3 para configuraciones anteriores. Un valor desconocido se rechaza. La callable exige App Check. [Enterprise en la web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).
- **Datos iniciales:** migrar las cuatro fichas y categorías JSON mediante un procedimiento revisado, con respaldo y creación sin sobrescribir registros existentes. Mantener IDs, fotos públicas y URLs QR, especialmente `sansevieria`. Preparar las copias públicas `publicPlants`/`publicCategories` y editables `plants`/`categories`, además de sus reglas de lectura, antes de sustituir el frontend. No inventar stock ni trasladar movimientos ficticios. **No ejecutar `seed:emulators` contra producción.** La migración y roles tienen comandos de preparación separados descritos abajo. La creación inicial de servicios sigue siendo un requisito del primer despliegue.

### Comprobación compatible de App Check y activación de Firestore

```bash
npm run check:appcheck
```

La app está registrada con **Enterprise**. Para sincronizar una vez los dos valores públicos desde ese registro, sin copiarlos al chat:

```bash
npm run check:appcheck -- --configure-enterprise
npm run check:appcheck
```

El primer comando consulta únicamente `name` y `siteKey` de `recaptchaEnterpriseConfig.get` para el App ID y número de proyecto confirmados. Guarda `VITE_FIREBASE_APPCHECK_PROVIDER=recaptcha-enterprise` y la clave pública en `.env.production.local`, conservando modelos, valores Firebase y un respaldo privado del archivo anterior. No modifica el registro remoto, `.env.local` ni los emuladores. Si ya coincide, no reescribe ni crea otro respaldo. Los archivos y respaldos están ignorados por Git.

La comprobación normal y el preflight del despliegue seleccionan el recurso correspondiente al proveedor. Enterprise exige que la clave pública local coincida con Firebase; v3 verifica `siteSecretSet` y no puede comparar su clave pública mediante esta API. El token temporal de gcloud se mantiene en memoria, no se imprime ni escribe, y se rechazan redirecciones. El intercambio real de tokens y los dominios se verifican después desde el navegador online. [Recurso Enterprise](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.apps.recaptchaEnterpriseConfig) y [consulta v3](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.apps.recaptchaV3Config/get).

### CORS para las fotografías privadas

El admin descarga blobs autenticados para previsualizar y componer fotografías. Consultar la configuración antes de actualizarla:

```bash
gcloud storage buckets describe gs://rinconcito-verde-cr.firebasestorage.app --project=rinconcito-verde-cr --raw --format='json(cors)'
```

El propietario confirmó `null`. Para este estado, aplicar el archivo versionado:

```bash
gcloud storage buckets update gs://rinconcito-verde-cr.firebasestorage.app --project=rinconcito-verde-cr --cors-file=storage.cors.json
gcloud storage buckets describe gs://rinconcito-verde-cr.firebasestorage.app --project=rinconcito-verde-cr --raw --format='json(cors)'
```

`storage.cors.json` permite GET desde los dos dominios Hosting, sin comodines. No cambia IAM, reglas ni la privacidad de los objetos. En futuras instalaciones con reglas CORS existentes, combinar las entradas necesarias antes de actualizar: `--cors-file` sustituye esa configuración completa. El preflight bloquea el despliegue si alguno de los dos dominios carece de GET. [CORS en Storage](https://cloud.google.com/storage/docs/using-cors).

### APIs y base de datos iniciales

Si una API todavía está deshabilitada, activar solamente los servicios del proyecto confirmado:

```bash
gcloud services enable firestore.googleapis.com firebaseappcheck.googleapis.com --project=rinconcito-verde-cr
```

Si la operación termina correctamente pero la consulta inmediata aún devuelve `SERVICE_DISABLED`, esperar unos minutos y consultar el estado antes de repetir una activación:

```bash
gcloud services list --enabled --project=rinconcito-verde-cr --filter='config.name=firestore.googleapis.com OR config.name=firebaseappcheck.googleapis.com' --format='value(config.name)'
gcloud firestore databases list --project=rinconcito-verde-cr --format='table(name,locationId,type)'
```

Habilitar la API no crea una base. Solo después de confirmar que no existe `(default)`, crear Firestore Native en `us-central1`, junto a Functions:

```bash
gcloud firestore databases create --database='(default)' --location=us-central1 --type=firestore-native --project=rinconcito-verde-cr
```

Si ya existe, conservar su ubicación y datos; no eliminarla ni recrearla. La base nueva todavía necesita reglas, datos iniciales y administradores antes del despliegue completo.

Antes del primer preflight completo, habilitar las APIs del backend autorizado (el listado de Functions también las necesita):

```bash
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com eventarc.googleapis.com pubsub.googleapis.com --project=rinconcito-verde-cr
```

Si una consulta inmediata devuelve API deshabilitada, esperar su propagación y verificar el estado; no repetir activaciones en un bucle.

### Preparar datos y roles con la sesión autorizada de la Mac

`prepare:online` utiliza APIs oficiales de Firestore e Identity Platform con el token temporal de la sesión gcloud, sin leer archivos de credenciales ni imprimir/escribir el token. El destino está fijado a este proyecto. No consulta ni copia emuladores, no modifica contraseñas, no crea usuarios y no envía mensajes.

Consultar los planes sin escribir en Google Cloud:

```bash
npm run prepare:online -- catalog
npm run prepare:online -- admins --email='CORREO_AUTORIZADO_1' --email='CORREO_AUTORIZADO_2'
```

Sustituir los dos marcadores por los correos confirmados por el propietario. Para aplicar la preparación ya autorizada:

```bash
npm run prepare:online -- catalog --apply
npm run prepare:online -- admins --email='CORREO_AUTORIZADO_1' --email='CORREO_AUTORIZADO_2' --apply
npx firebase deploy --only firestore:rules --project rinconcito-verde-cr
```

La migración crea las cuatro fichas y tres categorías en sus colecciones privadas/públicas: catorce documentos en un único commit Firestore, todos con precondición `exists: false`. Conserva IDs, cuidados, fotos, galería y enlaces QR. Si un par privado/público ya existe, lo preserva; si solo existe una mitad, se detiene en vez de reconstruirla con datos antiguos. No crea existencias ni movimientos. Las imágenes se conservan en Hosting; no convierte originales locales en archivos de Storage. La publicación inicial de las reglas permite después comprobar el catálogo por lectura pública antes de sustituir Hosting.

La preparación de administradores exige que todas las cuentas existan, estén habilitadas y coincidan exactamente con los correos indicados. Conserva otros custom claims, añade `role: admin` y crea/actualiza únicamente `role`/`active` en `adminUsers/UID`, con precondición de versión. No reactiva automáticamente una cuenta ni un acceso revocados. Vuelve a leer claims/documento para confirmar el resultado. Cerrar y volver a iniciar sesión después de asignar el rol. [API de consulta administrativa](https://cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup) y [API de actualización](https://cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/update).

Los planes, respaldos de claims/listas de acceso e informes quedan en `.firebase/setup-online/<fecha-uuid>/result.json`, ignorados por Git y con permisos privados. No compartir el contenido del informe administrativo: contiene identificadores y permisos previos. Auth y Firestore no forman una transacción conjunta; si una etapa falla, se registra `incomplete`, se detiene la secuencia y se revisa qué quedó aplicado antes de reintentar. No hacer cambios simultáneos de claims con otro operador durante esta preparación.

### 4. OpenAI en Secret Manager

La facturación de OpenAI es independiente de Blaze. La cuenta API debe disponer de saldo y acceso a los modelos elegidos. Configurar el secreto desde el prompt interactivo del CLI, sin escribir la clave en el comando, chat, captura o Git:

```bash
npx firebase functions:secrets:set OPENAI_API_KEY --project rinconcito-verde-cr
```

La prueba completa exige dos modelos explícitos: texto con imágenes, Responses, formato estructurado y búsqueda web; imagen compatible con Images Edits. Los IDs documentados para este proyecto son `gpt-6.1-terra` y `gpt-image-2.6-sunburst`. Confirmar acceso en la cuenta antes de usarlos; el script no selecciona modelos automáticamente. [Modelo de texto](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [modelo de imagen](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst) y [secretos de Functions](https://firebase.google.com/docs/functions/config-env#secret_parameters).

El despliegue comprueba únicamente que la versión `latest` del secreto está habilitada; no lee ni imprime su contenido. `processAI` recibe la referencia a Secret Manager. No se copia la clave local de emuladores a producción.

## Actualizar, comprobar y desplegar

Desde el checkout de la Mac:

```bash
cd /Users/bryanortiz/Documents/GitHub/rinconcito-verde-v1
git status --short
git pull --ff-only origin main
npm run deploy:online -- --check
npm run release:online
```

Si el pull informa cambios locales, conservarlos primero con un commit o `git stash push --include-untracked`, revisar el respaldo y luego hacer el pull. No forzar ni resetear. Si el stash contiene parches que ya están en remoto, no aplicarlo de nuevo automáticamente; conservarlo hasta revisar los cambios exclusivos.

`--check` consulta requisitos y ejecuta las compilaciones, sin publicar ni generar IA. `release:online` vuelve a validar, despliega y abre Chrome para la prueba real. Para separar ambas fases:

```bash
npm run deploy:online
npm run verify:online
```

El despliegue automático:

1. Valida configuración cloud, proyecto, sesión, Blaze, app web, base de datos, bucket, App Check, modelos y metadatos del secreto.
2. Verifica que `adminCommand` y `processAI`, si existen, pertenecen a la región/generación/codebase esperadas. Detiene una migración implícita.
3. Ejecuta lint, tipos, pruebas, catálogo, frontend y compilación de Functions. Confirma por lectura pública que las fichas y categorías originales ya existen en Firestore.
4. Prepara una fuente temporal de Functions con código compilado y `AI_ENABLED=true`, `AI_EMULATOR_OPENAI=false` y los modelos explícitos. Excluye los archivos locales de configuración y secretos. La región está declarada en el código del backend; no se añade `FUNCTION_REGION` al archivo generado porque Firebase reserva ese nombre.
5. Publica reglas/índices, luego `processAI`, después `adminCommand` y finalmente Hosting. El procesador queda disponible antes de aceptar nuevas solicitudes IA. Firebase necesita `--force` para habilitar sin interacción la política de reintentos existente del worker; se limita exclusivamente a `functions:catalog:processAI`, con región/generación/codebase ya comprobadas. Las demás publicaciones no usan `--force`.
6. Compara el HTML servido en `/` y `/admin` con el build exacto. Guarda `.firebase/deploy-online-result.json` con commit, estado del checkout y etapas completadas; elimina únicamente su carpeta temporal.

El comando no inicia/detiene emuladores, asigna roles, envía mensajes ni migra datos. La CLI puede habilitar las APIs requeridas dentro del proyecto autorizado. El comando antiguo `npm run deploy -- --project rinconcito-verde-cr` publica solo Hosting y no sirve para esta entrega completa.

## Prueba real y evidencia

`verify:online` abre Chrome en una sesión aislada. Iniciar sesión manualmente en la ventana con una cuenta administradora; la contraseña se escribe solo en el sitio. El script no guarda perfiles, cookies ni tokens. Se puede indicar un Chrome instalado mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

La ejecución completa:

- Comprueba catálogo anónimo, Sansevieria, favoritos, detalle y tamaños móvil/escritorio.
- Comprueba login/rol, crea un borrador privado `QA online Sansevieria <fecha>` y sube la fotografía existente del repositorio.
- Envía **una solicitud real por tipo**: identificación, contenido con fuentes y mejora de fotografía. Espera las tres propuestas, comprueba cuidados/fuentes y que el texto del borrador no haya sido reemplazado.
- Compara el SHA-256 de la fotografía original descargada con el archivo inicial. Deja las propuestas sin aceptar y el borrador sin publicar; no realiza movimientos de inventario.
- Comprueba el botón «Administrar» en el catálogo, su desaparición al salir y el ancho móvil. Guarda `result.json`, IDs de trabajos y capturas en `.firebase/online-qa/<fecha>/` (ignorado por Git).

La prueba hace tres solicitudes de trabajo; los reintentos acotados del backend ante fallos temporales pueden implicar más llamadas al proveedor. Producción conserva los límites de cinco trabajos por usuario/día UTC y treinta por proyecto/día UTC. Repetir la prueba completa crea otro borrador y consume cuota. Si hay un fallo, revisar los trabajos ya aceptados antes de repetir; no se reenvía automáticamente la secuencia.

Para comprobar la segunda cuenta sin nuevos trabajos IA:

```bash
npm run verify:online -- --access-only
```

Para consultar instrucciones sin abrir Chrome ni generar contenido:

```bash
npm run verify:online -- --help
```

La calidad visual de la propuesta y exactitud botánica/fuentes requieren revisión humana. El informe no sustituye comprobar QR con teléfono/impresora, etiquetas, descargas de marca, WhatsApp y crédito Vision Mind. No se han obtenido todavía capturas ni resultados de este flujo real.

## Fallos, reversión y pruebas de preparación

Antes de publicar, un fallo detiene el proceso. Durante el despliegue pueden quedar etapas completadas: reglas, worker, admin y Hosting no forman una transacción global. El informe marca `incomplete` y registra las etapas confirmadas. Si falla el backend, no se publica Hosting; si falla la comparación HTTPS después de Hosting, la publicación podría haber terminado y requiere inspección. No repetir a ciegas.

`release:online` separa los informes: un despliegue correcto puede ir seguido de una prueba real fallida. Revisar ambos; no interpretar solo `status: deployed` como validación de IA.

El frontend puede revertirse a una release Hosting verificada. Functions/reglas requieren revisión independiente; revertir Hosting no revierte datos ni permisos. No resetear el checkout del usuario ni restaurar inventario desde JSON.

Validación de esta entrega: `npm run check` aprobado con **184 pruebas en 20 archivos**, lint, tipos frontend/backend y build. `npm run verify:online -- --help` también terminó correctamente, sin abrir navegador ni hacer solicitudes IA. El build mantiene un aviso por un chunk mayor de 500 kB. La corrección de aislamiento se comprueba ejecutando `npm run check` con variables públicas ficticias inyectadas mediante `productionEnvironment`, como hace el despliegue. Los casos de App Check cubren entorno vacío, cloud y emuladores; no requieren configuración real ni acceso remoto.

La preparación añade pruebas de migración completa, fotos adicionales, conservación de registros existentes, pares incompletos, concurrencia, acceso en ambos sistemas, cuentas ausentes/deshabilitadas, claims existentes y fallos parciales. `npm run prepare:online -- --help` también se ejecutó sin acceso a servicios.

La comprobación App Check cubre v3 y Enterprise, coincidencia de la clave pública, pertenencia a la app/proyecto, fallos HTTP/red y protección del token. Las pruebas del cliente verifican el proveedor inicializado antes de Auth y la ausencia de App Check en emuladores. Se comprueba también el respaldo/conservación de configuración y el bloqueo por CORS ausente.

Las pruebas unitarias de configuración/despliegue cubren registro o reutilización de app, respaldo de configuración, exclusión de secretos, modelos explícitos, Spark, secreto deshabilitado, conflictos de funciones, orden de publicación, fallos parciales, catálogo faltante y comparación HTTPS. Se complementan con pruebas de admin/rutas/galería/QR. La ejecución real permanece bloqueada por la preparación y sesión productivas pendientes.
