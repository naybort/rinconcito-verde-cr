# Inventario por presentación y precios públicos

Entrega de desarrollo del 16 de noviembre de 2026. Sin publicación, despliegue ni llamadas de IA.

## Uso y compatibilidad

Cada ficha mantiene su ID y QR de catálogo. Una ficha puede tener varias presentaciones (`general`, `pequena`, `maceta-20cm`, etc.); cada presentación conserva sus cantidades disponibles y reservadas, ubicación, precio CRC opcional y número de maceta opcional.

El número de maceta es texto de hasta 40 caracteres, por ejemplo `12` o `20 cm`, compartido por las unidades de esa presentación. No identifica una maceta individual. Las existencias y precios anteriores siguen siendo válidos sin este atributo.

En Inventario, elegí una ficha y una presentación existente para cargar sus datos. Para registrar otra, escribí un ID nuevo. Los movimientos continúan admitiendo lotes de hasta 30 fichas, con el mismo ID de presentación y cantidades/motivo explícitos. Las cantidades solo se modifican con movimientos; consultar por WhatsApp no descuenta existencias.

## Conservación de datos

Guardar los datos de una presentación envía únicamente los campos editados. Cambiar el número de maceta no borra precio o ubicación, y tampoco modifica cantidades. Vaciar el precio y guardar lo elimina explícitamente; el precio cero es un valor válido. Las actualizaciones recibidas de campos sin editar se reflejan sin reemplazar una edición pendiente.

Si intentás cambiar de ficha o presentación mientras hay datos pendientes, podés seguir editando o descartar esos cambios. El formulario conserva la edición tras un error y bloquea envíos duplicados mientras espera. Editar cantidad, tipo o motivo marca el movimiento como pendiente; la marca se conserva al recuperar el borrador o guardar una presentación y se limpia únicamente tras registrar el movimiento con éxito. Seleccionar fichas por sí solo no lo marca. El borrador recuperable conserva el contexto y los campos editados; borradores anteriores siguen cargando sin convertir campos vacíos antiguos en eliminaciones.

## Precio público

La opción de mostrar precio pertenece a la ficha y requiere publicación. Su valor por defecto es desactivado. El backend prepara `priceOptions` solamente si la ficha permite mostrar precios y existen importes válidos; cada opción contiene presentación, precio y, cuando existe, número de maceta. Las cantidades, reservas y ubicación permanecen privadas.

El componente `PlantPrices` consume exclusivamente esas opciones públicas y muestra las presentaciones con moneda CRC. Las fichas antiguas o sin opciones no muestran un bloque de precios. La actualización de datos de una presentación solo actualiza precios públicos si la versión ya publicada los autoriza; editar una preferencia privada todavía no publicada no cambia esa autorización.

## Archivos de esta entrega

- `src/features/admin/Inventory.tsx`: selección de presentación, metadatos, número de maceta, guardado parcial y protección de ediciones.
- `src/features/catalog/PlantPrices.tsx`: listado público de presentaciones y precios.
- `tests/inventory-presentation.test.tsx`: recuperación, preservación, varios precios, cambios remotos, respuesta confirmada del servidor, errores y guardado duplicado.

Contratos coordinados en `workflow.ts`, `domain.ts`, backend, esquema público y editor; la integración visual del componente público se realiza en `App.tsx`.

## Comprobación

```bash
npm run test -- --run tests/inventory-presentation.test.tsx tests/admin-collections.test.tsx
npx eslint src/features/admin/Inventory.tsx src/features/catalog/PlantPrices.tsx tests/inventory-presentation.test.tsx
```

Resultado focalizado: 26 pruebas aprobadas (18 nuevas y 8 existentes) y lint aprobado. Utilizan datos sintéticos y funciones simuladas, sin conexión a Firebase ni IA. La revisión global de tipos, backend, build, emuladores y navegador corresponde a la validación conjunta de los cinco frentes; no debe inferirse de esta prueba focalizada.

Para revisar manualmente con datos de prueba: cargar una ficha con dos presentaciones, cambiar solo maceta y guardar, comprobar que precio/ubicación/cantidades se conservan; cambiar de presentación con cambios pendientes y revisar ambas opciones del diálogo; vaciar el precio explícitamente; publicar con y sin mostrar precio y comparar el catálogo. Confirmar que WhatsApp y el QR mantienen su comportamiento y que la vista se adapta a móvil.
