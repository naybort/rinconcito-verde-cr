# Rinconcito Verde CR

Catálogo de vivero con cuatro fichas de prueba conservadas, administración privada, inventario, etiquetas QR y asistencia IA opcional. Repositorio: https://github.com/naybort/rinconcito-verde-cr. Hosting existente: https://rinconcito-verde-cr.web.app; consultar el estado de la entrega y preparación productiva en [docs/DEPLOY-ONLINE.md](docs/DEPLOY-ONLINE.md).

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

Menú Catálogo/Favoritos en flujo normal; crédito Powered by Vision Mind debajo del menú, sin superposición móvil. Ícono de marca derivado de imagen de Bryan. La administración usa cuentas privadas autorizadas. No incluye cuentas de compradores ni pagos.

## Verificar
```bash
npm run check
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```
Ver `docs/VALIDATION.md`. Pendientes: datos/fotos reales, Safari y verificación del despliegue completo en producción. WhatsApp abre borrador; no envía automáticamente.

## Desplegar catálogo, administrador e IA

Preparación inicial, requisitos y revisión en línea: [docs/DEPLOY-ONLINE.md](docs/DEPLOY-ONLINE.md).

```bash
npm run configure:online
# Completar App Check, modelos y requisitos iniciales indicados en la guía.
npm run check:appcheck
npm run deploy:online -- --check
npm run release:online
```

`configure:online` registra o reutiliza la app web y guarda su configuración pública. `release:online` valida requisitos y pruebas, publica reglas, procesador IA, admin y Hosting, verifica HTTPS y abre Chrome para probar las tres operaciones reales de IA en un borrador privado. Requiere la preparación productiva inicial, Blaze, secreto OpenAI y login manual de un administrador. No modifica los emuladores. Para probar otra cuenta sin nuevas llamadas IA: `npm run verify:online -- --access-only`.

El comando anterior `npm run deploy -- --project rinconcito-verde-cr` publica exclusivamente Hosting; su antecedente está en [docs/DEVOPS.md](docs/DEVOPS.md).

## Etapa 2 — administración local

Administrador privado en `/admin`, inventario por cantidad/presentación y QR compartido por ficha. Configuración, emuladores, roles, IA opcional y despliegue posterior: [docs/ADMIN-STAGE2.md](docs/ADMIN-STAGE2.md). La configuración productiva permanece pendiente; sin variables Firebase el catálogo JSON sigue funcionando.

Para probar OpenAI real sin desplegar Firebase, ver [docs/LOCAL-AI.md](docs/LOCAL-AI.md). La opción sigue apagada por defecto y requiere configuración privada del backend; las pruebas automatizadas no hacen llamadas pagas.
