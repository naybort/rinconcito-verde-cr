# SPEC-001 — primera base independiente

Fuente: https://app.notion.com/p/416a6fbe3ed68199b404e5f4bd2092d0
Figma: https://www.figma.com/design/txoM85ZKmbKM0Qrh85IARl/Rinconcito-Verde-CR?node-id=0-1

## Alcance aplicado

La instrucción posterior autorizó implementar detalle además de catálogo y favoritos; por eso se incluyen descripción y fotografía de detalle opcionales en el contrato JSON. Son datos de demostración, no nuevas funciones de perfil o guía. Se conserva intacto el repositorio antiguo.

React + TypeScript + Vite + MUI/Emotion. Estado compartido local React; JSON compilados; adaptador defensivo para localStorage; generador puro del mensaje/enlace. No hay backend ni servicios autenticados.

## Correspondencia de criterios

- CAT-01: tres plantas proceden únicamente de plants.json; integración comprueba cantidad.
- CAT-02: validador comprueba versión, requeridos, IDs, duplicados, categorías e imágenes.
- CAT-03: estados vacío y foto fallida implementados. Foto fallida cubierta en integración; catálogo vacío aceptado por contrato.
- FAV-01: guardar/quitar con aria-pressed y almacenamiento de IDs, probado.
- FAV-02: rehidratación cubierta en integración; recarga real en navegador pendiente E2E.
- FAV-03: IDs retirados, corrupción, versión desconocida y escritura bloqueada probados.
- WA-01/02: generador probado con lista sin duplicados y caracteres especiales.
- WA-03: enlace requiere acción explícita; no hay envío ni creación de pedido.
- WA-04: sin favoritos no hay consulta; número vacío mantiene control deshabilitado.
- UI-01: diseño responsive implementado, prueba automatizada preparada; geometría/teclado real y revisión visual pendientes.
- SCOPE-01: no hay pagos, autenticación, perfil ni guía editorial.

## Decisiones de implementación

- Consulta con todos los favoritos vigentes; no selección parcial ni cantidades.
- Límite conservador de URL de 2.000 caracteres; se muestra aviso en vez de truncar. No se presenta como límite universal de WhatsApp.
- Navegación hash y enlaces reales para catálogo, detalle y favoritos.
- Favoritos eliminados del catálogo no se muestran ni se incluyen en el mensaje.
- Fuentes servidas localmente por Fontsource.
- Imagen y texto de descripción son contenido dinámico JSON.
- No se cargan secretos o claves.
- Catálogo real, teléfono, permisos de imágenes, dominio y publicación siguen pendientes.

## Diseño aplicado y diferencias deliberadas

Frames: catálogo 1:84 y detalle 1:2. Se obtuvieron código contextual y capturas de referencia. Paleta #f9f9f8, #012d1d, #2c694e, #aeeecb; tarjetas de 16 px de radio; imágenes de catálogo de 256 px; detalle con hero móvil de 530 px y contenido superpuesto 48 px.

Se conservan las imágenes de las tres tarjetas y el hero de Monstera como archivos locales. Los iconos de volver, explorar, favorito y añadir conservan dimensiones originales SVG. Ver ASSETS.md.

Se adapta Botanica a Rinconcito Verde CR, se añade aviso Demo y se reduce navegación a Catálogo/Favoritos. Las etiquetas de cuidados y el panel de cuidados del detalle se omiten por no estar confirmados. No se implementan controles de búsqueda ni filtros sin acuerdo de alcance. La pantalla de favoritos completa el flujo pedido y no tiene frame específico en el Figma.

El catálogo del Figma usa Liberation Serif y el detalle Playfair Display/DM Sans. Se mantiene serif en tarjetas con alternativa Georgia y se empaquetan Playfair/DM Sans para el resto. Puede variar el aspecto de tarjetas según la fuente serif disponible en Mac. La imagen original Calathea ya contiene pequeños textos gráficos; se conserva sin editar para esta demo. Sustituir con fotografía comercial limpia antes de entrega final.

Esta es una adaptación funcional al alcance, no una afirmación de equivalencia píxel a píxel.


## Ampliación autorizada — 12 noviembre 2026
Bryan autorizó búsqueda, filtros V1 y cuidados. Se incorpora búsqueda por nombre insensible a tildes/mayúsculas y filtro único por categoría, con limpieza y estado vacío. Conserva estado al volver desde detalle durante la sesión. Cuidados por planta en JSON (luz, riego, humedad, temperatura), identificados como ejemplos orientativos. WhatsApp confirmado: +506 71160290, consulta de planta individual y favoritos sin IDs internos. Footer Powered by Vision Mind enlaza a https://visionmind-ai.com/. Tipografía unificada DM Sans y copies revisados. Ícono suministrado por Bryan. Sin cuentas, pagos, guía editorial independiente ni publicación remota.

## Ajuste final autorizado
Por corrección explícita de Bryan se conservan las tres plantas y fotos de prueba. Se retira solo aviso/badge demo. Footer debajo del menú no fijo y sin superposición; iconos nuevos de corazón y cuidados. Datos reales vendrán después.
