# Identidad y galerías — entrega de desarrollo

Esta entrega no publica ni despliega. Conserva las imágenes originales, los contactos,
la firma Powered by Vision Mind, las marcas existentes de fotografías y las URLs/IDs de las etiquetas QR.

## Cambios

- `src/app/theme.ts`: DM Sans para lectura y controles; Playfair Display para títulos
  principales. Ambas fuentes se sirven desde los paquetes locales existentes.
- `public/botanical-pattern.svg`: fondo botánico decorativo tenue con la paleta actual;
  no es un logo nuevo ni altera fotografías.
- `src/shared/gallery/ImageCarousel.tsx`: selección controlada, miniaturas, contador
  «Imagen 1 de 3», anterior/siguiente, flechas del teclado y Home/End. El swipe horizontal
  cambia de imagen; el gesto vertical conserva el scroll y no se fuerza reproducción.
- `PlantGallery.tsx` y `DraftPhotoGallery.tsx`: vista completa responsive con «Ver imagen»
  y «Descargar imagen». La descarga continúa usando `composeBrandedPhoto`: compone
  una copia con la marca existente sin sobrescribir el original.
- `PhotoManager.tsx`: una imagen seleccionada para editar descripción, ordenar, elegir
  portada, quitar o revisar mejora IA. La selección usa la identidad estable de la imagen.
- `PrivatePhoto.tsx`: las URLs de blobs privados se invalidan y revocan al cambiar de
  selección; una respuesta tardía no sustituye la imagen actual.
- `PlantSources.tsx`: separa evidencia marcada explícitamente como verificada, con URL
  HTTPS y fecha, de notas/referencias sin verificación. Los datos anteriores sin estado
  explícito no se convierten en evidencia verificada. Permite texto sin URL.
- `App.tsx`: integra las fuentes y los precios de la ficha pública mediante `PlantPrices`.
  El componente solo recibe el snapshot público; la autorización para publicar precios
  corresponde al contrato del backend de inventario.

## Casita y etiqueta con contacto — pendiente resuelto

La primera revisión no encontró el volante dentro del repositorio. Posteriormente se
localizó el original real fuera del checkout; se archivó sin cambios en
`assets/source/rinconcito-original.png`. La procedencia, hash y recorte reproducible se
documentan en `docs/ASSETS.md` y `assets/source/brand-provenance.json`.

El encabezado público y favicon usan `public/rinconcito-house.png`, obtenido mediante
recorte y máscara determinísticos, sin IA ni alteración de los píxeles retenidos. El
icono anterior sigue en las marcas de fotografías y la etiqueta compacta.

En **Admin → Etiquetas → Diseño de etiqueta**:

- **Compacta** sigue siendo la opción predeterminada: 60 × 50 mm, mínimo 50 × 45 mm.
- **Casita y contacto** usa el recorte original y dirección/WhatsApp confirmados:
  60 × 80 mm por defecto y como mínimo. El QR ocupa 30 mm; no lleva arte superpuesto.
- Cambiar el diseño propone sus medidas predeterminadas y conserva fichas/copias.
  Las medidas se pueden ajustar dentro de los límites. Una medida inválida bloquea
  impresión y descarga. La descarga con casita se distingue por `-casita.svg`.
- Ambas variantes usan la misma URL estable por ficha, corrección M y zona de silencio
  blanca de cuatro módulos. Las macetas de un mismo tipo siguen compartiendo QR.
- El SVG incorpora sus imágenes, permite descarga independiente e impresión/PDF al
  100 %. La información nueva se limita a «Cartago, Cervantes, El Descanso» y
  WhatsApp +506 7116 0290. No se añadieron promesas de envío.

## Verificación local

```bash
npm run test -- --run tests/image-carousel.test.tsx tests/admin-gallery.test.tsx tests/gallery.test.tsx
npm run lint
npm run typecheck
npm run build
```

Resultado en la copia cloud (16 de noviembre de 2026): 12 pruebas focalizadas aprobadas;
`npm run lint`, `npm run typecheck` (cliente y Functions) y `npm run build` aprobados.
El build conserva el aviso de tamaño de chunks mayor de 500 kB. No se realizaron
llamadas IA, despliegues ni capturas de navegador en esta entrega.

Las pruebas focalizadas cubren selección de una y varias imágenes, teclado, gesto
horizontal y vertical, prevención de apertura accidental tras swipe, reordenación,
exportación con marca, ciclo de URLs privadas y distinción de fuentes verificadas.
`tests/e2e/branding.spec.ts` conserva su validación de descarga, QR, móvil y escritorio;
también incluye la variante casita en móvil/escritorio, su SVG y la validación de tamaño. La ejecución visual en
navegador depende de un entorno que permita iniciar Chromium; no se debe confundir
la validación DOM con una captura de pantalla real.

Para revisar la interfaz en un navegador local sin servicios de producción: abrir el
catálogo demo y una ficha con varias imágenes en 390 px y 1440 px, usar miniaturas,
flechas y swipe, abrir/cerrar el modal y descargar una imagen. En los emuladores,
revisar dos imágenes de un borrador, cambiar la portada y comprobar que la descripción
y la imagen seleccionada siguen asociadas. La revisión final usa el mismo carrusel
sin modificar el borrador ni solicitar IA.


### Verificación del seguimiento de identidad

```bash
node scripts/derive-brand-assets.ts --check
npm run test -- --run tests/branding.test.ts tests/brand-provenance.test.ts tests/admin-collections.test.tsx
```

18 pruebas focalizadas aprobadas: procedencia y fidelidad de píxeles del recorte,
QR decodificable con ID normal y de 80 caracteres, URL compartida entre variantes,
zonas blancas, texto escapado, mínimos físicos, selección/copias conservadas y nombre
de descarga. TypeScript pasó tras integrar el selector. La prueba de interfaz usa mocks;
no representa impresión física ni lectura con cámara. La suite de navegador añade
casos para 320 y 1280 px, pendientes de un navegador conectado al entorno local.
La revisión de rasterización de SVG completos se documenta en el reporte de seguimiento.
