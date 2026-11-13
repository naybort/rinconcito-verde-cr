# Despliegue completo: catálogo, administración e IA

Destino fijo: https://rinconcito-verde-cr.web.app y https://rinconcito-verde-cr.web.app/admin, proyecto `rinconcito-verde-cr`, Functions de segunda generación en `us-central1`.

Tras completar la preparación inicial, el comando que despliega y abre la prueba real es:

```bash
npm run release:online
```

Incluye QR con marca, fotografía con identidad, detalle ampliado, paginación y miniaturas, ruta `/admin`, acceso desde el catálogo para administradores conectados, backend e IA real. Una compilación correcta no significa que el sitio ya esté publicado.

## Estado de producción — 13 de noviembre de 2026

**El despliegue completo está publicado; la validación real de IA sigue pendiente.** El informe de la Mac confirma `status: deployed` para el commit `d3ae059b7e717a6cc8d033b2bb65817107412777`, con reglas, worker IA, backend, Hosting y comparación HTTPS completados. La lectura independiente de `/` y `/admin` devolvió HTTP 200 y el mismo HTML; el JavaScript publicado también respondió correctamente.

La primera prueba online confirmó catálogo/detalle/favoritos en móvil y escritorio e inicio de sesión con rol administrador. Se detuvo al subir la fotografía privada, antes de guardar el borrador o solicitar IA (`requests: []` en ese informe). La consulta IAM confirmó que faltaba `roles/firebaserules.firestoreServiceAgent` al agente de Storage. El propietario lo asignó y verificó sin condición. Después, el guardado devolvió 401: los registros muestran sesión válida y App Check ausente. El módulo Firebase publicado contiene una clave distinta de la única clave Enterprise del proyecto; el propietario pidió pausar temporalmente App Check. Quedan pendientes el nuevo despliegue, la prueba de guardado y las tres operaciones reales de IA. Los intentos manuales fuera de ese informe no están auditados aquí.

Blaze está activo. La app web, Enterprise, Firestore `(default)` en `us-central1`, el bucket, CORS, el catálogo inicial, las dos cuentas y sus roles, y el secreto OpenAI ya están preparados. El script fija proyecto y cuota gcloud a `rinconcito-verde-cr`; la consulta real con `--billing-project` devolvió `True`. No se cambian la configuración global de gcloud ni los emuladores. No hay un presupuesto mensual configurado ni se supone un límite monetario concreto.

La copia cloud sigue sin sesión Firebase/gcloud y sin acceso a la Mac. El propietario ejecutó los cambios de producción y el login en su terminal/navegador. La pausa solicitada cambia el cliente y la función administrativa, por lo que requiere un nuevo despliegue. Prepararla o superar pruebas locales no significa que ya esté aplicada en producción.

### Aumento de cupos solicitado — 13 de noviembre de 2026

El propietario informó que el sitio funciona y que alcanzó el límite diario. Se elevaron los topes de admisión de 5/30 a **50 por usuario y 200 para el proyecto**. Se probaron los límites exactos: una solicitud con contadores 49/199 se admite; llegar a 50 por usuario o 200 globales bloquea la siguiente. La prueba de regresión admite el consumo 5/30 que antes bloqueaba el acceso. El cambio necesita desplegar el backend; no modifica los contadores ni genera IA para validarlo. Se conserva la pausa de App Check autorizada usando:

```bash
git pull --ff-only origin main && npm run deploy:online -- --without-app-check
```

Este comando actualiza la aplicación sin ejecutar la prueba pagada de IA automáticamente. La confirmación del propietario sobre el funcionamiento es distinta del informe completo de verificación online, que todavía no se ha recibido en esta sesión.

## Preparación inicial

### Pausa temporal de App Check solicitada por el propietario

Desde la carpeta del proyecto, incorporar la actualización y desplegar con el flag explícito:

```bash
git pull --ff-only origin main && npm run deploy:online -- --without-app-check
```

`--without-app-check` desactiva la inicialización de reCAPTCHA en el cliente y la exigencia de App Check en `adminCommand` **solo para ese despliegue**. El informe registra `appCheckEnforced: false`. El build excluye el valor de la clave reCAPTCHA; no se cambia el registro remoto ni `.env.production.local`. Se mantienen Authentication, custom claims, lista de administradores activos, reglas de Firestore/Storage, validación de fotos, versiones, idempotencia y límites de IA. Durante la pausa la función no exige atestación del navegador. Las solicitudes todavía requieren un usuario autorizado.

