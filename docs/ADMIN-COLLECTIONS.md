# Listados administrativos

Mejora sobre `e361f4c2ea66f4205065cabf8f5941f10c53a67c`, preparada el 13 de noviembre de 2026.

## Comportamiento

- Plantas muestra 10 fichas por página, con opciones de 25 y 50, contador de resultados y navegación arriba/abajo. Cada fila tiene miniatura, nombre, ID completo, estado y acción de editar. Permite ordenar por nombre o cambios recientes. Los filtros incluyen conteos por estado; la búsqueda ignora mayúsculas y tildes. Al editar y volver se conserva página, orden y búsqueda.
- Inventario y Etiquetas reutilizan un selector paginado con miniatura e ID. La selección permanece al cambiar de página o buscar. “Ver selección” permite revisar todo el lote, “Limpiar selección” lo vacía y “Seleccionar esta página” agrega solo las filas visibles. Inventario conserva el límite existente de 30 fichas y aplica únicamente los IDs seleccionados.
- El historial de movimientos tiene búsqueda y paginación. Ya no se limita visualmente a los primeros 50 movimientos recibidos. Mantiene el orden de más recientes primero.
- Categorías y cuidados tienen búsqueda, paginación, ID y estado visibles. Cambiar de página no reemplaza el formulario en edición. Las fichas relacionadas también están paginadas.
- La vista previa de etiquetas tiene su propia paginación. Se imprimen todas las copias seleccionadas, no solo la página visible. Las descargas muestran también el ID para distinguir nombres repetidos; los QR, dimensiones y URLs siguen intactos.

## Implementación

`collections.tsx` contiene búsqueda normalizada, orden estable y paginación compartida. `PlantList.tsx` organiza el módulo Plantas y permanece montado mientras se edita para conservar su contexto. `PlantPicker.tsx` comparte selección entre Inventario y Etiquetas. `PlantIdentity.tsx` carga la foto aprobada/original mediante Firebase Storage autenticado; para las fichas demo usa su imagen existente. Solo se montan las miniaturas de las filas visibles y se liberan los object URLs al salir o cambiar de foto. Si falta la imagen o falla la carga se muestra “Sin foto”. No se crean imágenes nuevas ni se modifican originales.

La paginación es de interfaz sobre las suscripciones existentes. Esta entrega reduce filas y fotos simultáneas; no cambia las consultas Firestore ni implementa paginación del servidor. No hay migración, cambios en reglas, credenciales, funciones o esquema de datos. No se ejecutó IA real ni se modificaron emuladores de la Mac.

## Validación

- `npm run check`: lint, tipos frontend/backend, 103 pruebas en 13 archivos, validación del catálogo y build.
- Ocho pruebas nuevas en `tests/admin-collections.test.tsx`: búsqueda/paginación/contexto, nombres duplicados, selección entre páginas, límite de lote e historial antiguo, categorías/impacto, copias de etiquetas y ciclo de vida/fallos de miniaturas privadas. Storage y preparación de etiquetas usan mocks.
- Revisión en navegador cloud con 137 fichas ficticias: cambio de página, búsqueda por ID, orden, selección entre páginas, filtro de selección, categorías y vista previa de 24 etiquetas mostrando 10/10/4. Anchos 320, 390, 768 y 1280 sin desbordamiento horizontal del documento. Se corrigió durante la revisión el ancho de nombre/ID en móvil.
- Se adaptó el caso de etiquetas en `tests/e2e/branding.spec.ts` a la nueva paginación. No se volvió a ejecutar la suite CLI ni la suite de emuladores debido a las limitaciones del entorno ya documentadas en `BRAND-DETAIL-VALIDATION.md`. La impresión física y la paginación multipágina del diálogo nativo siguen pendientes. El CSS de impresión conserva todas las copias en el árbol e impide que el filtro visual las excluya.
- El build mantiene el aviso de tamaño del bundle admin (aprox. 891 kB). No se añadieron dependencias.

## Revisar en local

Después del pull, recargar el admin que ya utiliza los emuladores. No hace falta reinstalar dependencias ni cambiar datos. Si el frontend se inició en modo estático (`VITE_FIREBASE_MODE=` vacío), detener únicamente Vite y arrancarlo usando la configuración local de emuladores existente:

```sh
VITE_FIREBASE_MODE=emulator npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

No reiniciar ni volver a sembrar los emuladores como parte de esta revisión. No ejecutar scripts de deploy.

Para revisar solo la interfaz sin backend, arrancar Vite en modo estático y abrir `/tests/admin-collections-browser.html`. Este fixture usa 137 fichas de prueba y simula las acciones; no escribe datos. `/tests/responsive-browser.html` ofrece anchos de referencia. Los fixtures no se incluyen en `dist`. Las capturas de revisión quedan como artefactos de entrega, fuera del commit de código.
