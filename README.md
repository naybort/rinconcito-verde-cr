# Rinconcito Verde CR — V1 local

Catálogo con las tres plantas de prueba originales, conservadas por instrucción de Bryan. Preparado para recibir datos reales después. Sin aviso ni badge de demostración. No publicado y sin remoto configurado.

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