No pasar este flag a `release:online`: usar el comando anterior y, al confirmar el despliegue, `npm run verify:online`. La verificación completa crea un borrador privado y tres trabajos reales de IA; revisar el informe de cualquier intento incompleto antes de repetir. Para comprobar la preparación sin publicar: `npm run deploy:online -- --check --without-app-check`.

Para reactivar, corregir en Firebase App Check el campo de clave pública Enterprise usando el ID de una clave web SCORE del mismo proyecto, con ambos dominios autorizados. Luego:

```bash
npm run check:appcheck -- --configure-enterprise &&
npm run deploy:online
```

El despliegue normal siempre escribe `CATALOG_APPCHECK_ENFORCED=true` en Functions y activa App Check en el cliente, aunque una terminal herede variables de una pausa anterior. Un valor desconocido de la política del backend se rechaza. El preflight normal valida ahora también la existencia, tipo y dominios de la clave real mediante `recaptchaenterprise.keys.get`; no basta con que coincidan el archivo local y el registro de App Check. La configuración de prueba o un secreto no deben usarse como clave pública. Si se confirmó que un secreto estuvo en un build anterior, revocarlo con su proveedor; retirar el valor del siguiente build no revoca copias anteriores.

Validación de esta entrega: 204 pruebas unitarias, lint, tipos y compilaciones de frontend/backend aprobados con entorno ficticio de producción y la pausa activa. Se comprobó por separado el handler compilado: rechaza usuarios anónimos, miembros ausentes/inactivos y roles inválidos o distintos, sustituyendo las lecturas de Firestore en memoria, sin llamadas remotas. El build pausado no contiene el valor de la clave reCAPTCHA de prueba. Esto no sustituye la prueba del guardado ni de IA en producción.

Con App Check activo, el panel comprueba su token antes de enviar una operación. Un fallo muestra únicamente un código de diagnóstico y estado HTTP, sin mensajes crudos, tokens ni claves. No fuerza renovaciones ni reintenta guardados automáticamente; un intercambio que no responde se detiene a los 20 segundos.

### 1. Herramientas, sesión y facturación

Usar Node compatible (22.22.2+ o 24.15+), Google Cloud CLI y las dependencias fijadas en los lockfiles:

```bash
npm ci
npm --prefix functions ci
npx firebase login
gcloud auth login
gcloud billing projects describe rinconcito-verde-cr --project=rinconcito-verde-cr --billing-project=rinconcito-verde-cr --format='value(billingEnabled)'
```

