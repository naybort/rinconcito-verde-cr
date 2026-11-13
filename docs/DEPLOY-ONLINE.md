# Despliegue del catálogo y administrador online

El comando de esta entrega publica en el proyecto existente **rinconcito-verde-cr**:

```bash
npm run deploy:online
```

Destino: https://rinconcito-verde-cr.web.app y https://rinconcito-verde-cr.web.app/admin.
El comando requiere que la preparación inicial descrita abajo esté terminada. Una compilación correcta no significa que el despliegue haya ocurrido.

## Estado de esta entrega

Preparación realizada el 13 de noviembre de 2026. Incluye etiqueta QR con marca, fotografías con identidad, detalle ampliado, paginación y miniaturas del admin, ruta `/admin` compatible con los marcadores antiguos y acceso «Administrar» en el encabezado para sesiones autorizadas.

**La publicación de esta entrega está pendiente.** La copia cloud no tiene cuentas Firebase autorizadas (`firebase login:list`: `No authorized accounts`), no tiene gcloud disponible ni configuración pública completa de la app cloud. No se obtuvieron credenciales de la Mac. El último registro de facturación era Spark; el estado actual no se pudo consultar. La configuración pública del Hosting existente no devolvió `appId`. No se activaron facturación, IA ni usuarios productivos.

## Preparación inicial

