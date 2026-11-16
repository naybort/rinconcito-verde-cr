# Etiqueta de casita y contacto

En **Administrador → Etiquetas**, seleccionar las fichas y elegir **Casita y contacto**. El tamaño recomendado es **80 × 120 mm** y el mínimo es **70 × 120 mm**. La opción Compacta conserva su diseño y sus dimensiones anteriores. Cambiar de diseño conserva fichas y copias, y restablece el tamaño recomendado del diseño elegido.

La etiqueta reutiliza `public/rinconcito-house.png`, derivado y verificado contra `assets/source/rinconcito-original.png`; no se modificaron imágenes de marca. Incluye el nombre de la planta, Cartago, Cervantes, El Descanso; WhatsApp 71160290; Facebook El Rinconcito Verde C.R.; y servicio a domicilio o por Correos de Costa Rica a todo el país. Estos datos están centralizados en `src/shared/brand/identity.ts`.

El QR de 34 mm mantiene `plantUrl(id)`, fondo blanco opaco, margen de cuatro módulos y corrección M. La URL y el código son iguales en ambos diseños: todas las macetas de una ficha comparten QR. No se insertan logos ni texto dentro del código. El nombre completo se distribuye en líneas, con fuente mínima de 2,2 mm para los nombres admitidos por el catálogo. El ID permanece en la URL y en los metadatos del SVG; se prioriza el nombre legible en la etiqueta.

La descarga SVG incluye los recursos de imagen. Para imprimir o guardar PDF, elegir **100 % / tamaño real**, sin encabezados ni pies del navegador. Comprobar una etiqueta física con el teléfono antes de imprimir el lote: la validación digital no sustituye probar el papel, tinta e impresora reales.

## Verificación local

- `npm run check`: lint, tipos frontend/backend, 310 pruebas en 33 archivos, validación del catálogo y build correctos. Persiste el aviso conocido de tamaño del bundle administrativo.
- Diez pruebas Playwright seleccionadas: etiquetas compactas y de contacto en 320 y 1280 px, descarga SVG, copias, tamaños inválidos, recuperación de fallo del icono y catálogo público en 320, 390, 768 y 1280 px. El diseño de contacto también se volvió a comprobar tras añadir la aserción de desbordamiento con el ancho predeterminado.
- Comprobación de cajas de texto SVG: dentro de la etiqueta y fuera del QR, para nombre normal a 80 mm y nombre largo/ID de 80 caracteres a 70 mm.
- PDF individual y PDF A4 con ocho etiquetas en dos páginas, renderizados a 300 dpi e inspeccionados. Decodificadas las dos muestras individuales y las ocho etiquetas del lote; todas apuntan a la ficha correcta. Chromium redondea el tamaño de página PDF unas décimas de milímetro; la composición SVG usa medidas físicas en mm.
- Las pruebas usaron únicamente fixtures y un puerto aislado, sin Firebase, secretos, llamadas IA, cambios de datos, reinicios de emuladores ni despliegues.

Las pruebas del diseño se encuentran en `tests/branding.test.ts`, `tests/admin-collections.test.tsx` y los casos de etiquetas de `tests/e2e/branding.spec.ts`.