Las sesiones deben tener permisos sobre este proyecto. Functions requiere Blaze. Si la consulta devuelve `False`, un operador debe vincular únicamente la cuenta autorizada con `gcloud billing projects link`; la cuenta concreta se mantiene fuera de Git. El script de despliegue solo verifica el estado, nunca cambia la cuenta vinculada. [Requisito de Functions](https://firebase.google.com/docs/functions/get-started) y [comando de vinculación](https://cloud.google.com/sdk/gcloud/reference/billing/projects/link).

`--project` selecciona el destino del comando; `--billing-project` selecciona el proyecto de cuota de la petición. El despliegue, la comprobación App Check y la sesión de preparación fijan ambos a `rinconcito-verde-cr` mediante argumentos, sin cambiar la configuración global de gcloud ni la cuenta de facturación vinculada. Las peticiones REST usan además `X-Goog-User-Project` con ese mismo proyecto. El operador necesita `serviceusage.services.use`, permiso que ya utiliza la comprobación de App Check. [Configuración oficial del proyecto de cuota](https://cloud.google.com/docs/quotas/set-quota-project).

Si Cloud Billing responde `429 RATE_LIMIT_EXCEEDED`, revisar `consumer` en el error. El proyecto `32555940559` pertenece al cliente compartido de gcloud; no es el número de este proyecto. Usar la consulta anterior con `--billing-project` explícito. El fallo no significa que Blaze esté desactivado y no requiere volver a vincularlo. Si el límite corresponde al proyecto propio, esperar la ventana de cuota y revisar uso antes de reintentar; el script se detiene y no reintenta en bucle.

Si al seleccionar la cuota propia aparece `SERVICE_DISABLED` para `cloudbilling.googleapis.com`, habilitar únicamente esa API y volver a consultar tras su propagación:

```bash
gcloud services enable cloudbilling.googleapis.com --project=rinconcito-verde-cr --billing-project=rinconcito-verde-cr
```

Este comando habilita la API de consulta; no vincula una cuenta de facturación. Si realmente `billingEnabled` devuelve `False`, completar la vinculación previamente autorizada desde Firebase Console → actualizar plan → Blaze y verificar el estado. [Cambiar al plan Blaze](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

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

La comprobación normal y el preflight del despliegue seleccionan el recurso correspondiente al proveedor. Enterprise exige que la clave pública local coincida con Firebase y exista como clave web SCORE del proyecto con ambos dominios permitidos; v3 verifica `siteSecretSet` y no puede comparar su clave pública mediante esta API. El token temporal de gcloud se mantiene en memoria, no se imprime ni escribe, y se rechazan redirecciones. El intercambio real de tokens y los dominios se verifican después desde el navegador online. [Recurso Enterprise](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.apps.recaptchaEnterpriseConfig) y [consulta v3](https://firebase.google.com/docs/reference/appcheck/rest/v1/projects.apps.recaptchaV3Config/get).

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

### Permiso de Storage para validar administradores en Firestore

Las reglas de `storage.rules` consultan `adminUsers/UID` con `firestore.get()`. Además del rol del usuario, el agente de Storage necesita `roles/firebaserules.firestoreServiceAgent`. Firebase CLI omite la comprobación/asignación interactiva de este rol cuando se usa `--non-interactive`; desplegar las reglas no garantiza que esa integración esté habilitada. El preflight ahora comprueba el rol del agente exacto y bloquea una publicación si falta o tiene una condición que requiere revisión.

Consultar únicamente ese permiso:

```bash
gcloud projects get-iam-policy rinconcito-verde-cr --billing-project=rinconcito-verde-cr --flatten='bindings[].members' --filter='bindings.role=roles/firebaserules.firestoreServiceAgent AND bindings.members=serviceAccount:service-673742120988@gcp-sa-firebasestorage.iam.gserviceaccount.com' --format='table(bindings.role,bindings.members,bindings.condition.expression)'
```

Si falta, asignarlo al agente de Storage de este proyecto, dentro de la preparación autorizada:

```bash
gcloud projects add-iam-policy-binding rinconcito-verde-cr --member='serviceAccount:service-673742120988@gcp-sa-firebasestorage.iam.gserviceaccount.com' --role='roles/firebaserules.firestoreServiceAgent' --condition=None --billing-project=rinconcito-verde-cr --format='none'
```

Volver a consultar para confirmar. Este rol permite a las reglas consultar Firestore; no abre el bucket al público ni modifica las cuentas de los administradores. No sustituirlo por Owner/Editor ni conceder roles de agente a personas. Si hay una condición IAM existente, revisar su alcance antes de cambiarla. Una vez propagado el permiso, ejecutar `npm run verify:online` para comprobar la subida/lectura privada y las funciones ya publicadas. [Integración Storage–Firestore](https://firebase.google.com/docs/storage/security/rules-conditions#enhance_with_cloud_firestore) y [rol de lectura entre servicios](https://cloud.google.com/iam/docs/roles-permissions/firebaserules).

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

1. Valida configuración cloud, proyecto/cuota, sesión, Blaze, app web, base de datos, bucket/CORS, permiso del agente Storage para consultar Firestore, App Check, modelos y metadatos del secreto.
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
- Comprueba login/rol, registra el ID del borrador privado `QA online Sansevieria <fecha>` y sube la fotografía existente. Antes de pedir IA, descarga el blob privado, compara su SHA-256 y guarda el borrador; espera hasta 90 segundos para permitir el arranque inicial de la callable sin reenviar la operación.
- Envía **una solicitud real por tipo**: identificación, contenido con fuentes y mejora de fotografía. Espera las tres propuestas, comprueba cuidados/fuentes y que el texto del borrador no haya sido reemplazado.
- Compara el SHA-256 de la fotografía original descargada con el archivo inicial. Deja las propuestas sin aceptar y el borrador sin publicar; no realiza movimientos de inventario.
- Comprueba el botón «Administrar» en el catálogo, su desaparición al salir y el ancho móvil. Guarda `result.json`, IDs de trabajos y capturas en `.firebase/online-qa/<fecha>/` (ignorado por Git).

La prueba hace tres solicitudes de trabajo; los reintentos acotados del backend ante fallos temporales pueden implicar más llamadas al proveedor. Por solicitud del propietario, el código admite **50 trabajos por usuario/día UTC y 200 en total por proyecto/día UTC**. Ambos topes se aplican a la vez. El día cambia a las 18:00 de Costa Rica; cada trabajo aceptado cuenta aunque después falle. El aumento conserva los contadores existentes: no borra ni reinicia el consumo del día. Repetir la prueba completa crea otro borrador y consume cuota. Si hay un fallo, revisar los trabajos ya aceptados antes de repetir; no se reenvía automáticamente la secuencia.

Para comprobar la segunda cuenta sin nuevos trabajos IA:

```bash
npm run verify:online -- --access-only
```

Para consultar instrucciones sin abrir Chrome ni generar contenido:

```bash
npm run verify:online -- --help
```

La calidad visual de la propuesta y exactitud botánica/fuentes requieren revisión humana. El informe no sustituye comprobar QR con teléfono/impresora, etiquetas, descargas de marca, WhatsApp y crédito Vision Mind. La primera ejecución guardó capturas públicas móvil/escritorio y una captura del fallo de subida en `.firebase/online-qa/2026-11-13T18-43-23-414Z/` en la Mac. Las imágenes no se han transferido ni revisado visualmente desde la copia cloud. El informe nuevo registra la etapa y los mensajes de error visibles del panel, sin cookies, tokens ni campos de contraseña.

## Fallos, reversión y pruebas de preparación

### Primer disparador de Eventarc

Si aparece `Permission denied while using the Eventarc Service Agent` al crear `processAI`, inspeccionar el rol del agente y el recurso antes de repetir:

```bash
gcloud projects get-iam-policy rinconcito-verde-cr --billing-project=rinconcito-verde-cr --flatten='bindings[].members' --filter='bindings.role=roles/eventarc.serviceAgent AND bindings.members=serviceAccount:service-673742120988@gcp-sa-eventarc.iam.gserviceaccount.com' --format='table(bindings.role,bindings.members,bindings.condition.expression)'
gcloud functions describe processAI --gen2 --region=us-central1 --project=rinconcito-verde-cr --billing-project=rinconcito-verde-cr --format='yaml(name,state,stateMessages,labels,eventTrigger.trigger)'
```

El rol debe pertenecer al agente Eventarc de este proyecto. Google documenta que su propagación inicial puede tardar unos siete minutos. Con el rol correcto y la función ausente, dejar pasar ese intervalo desde el error y ejecutar `npm run release:online` una vez. Si existe un recurso parcial, revisar su estado, generación, región y codebase antes de actualizarlo; no eliminarlo a ciegas. Si el rol falta, revisar específicamente el agente y su permiso, sin conceder roles de agente a usuarios. [Diagnóstico oficial de Eventarc](https://cloud.google.com/eventarc/docs/troubleshooting).

### Publicación parcial y verificación

Antes de publicar, un fallo detiene el proceso. Durante el despliegue pueden quedar etapas completadas: reglas, worker, admin y Hosting no forman una transacción global. El informe marca `incomplete` y registra las etapas confirmadas. Si falla el backend, no se publica Hosting; si falla la comparación HTTPS después de Hosting, la publicación podría haber terminado y requiere inspección. No repetir a ciegas.

`release:online` separa los informes: un despliegue correcto puede ir seguido de una prueba real fallida. Revisar ambos; no interpretar solo `status: deployed` como validación de IA.

El frontend puede revertirse a una release Hosting verificada. Functions/reglas requieren revisión independiente; revertir Hosting no revierte datos ni permisos. No resetear el checkout del usuario ni restaurar inventario desde JSON.

Validación de esta entrega: `npm run check` aprobado con **188 pruebas en 20 archivos**, lint, tipos frontend/backend y build. `npm run verify:online -- --help` también terminó correctamente, sin abrir navegador ni hacer solicitudes IA. El build mantiene un aviso por un chunk mayor de 500 kB. La corrección de aislamiento se comprueba ejecutando `npm run check` con variables públicas ficticias inyectadas mediante `productionEnvironment`, como hace el despliegue. Los casos de App Check cubren entorno vacío, cloud y emuladores; no requieren configuración real ni acceso remoto.

La preparación añade pruebas de migración completa, fotos adicionales, conservación de registros existentes, pares incompletos, concurrencia, acceso en ambos sistemas, cuentas ausentes/deshabilitadas, claims existentes y fallos parciales. `npm run prepare:online -- --help` también se ejecutó sin acceso a servicios.

La comprobación App Check cubre v3 y Enterprise, coincidencia de la clave pública, pertenencia a la app/proyecto, fallos HTTP/red y protección del token. Las pruebas del cliente verifican el proveedor inicializado antes de Auth y la ausencia de App Check en emuladores. Se comprueba también el respaldo/conservación de configuración y el bloqueo por CORS ausente.

Las pruebas unitarias de configuración/despliegue cubren registro o reutilización de app, respaldo de configuración, exclusión de secretos, modelos explícitos, Spark, secreto deshabilitado, conflictos de funciones, orden de publicación, fallos parciales, catálogo faltante y comparación HTTPS. Se complementan con pruebas de admin/rutas/galería/QR. Functions y Hosting quedaron publicados en el commit indicado arriba. Sigue pendiente completar la validación real de subida/guardado/IA después del permiso IAM corregido y comprobar el acceso de la segunda cuenta.
