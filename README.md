# Rinconcito Verde CR — V1 local

Catálogo con las tres plantas de prueba originales, conservadas por instrucción de Bryan. Preparado para recibir datos reales después. Sin aviso ni badge de demostración. Repositorio remoto configurado: https://github.com/naybort/rinconcito-verde-cr. Hosting publicado: https://rinconcito-verde-cr.web.app (catálogo de prueba).

## Ejecutar
```bash
npm run dev -- --host 127.0.0.1
```
Node 24 recomendado. Dependencias ya instaladas en la Mac; para una copia nueva, usar `npm ci`.

## Cargar catálogo real
- Agregar plantas a `src/data/plants.json`, conservando `schemaVersion: 1`.
- Cada planta necesita `id` estable, `name`, `categoryIds` válidas e `image` con `src` bajo `/images/` y texto `alt`.
- Opcionales: `description`, `detailImage`, `care` con `light`, `watering`, `humidity`, `temperature`.
- Categorías editables en `src/data/categories.json`.
- Poner fotografías definitivas en `public/images` y ejecutar `npm run check`.
- Los fixtures en `tests/fixtures` son exclusivamente datos de prueba: se usan en pruebas unitarias. El catálogo visible conserva por ahora esas plantas de prueba.

## Incluido
Búsqueda por nombre sin tildes/mayúsculas, filtro por categoría, favoritos locales, detalles y cuidados con iconos, consulta individual/lista por WhatsApp +506 71160290. Con catálogo vacío se ocultan filtros y se ofrece contacto general. Los favoritos de productos retirados no aparecen.

Menú Catálogo/Favoritos en flujo normal; crédito Powered by Vision Mind debajo del menú, sin superposición móvil. Ícono de marca derivado de imagen de Bryan. Sin cuentas, pagos, admin, publicaciones ni despliegue.

## Verificar
```bash
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```
Ver `docs/VALIDATION.md`. Pendientes: datos/fotos reales, Safari, dominio y hosting. WhatsApp abre borrador; no envía automáticamente.

## Desplegar catálogo y administrador

Preparación inicial, requisitos y revisión en línea: [docs/DEPLOY-ONLINE.md](docs/DEPLOY-ONLINE.md).

```bash
npm run deploy:online -- --check
npm run deploy:online
```

El comando publica en `rinconcito-verde-cr` después de validar configuración cloud, acceso y requisitos existentes; ejecuta pruebas/build, publica backend antes de Hosting y comprueba HTTPS. Requiere la preparación productiva inicial. No activa billing ni IA y no modifica los emuladores.

El comando anterior `npm run deploy -- --project rinconcito-verde-cr` publica exclusivamente Hosting; su antecedente está en [docs/DEVOPS.md](docs/DEVOPS.md).

## Etapa 2 — administración local

Administrador privado en `/admin`, inventario por cantidad/presentación y QR compartido por ficha. Configuración, emuladores, roles, IA opcional y despliegue posterior: [docs/ADMIN-STAGE2.md](docs/ADMIN-STAGE2.md). La configuración productiva permanece pendiente; sin variables Firebase el catálogo JSON sigue funcionando.

Para probar OpenAI real sin desplegar Firebase, ver [docs/LOCAL-AI.md](docs/LOCAL-AI.md). La opción sigue apagada por defecto y requiere configuración privada del backend; las pruebas automatizadas no hacen llamadas pagas.
