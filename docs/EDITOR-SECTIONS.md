# Registro de plantas en tres secciones

Entrega local de desarrollo, sin publicación ni despliegue. El editor agrupa el registro en **Planta de catálogo**, **Inventario** y **Revisión final**. La navegación y el botón de guardar permanecen disponibles en las tres secciones.

## Uso y decisiones

- En Planta de catálogo se completan nombre, imágenes, categorías, descripción, cuidados y referencias. Identificación, contenido y mejora de imagen tienen asistencia opcional visible, con solicitudes explícitas. Escribir, cambiar fotos o guardar no genera IA.
- Las categorías se crean y editan en un diálogo dentro del editor. Una categoría nueva guardada se selecciona en el borrador. Los cambios de nombre y estado conservan el ID y afectan las otras fichas relacionadas. Se respeta la restricción existente: solo administradores gestionan categorías.
- Una plantilla de cuidados completa únicamente campos vacíos; conserva los cuidados y las referencias ya escritos.
- Las referencias admiten texto sin URL. Editar una fuente acreditada la convierte en referencia sin verificar. El servidor comprueba por separado la evidencia para conservar una verificación.
- Inventario mantiene movimientos separados del borrador. El número de maceta corresponde a una presentación. Los precios quedan privados por defecto y la autorización para mostrarlos se guarda y publica con la ficha.
- Revisión final ofrece un carrusel de todas las imágenes, contenido, referencias e indicación de visibilidad de precios. Guardar, enviar a revisión y publicar son acciones distintas; publicar exige revisar la versión guardada y confirmar la casilla. Modificar el borrador desmarca esa confirmación.
- La consulta por WhatsApp no modifica existencias. El ID y el QR siguen correspondiendo a la ficha de catálogo, compartidos por las macetas del mismo tipo.

## Recuperación compatible

Las nuevas copias locales llevan `flowVersion: 2`. Copias antiguas sin esta propiedad se migran así: fases 0–4 → Planta de catálogo (0), fase 5 → Inventario (1), fase 6 → Revisión final (2). En copias de versión 2 se conserva la sección actual. `assisted` se acepta para recuperar copias antiguas, sin controlar la visibilidad de asistencia.

Se conserva inventario incompleto y se agregan valores por defecto para `potNumber`, `presentationEdits`, `presentationContext` y `movementDirty`. El último permite proteger cantidades o tipos de movimiento editados aunque el motivo siga vacío, sin marcar como pendiente un movimiento ya confirmado. Las referencias incompletas permanecen recuperables; las fuentes antiguas sin clasificación se consideran no verificadas. `showPrice` es falso y `ai.contentJobId` es vacío cuando no existían.

## Archivos de este frente

- `src/features/admin/PlantEditor.tsx`: secciones, navegación, revisión, integración de galería, asistencia, inventario y categorías.
- `src/features/admin/CategoryInlineEditor.tsx`: diálogo de creación y edición.
- `src/features/admin/workflow.ts`: fases, recuperación de posición, inventario pendiente y validación de propuestas compatibles.
- `src/features/admin/recovery.ts`: lectura de copias locales antiguas e incompletas.
- `tests/admin-workflow.test.ts` y `tests/editor-sections.test.tsx`: migración y pruebas del flujo con mocks.
- `tests/admin-e2e/admin.spec.ts`: pruebas existentes migradas a tres secciones y controles de carrusel, más categorías y precios en móvil y escritorio.

## Verificación y revisión local

Se verificaron 14 pruebas de flujo/recuperación con mocks, lint focalizado y tipos del frontend. No se hicieron solicitudes de IA reales. Las pruebas de interfaz con Firebase requieren los emuladores aislados del proyecto; su ejecución integrada se registra con el resto de frentes.

```bash
npx vitest run tests/admin-workflow.test.ts tests/editor-sections.test.tsx
npx eslint src/features/admin/PlantEditor.tsx src/features/admin/CategoryInlineEditor.tsx src/features/admin/workflow.ts src/features/admin/recovery.ts tests/admin-workflow.test.ts tests/editor-sections.test.tsx tests/admin-e2e/admin.spec.ts
npm run test:admin
```

Para revisión manual, crear una ficha, completar campos manuales, crear una categoría y cambiar entre las tres secciones. Guardar el borrador, recargar y recuperar; comprobar que contenido y datos pendientes de inventario permanezcan. En Revisión final verificar la galería y los requisitos antes de enviar a revisión y publicar únicamente dentro de emuladores. Repetir en un ancho móvil y en escritorio. El entorno de producción no forma parte de esta entrega.