1. Usar el proyecto **rinconcito-verde-cr**, sin cambiar los defaults de otros proyectos. Functions necesita Blaze ya habilitado con una cuenta de facturación autorizada. El script solo consulta su estado: no vincula cuentas ni cambia el plan. [Requisito oficial de Functions](https://firebase.google.com/docs/functions/get-started).
2. Tener Node compatible (22.22.2+ o 24.15+), dependencias de raíz y Functions, y Google Cloud CLI. Para un checkout nuevo: `npm ci` y `npm --prefix functions ci`. El despliegue usa Firebase CLI instalado por el lockfile del repositorio, sin instalaciones globales automáticas.
3. Iniciar sesión en la máquina que publicará mediante `npx firebase login` y `gcloud auth login`, con una cuenta que tenga permisos para este proyecto. No compartir tokens ni archivos de credenciales en el chat o Git. El script no inicia sesiones ni modifica la configuración activa de gcloud.
4. Registrar/verificar una app **Web** en Firebase Console, Authentication con correo/contraseña, y los dominios autorizados `rinconcito-verde-cr.web.app` y `rinconcito-verde-cr.firebaseapp.com`. Las dos personas confirmadas por el propietario deben tener cuentas reales: para cada UID, claim `role: "admin"` y documento `adminUsers/UID` con `active: true` y `role: "admin"`, provisionados por un operador autorizado. No reutilizar las cuentas ni contraseñas del seed local. Este comando no crea usuarios ni envía correos.
5. Crear/verificar Firestore `(default)` y el bucket correspondiente al proyecto. La región de Functions permanece `us-central1`. Revisar CORS para lectura autenticada de imágenes desde ambos dominios, conservando cualquier origen existente que siga siendo necesario. [Descargas y CORS](https://firebase.google.com/docs/storage/web/download-files).
6. Registrar **App Check reCAPTCHA v3** para la app web y sus dominios. El cliente usa la clave pública del sitio; la callable exige App Check en producción. No se desactiva esa protección para publicar. [Configuración oficial](https://firebase.google.com/docs/app-check/web/recaptcha-provider).
7. Migrar las fichas y categorías existentes con un procedimiento revisado, respaldo y creación sin sobrescribir registros existentes. Conservar todos sus IDs (especialmente `sansevieria`), fotos públicas y URLs QR. Las colecciones `publicPlants` y `publicCategories` deben contener las fichas/categorías del catálogo JSON antes de sustituir el frontend estático. Las fichas editables correspondientes deben existir en `plants`/`categories`; no inventar inventario ni copiar movimientos de prueba. **No ejecutar `seed:emulators` contra producción.** La migración inicial no forma parte del comando de despliegue.

Copiar la plantilla sin sobrescribir archivos existentes:

```bash
cp -n .env.production.example .env.production.local
```

Completar en `.env.production.local` la API key **pública de Firebase**, App ID y clave **pública** App Check obtenidas de la app real. Verificar bucket y dominio. `VITE_FIREBASE_MODE` debe ser `cloud`; el script rechaza `emulator`, otro proyecto o campos incompletos. Nunca poner secretos OpenAI ni JSON de una service account en variables `VITE_*`. El archivo real permanece ignorado por Git. No tocar `.env.local` ni la configuración de los emuladores.

## Comando de comprobación y publicación

Desde el checkout actualizado en la Mac:

```bash
cd /Users/bryanortiz/Documents/GitHub/rinconcito-verde-v1
git pull --ff-only origin main
npm run deploy:online -- --check
npm run deploy:online
```

Si existen cambios locales, preservarlos y resolver cualquier conflicto antes del pull; no usar reset ni forzar. `--check` hace las mismas consultas y compilaciones, sin publicar. La invocación normal vuelve a comprobar todo para publicar exactamente el build validado.

El flujo automático:

1. Valida la configuración pública; comprueba acceso Firebase, Blaze existente, correspondencia de la app web, base de datos, bucket y proveedor App Check.
2. Ejecuta `npm run check` (lint, tipos frontend/backend, pruebas unitarias, catálogo y build), y compila Functions.
3. Comprueba mediante lecturas públicas que las fichas y categorías existentes ya están disponibles en Firestore. Se detiene ante errores o datos faltantes.
4. Prepara Functions en un directorio temporal propio, con código compilado, dependencias y `AI_ENABLED=false`. No copia `.env.local`, claves ni secretos del backend. Publica únicamente reglas/índices Firestore, reglas Storage y `functions:catalog:adminCommand`.
5. Si ese paso termina correctamente, publica Hosting. Mantiene la reescritura SPA para `/admin` y los enlaces QR por hash.
6. Compara el HTML servido por HTTPS en `/` y `/admin` con el build exacto y guarda `.firebase/deploy-online-result.json`, con commit, estado del checkout, etapas completadas y URL. Elimina solo su directorio temporal.

No instala dependencias, activa billing, arranca/para emuladores, migra datos, cambia roles ni envía mensajes. El flujo de IA real permanece fuera de esta publicación: no despliega ni elimina `processAI`, no crea secretos y `adminCommand` rechaza nuevos trabajos de IA. Una activación posterior requiere configuración y autorización separadas. La CLI puede habilitar APIs necesarias para los recursos desplegados dentro del proyecto con Blaze ya autorizado.

El comando antiguo `npm run deploy -- --project rinconcito-verde-cr` sigue siendo **solo Hosting**. No sirve para publicar toda la administración. No publicar builds preparados en modo emulador con comandos manuales.

## Revisión en línea

Después del mensaje de éxito, probar con un navegador y las cuentas reales:

- Catálogo anónimo, búsqueda, favoritos, Sansevieria, detalle/fotos, QR, WhatsApp y crédito Vision Mind.
- `/admin` directo y al recargar; marcadores anteriores `/#/admin` y `/#admin`.
- Inicio de sesión de ambos administradores; volver al catálogo y ver «Administrar»; cerrar sesión y comprobar que desaparece.
- Miniaturas, búsqueda, paginación, selección entre páginas, descarga QR y fotografía, impresión y edición con datos de revisión identificables. No realizar movimientos de inventario real solo para comprobar la UI.
- Móvil y escritorio. El smoke automático verifica la versión del HTML, **no** sustituye esta comprobación autenticada ni una impresión física.

## Fallos y reversión

Ante un fallo previo no se inicia la publicación. Un fallo durante `firebase deploy` puede dejar recursos parcialmente actualizados; no hay una transacción global entre reglas, Functions y Hosting. Revisar la salida y el informe antes de repetir. Si falla el backend, Hosting no se publica. Si falla HTTPS después de Hosting, el informe indica `incomplete` aunque la publicación pueda haber terminado.

Para revertir el frontend, usar una release previa verificada desde Firebase Hosting o un checkout separado del commit anterior. No resetear el checkout del usuario ni restaurar inventario desde JSON. Las reglas y Functions requieren una revisión/reversión independiente; el rollback de Hosting no revierte datos ni permisos.

## Evidencia de pruebas

Resultado de esta preparación: `npm run check` aprobado (134 pruebas en 16 archivos, lint, tipos y build), compilación separada del backend y compilación de la variante cloud del frontend aprobadas. `npm run deploy:online -- --check` se detuvo antes de publicar porque esta copia no tiene configuración productiva.

Las pruebas `tests/deployment.test.ts` usan CLI, red y archivos ficticios. Cubren orden de publicación, fallos de autenticación/build/backend, Spark, falta de fichas públicas, verificación HTTPS, configuración incorrecta, exclusión de secretos locales y modo `--check`. Se complementan con las pruebas de `/admin`, botón por sesión, paginación, galería y QR. No se ejecutaron llamadas reales a IA ni pruebas que reinicien emuladores.

Referencia de la consulta de facturación utilizada: [gcloud billing projects describe](https://cloud.google.com/sdk/gcloud/reference/billing/projects/describe).
