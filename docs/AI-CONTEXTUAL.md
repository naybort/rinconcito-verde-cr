# IA contextual: desarrollo local

Esta entrega no despliega cambios ni ejecuta solicitudes pagas. Mantiene revisión humana y la posibilidad de completar toda la ficha manualmente.

## Operaciones

- **Identificación:** el administrador elige un nombre de referencia o de una a cuatro fotografías originales privadas de la misma ficha. Por nombre no se envía ninguna fotografía. El proveedor devuelve una sugerencia principal y hasta tres alternativas, con incertidumbre; el administrador elige un nombre. No se cambia la identificación al recibir la respuesta.
- **Contenido y cuidados:** requiere identificación confirmada y puede trabajar sin fotografía. Las categorías existentes se proponen mediante sus IDs. Los nombres de categorías nuevas se revisan en el editor antes de guardarse; no se crean como efecto de recibir una propuesta.
- **Mejora de imagen:** mantiene una fotografía original como entrada y una propuesta separada, con elección humana después de comparar. No admite un lote de fotografías.
- **Instrucciones:** cada operación conserva sus instrucciones opcionales. Abrir la guía, editar, dictar o guardar no inicia una generación. Cada llamada parte del botón de solicitar propuesta y respeta el cupo vigente.

## Aplicación por campo

Los campos vacíos con propuesta vienen seleccionados. Nombre, descripción, categorías, cada cuidado, advertencias y referencias pueden seleccionarse por separado. Cualquier campo con contenido humano exige marcar expresamente su casilla de reemplazo. Si se modifica un campo después de marcarlo, la selección anterior se invalida y debe revisarse nuevamente.

La aplicación conserva todos los campos sin seleccionar. Las propuestas de otra revisión, otro nombre confirmado o fotografías retiradas quedan disponibles para consulta sin aplicarse. Los trabajos de contenido de la misma revisión permiten seguir escribiendo mientras llegan: la selección por campo preserva esas ediciones.

Al aceptar fuentes se guarda `ai.contentJobId`; el servidor comprueba la procedencia contra la propuesta final, ficha, revisión y nombre confirmado. El estado del cliente no puede convertir una referencia arbitraria en verificada.

## Fuentes

Una URL se marca `verified` únicamente si aparece en anotaciones de cita o metadatos de búsqueda de la respuesta del proveedor. La fecha de consulta proviene del procesamiento, no de la fecha propuesta por el modelo. La etiqueta `verification` que envíe el modelo no aporta evidencia.

Una referencia sin evidencia se conserva como texto `unverified`: se retiran la URL no acreditada y los enlaces incrustados en su título. Se acepta texto sin URL y una lista de fuentes vacía. La interfaz separa «Fuentes verificadas» de «Referencias sin verificar». El administrador debe revisar las recomendaciones; la existencia de una URL citada no sustituye esa revisión.

## Dictado opcional: supuesto pendiente de confirmación

Se implementa dictado progresivo mediante SpeechRecognition del navegador cuando está disponible. **Esta elección de interfaz sigue siendo un supuesto sujeto a confirmación de Bryan.** El dictado comienza solo al pulsar «Dictar instrucciones», no usa la clave de OpenAI y no activa una generación. El servicio de reconocimiento y su procesamiento dependen del navegador.

El texto reconocido se muestra en un campo editable. Solo «Agregar dictado al texto» lo agrega a las instrucciones, respetando el máximo de 2000 caracteres. Denegar el micrófono o usar un navegador incompatible conserva la alternativa escrita. Al salir del componente se cancela la captura. Las pruebas sustituyen SpeechRecognition con un simulador; no se activó un micrófono real.

## Archivos de esta entrega

- `src/features/admin/AIAssistant.tsx`: selección de entradas, candidatos, categorías y revisión por campo.
- `src/features/admin/proposalSelection.ts`: reglas de selección y composición del parche del borrador.
- `src/features/admin/DictationInput.tsx`: dictado editable y alternativa manual.
- `functions/src/ai.ts`: solicitudes por nombre o varias fotos e instrucciones delimitadas.
- `functions/src/aiResponse.ts`: formato cerrado, validación y evidencia de fuentes.
- `functions/src/aiErrors.ts`: mensaje correspondiente a categorías fuera de catálogo.
- `tests/ai.test.ts`, `tests/ai-response.test.ts`, `tests/ai-assistant.test.tsx`, `tests/ai-dictation.test.tsx`: transporte y navegador simulados.

Los contratos compartidos y la validación transaccional del servidor están en `functions/src/domain.ts`, `functions/src/index.ts`, `functions/src/sourceTrust.ts`; la integración en las tres secciones está en `PlantEditor.tsx` y `workflow.ts`.

## Verificación

```bash
npx vitest run tests/ai.test.ts tests/ai-response.test.ts tests/ai-assistant.test.tsx tests/ai-dictation.test.tsx
npm run typecheck
npm run lint
```

Las pruebas cubren entradas por nombre y cuatro fotos, rechazo de límites antes del proveedor, candidatos explícitos, ausencia de llamadas automáticas, edición humana concurrente, propuestas vencidas, creación revisable de categorías, separación de referencias, fechas normalizadas, salidas inválidas, instrucciones no confiables y dictado con revisión manual. Las solicitudes usan transporte simulado: estas pruebas no certifican disponibilidad, precios, comportamiento en vivo del modelo ni permisos de producción.
