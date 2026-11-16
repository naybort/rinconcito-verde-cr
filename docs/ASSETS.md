# Recursos del diseño

Figma de origen: txoM85ZKmbKM0Qrh85IARl. Descargados desde el contexto de diseño autorizado. Ninguna URL temporal se usa en ejecución.

| Archivo local | Frame/nodo | Uso |
| --- | --- | --- |
| public/images/monstera.png | 1:84 / 1:143 | Primera tarjeta; contenido JSON |
| public/images/echeveria.png | 1:84 / 1:166 | Segunda tarjeta y detalle; contenido JSON |
| public/images/calathea.png | 1:84 / 1:189 | Tercera tarjeta y detalle; contenido JSON |
| public/images/monstera-detail.png | 1:2 / 1:3 | Hero Monstera |
| public/icons/back.svg | 1:2 / 1:7 | Volver sobre hero, 16×16 |
| public/icons/explore.svg | 1:84 / 1:88 | Navegación Catálogo, 20×20 |
| public/icons/favorite.svg | 1:84 / 1:144 | Control de favorito en tarjetas, 32,6667×38,2917 |
| public/icons/plus.svg | 1:2 / 1:56 | Añadir a favoritos, 14×14 |

Callsites: PlantCard.tsx, PlantPhoto.tsx y App.tsx. Fotos con object-fit cover centrado; SVG sin sobrescribir ancho/alto de raíz. Botones con área interactiva mínima de 44 px. Los assets de funciones fuera de alcance no se incluyen.

La verificación de geometría renderizada queda pendiente por la limitación de navegador documentada en VALIDATION.md. El origen Figma no sustituye confirmar derechos comerciales de las fotografías.

Fuentes: paquetes Fontsource DM Sans y Playfair Display; sus licencias se incluyen en los paquetes instalados por npm.

## Ícono de marca actualizado (12 noviembre 2026)
`public/rinconcito-icon.png`: derivado mediante edición generativa del flyer proporcionado por Bryan. Suculenta/maceta transparente sin datos de contacto. No es un recorte pixel-perfect. Se conserva para las marcas de fotografías y la etiqueta QR compacta; el encabezado público y favicon usan el recorte fiel descrito abajo. Pendiente sustituir imagen demo Calathea, que contiene elementos de una captura del diseño.


## Casita desde el original confirmado (16 noviembre 2026)

El volante original fue localizado fuera del repositorio, en el espacio de trabajo:
`/workspace/scratch/1ed15ac1c30d/El Rinconcito Verde_ Suculentas y Plantas.png`.
Esto resuelve el bloqueo descrito en la primera entrega de identidad.

- Original archivado **sin alterar bytes**: `assets/source/rinconcito-original.png`,
  RGBA, 1254 × 1254 px. No está en `public` ni se incorpora al sitio compilado.
- SHA-256 original: `bfafae49f455e39ebe84511e2ac45facd355463dbea902aa390681ddd2ebbf79`.
- Derivado: `public/rinconcito-house.png`, 530 × 530 px, recorte poligonal de casita,
  planta y fondo interior con margen transparente. Conserva exactamente los píxeles
  retenidos; no remuestrea, repinta, completa partes ni utiliza generación de IA.
- Uso: icono del encabezado público, favicon y variante de etiqueta «Casita y contacto».
- Script: `scripts/derive-brand-assets.ts`; geometría y hashes:
  `assets/source/brand-provenance.json`.
- Datos del volante usados en la etiqueta: «Cartago, Cervantes, El Descanso» y WhatsApp
  71160290, consistente con `src/config/business.json` (50671160290).
  No se añade texto ni promesa de envío a la plantilla.

Desde la raíz del repo:

```bash
node scripts/derive-brand-assets.ts --check  # comprueba procedencia, recorte y hash
node scripts/derive-brand-assets.ts          # reproduce el derivado desde la copia archivada
```

El script usa `pngjs`, dependencia ya presente; verifica el hash del original antes de
operar y nunca escribe el original. El recorte evita las letras y datos ajenos a la casita,
conservando la ilustración del usuario. El icono anterior continúa disponible para no
cambiar la marca de fotografías ni la composición compacta ya existente.
