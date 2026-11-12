# Rinconcito Verde CR — base nueva V1

Proyecto independiente, creado desde cero siguiendo SPEC-001. No contiene código del repositorio anterior ni tiene un remoto configurado. Es una demostración para revisión local, no un catálogo comercial publicado.

## Abrir en Visual Studio Code en Mac

1. Descomprimir el ZIP. Conservá su carpeta `rinconcito-verde-v1` separada del repositorio anterior.
2. Abrir esa carpeta en Visual Studio Code: **File → Open Folder**.
3. Usar Node.js 24 LTS (validado con 24.22.1) y npm. Mínimo declarado: Node 22.18.
4. En **Terminal → New Terminal**:

```bash
npm ci
npm run dev -- --host 127.0.0.1
```

Abrí la dirección que imprime Vite (normalmente http://127.0.0.1:5173). Para detenerlo: Control+C. No abrir index.html directamente en Finder.

No se necesitan claves, cuentas ni variables de entorno. Se necesita internet para instalar paquetes, no para cargar las imágenes y fuentes de la aplicación después de la instalación.

## Recorrido para revisar

- Catálogo: tres plantas de demostración con categorías informativas.
- Tocá una tarjeta para abrir el detalle, o un corazón para guardar/quitar favoritos.
- Recargá: los favoritos deben continuar en el mismo navegador.
- Abrí Favoritos: muestra la lista y la vista previa del mensaje.
- WhatsApp está deshabilitado porque el número comercial está vacío.
- Quitá todas las plantas para probar el estado vacío.
- Probá la vista móvil y escritorio; la revisión visual real sigue pendiente en esta entrega.

Rutas: `#/`, `#/plantas/demo-monstera`, `#/favoritos`. Rutas hash permiten recarga sin reglas especiales de servidor.

## Comprobaciones

```bash
npm run check
# lint + 26 pruebas Vitest + validación de JSON/imágenes + TypeScript + build

npx playwright install chromium
npm run test:e2e
# 5 pruebas Chromium: anchos 360/390/768/1280 y teclado/datos corruptos

npm run build
npm run preview -- --host 127.0.0.1
```

La suite E2E está preparada, pero no pudo ejecutarse contra un navegador en el entorno de elaboración. Ver [VALIDATION.md](docs/VALIDATION.md). No se afirma paridad visual verificada ni pruebas de Safari.

## Contenido y configuración

- `src/data/plants.json`: plantas, IDs estables, nombre, referencias a categorías, imágenes, descripción opcional y foto de detalle opcional.
- `src/data/categories.json`: IDs y nombres de categorías.
- `public/images`: imágenes locales del Figma, solo para esta demostración.
- `src/config/business.json`: marca, número y encabezado del mensaje.
- `src/app/theme.ts`: paleta, tipografía y ajustes MUI.
- `docs/SPEC-001.md`: alcance aplicado, criterios y decisiones.

Para conectar WhatsApp más adelante: colocar únicamente el número comercial confirmado en formato internacional, solo dígitos y sin “+”, en `whatsappNumber`. La aplicación genera `wa.me` y abre un borrador; no envía mensajes. No hay un teléfono de ejemplo operativo. Confirmar número, texto y contenido antes de habilitarlo comercialmente. La validación de formato no prueba que exista una cuenta WhatsApp.

Actualizar JSON requiere validar y recompilar. No hay carga de archivos ni panel administrador. No guardar secretos en JSON: estos archivos son públicos al compilar.

Favoritos se guardan bajo `rinconcito-verde:favorites:v1` con versión e IDs. No se sincronizan entre dispositivos. Datos corruptos o desconocidos recuperan una selección vacía; almacenamiento bloqueado conserva selección solo durante la sesión y muestra aviso.

## Alcance intencional

Incluido: catálogo, detalle, favoritos locales, consulta preparada.
Pendiente: número comercial, contenido real, revisión visual y E2E, hosting y decisión sobre repositorio nuevo.
No implementado: búsqueda, filtros avanzados, perfil, guía editorial, cuentas, pagos, reservas, stock en tiempo real, administrador y analítica.
Las categorías son etiquetas; no se presentan controles de filtrado sin función.

No se realizó despliegue, merge ni publicación remota. Node_modules, dist, cachés, archivos de entorno y resultados temporales de navegador se excluyen del ZIP.
