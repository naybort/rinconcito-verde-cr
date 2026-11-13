# DevOps: Rinconcito Verde CR V1

> Esta sección conserva el antecedente de Hosting V1. La nueva administración serverless local, aún sin despliegue, se documenta en [ADMIN-STAGE2.md](ADMIN-STAGE2.md).

## Arquitectura
React/TypeScript/Vite genera un sitio estático en `dist/`. Firebase **Hosting**, no App Hosting, sirve catálogo, imágenes y aplicación. Sin servidor, Cloud Run, Functions, Firestore ni pagos. Favoritos en localStorage por navegador; WhatsApp abre un borrador. JSON del catálogo se empaqueta en cada build, por lo que cambiarlo requiere nuevo despliegue.

`firebase.json` sirve solo `dist/`, reescribe rutas SPA a `/index.html`, evita caché persistente del HTML y cachea assets versionados. No se publica el repositorio completo ni variables `.env`. Cualquier variable Vite incorporada al frontend sería pública: no introducir secretos.

## Estado verificado el 12 de noviembre de 2026
- Mac: Node 24.13.0, Firebase CLI 15.5.1, Google Cloud SDK 558.0.0.
- Repo: `rinconcito-verde-cr`, rama local main; no se modifica/pushea automáticamente.
- Se creó el proyecto independiente `rinconcito-verde-cr` y se publicó el sitio predeterminado en https://rinconcito-verde-cr.web.app. Facturación deshabilitada (Spark); no se vinculó cuenta de pago.
- No se encontró una cuenta llamada “Vision Mind Google Cloud”. La cuenta abierta “Mi cuenta de facturación” financia los proyectos `vision-mind-landing`, `visionmind` y `gen-lang-client-0044852107`. Confirmar con Bryan antes de asociarla.
- GCloud tenía `afp-staging` como proyecto activo. **No usar defaults**: el comando exige ID explícito. No se crea `.firebaserc` con un destino supuesto.

## Preparación única (requiere destino y permisos confirmados)
1. Confirmar proyecto Firebase independiente para este sitio, su ID único y cuenta de facturación si aplica. No reutilizar AF/Risco/VisionMind por defecto.
2. Crear/habilitar el proyecto y Hosting en Firebase Console con la cuenta autorizada. Elegir Spark si no se requiere facturación, o Blaze únicamente después de confirmar cuenta y cargos variables. La preparación de este repo no ejecuta esos pasos.
3. Verificar sesión existente con `firebase login:list` y destino con `firebase projects:list`. Si caducó, iniciar sesión interactivamente con la cuenta autorizada; no guardar tokens en Git.
4. Confirmar que el sitio Hosting predeterminado es el destino correcto. Para un sitio secundario/multisite, adaptar explícitamente `site`/target antes de publicar.
5. Para checkout nuevo, Node 24 recomendado y `npm ci`. CLI probado 15.5.1 ya instalado; cualquier instalación/actualización se realiza por separado.

## Verificar y publicar
Desde la raíz del repo:
```bash
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
npm run deploy -- --project ID_DEL_PROYECTO_CONFIRMADO
```
El último comando **publica**. Rechaza ID ausente/inválido antes de ejecutar herramientas, comprueba CLI, ejecuta `npm run check` (lint + unitarias + validador JSON + TypeScript + build) y únicamente después `firebase deploy --only hosting --project ... --config firebase.json --non-interactive`. Ante un fallo se detiene; no instala, no inicia sesión, no crea proyecto, no asocia billing y no despliega bases de datos/reglas/functions. Las E2E se ejecutan por separado porque requieren navegador.

Usar el URL que devuelva Firebase, no asumir que existe antes del primer deploy. Verificar HTTPS, catálogo/filtros/favoritos, detalle/cuidados, refresh de rutas, footer y link WhatsApp sin enviar mensajes. Comprobar desde móvil y registrar commit, fecha, project ID, release/URL y resultado de QA. No confundir build correcto con sitio desplegado.

## Costos y control
Hosting admite cuota gratuita; Blaze cobra consumo adicional. Consultar precios vigentes antes de asociar facturación: https://firebase.google.com/docs/hosting/usage-quotas-pricing y https://firebase.google.com/pricing . La documentación específica consultada indica 10 GB almacenamiento sin costo y USD 0.026/GB adicional; 10 GB/mes transferencia sin costo y USD 0.15/GB adicional. La tabla general muestra una cuota diaria para Blaze; verificar el plan/cuota vigente en consola antes de presupuestar. No se garantiza costo cero. Las alertas de presupuesto no son un límite duro de gasto; establecerlas explícitamente si se autoriza Blaze. No activar servicios de backend para esta V1.

## Rollback y mantenimiento
En Firebase Console → Hosting → historial de versiones, elegir una versión previa verificada y usar rollback (requiere autorización de publicación). Alternativa: checkout separado del commit anterior, `npm ci`, pruebas y desplegarlo al mismo ID; no resetear el checkout con trabajo del usuario. El rollback del sitio no borra favoritos del navegador. Mantener IDs estables de plantas. Revisar consumo y versiones almacenadas; no borrar releases sin política aprobada.

## Pendientes antes de producción final
Vinculación de facturación solo después de concretar autorización presupuestaria; dominio si se desea, Safari, datos/fotos/cuidados definitivos. Las tres plantas de prueba se conservan por instrucción de Bryan. No se configuró CI/CD automático ni secretos en GitHub; despliegue manual desde la Mac por ahora.

## Verificación local de esta preparación
El 12 de noviembre de 2026 pasaron lint, 29 pruebas unitarias, TypeScript, validación del catálogo, build y 6 E2E Chrome. Se verificó que el script rechaza ID ausente/inválido. Con CLI simuladas se comprobó el destino explícito/Hosting exclusivo y que un check fallido impide el deploy. Después de autorización se publicó exclusivamente Hosting en `rinconcito-verde-cr`. HTTPS y rutas SPA devuelven 200. No se habilitaron servicios backend ni facturación.

## Despliegue realizado
URL: https://rinconcito-verde-cr.web.app
Consola: https://console.firebase.google.com/project/rinconcito-verde-cr/overview
Comando: `npm run deploy -- --project rinconcito-verde-cr`
Base Git: a732ed8 más archivos DevOps locales sin commit/push. Fecha: 12 noviembre 2026. Catálogo: tres plantas de prueba conservadas. Inspección estática de dist sin patrones comunes de claves/tokens ni archivos .env/map; no es una garantía de auditoría exhaustiva. Billing verificado deshabilitado. Pendiente asociación a cuenta, límite de gasto y QA Safari.
