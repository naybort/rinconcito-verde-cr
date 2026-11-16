# Evidencia de etiquetas completas

Estas imágenes son renders de los SVG reales de etiquetas. **No son screenshots de la aplicación ni pruebas de impresión física.**

| Archivo | Tamaño físico | Caso | Resultado |
| --- | --- | --- | --- |
| [house-normal.png](house-normal.png) / [SVG](house-normal.svg) | 60×80 mm | Sansevieria, variante Casita y contacto | QR decodificado: `https://rinconcito-verde-cr.web.app/#/plantas/sansevieria` |
| [house-long.png](house-long.png) / [SVG](house-long.svg) | 60×80 mm | Nombre de 120 caracteres, ID de 80 | QR con ID completo decodificado |
| [compact-long.png](compact-long.png) / [SVG](compact-long.svg) | 50×45 mm | Nombre de 120 caracteres, ID de 80, compacta mínima | QR con ID completo decodificado |

Se generaron con `createLabelSvg` de `src/features/admin/labelTemplate.ts`, cargado mediante Vite SSR sin servidor de red. Los PNG se exportaron con Inkscape a 300 dpi. `jsqr` y `pngjs` decodificaron cada PNG **completo**, sin extraer ni reemplazar el QR. Los valores, dimensiones y SHA-256 están en [verification.json](verification.json).

Revisión visual realizada: la casita y contacto quedan fuera del QR; los nombres e IDs extremos permanecen dentro de sus bloques; no hay arte sobrepuesto al QR. La zona de silencio de cuatro módulos se comprueba también en las pruebas del template. Se conserva la URL por ficha y no se agrega un QR por unidad/maceta.

Para repetir la rasterización desde un SVG guardado:

```bash
inkscape docs/qa/identity-followup/house-normal.svg --export-type=png --export-dpi=300 --export-filename=/tmp/house-normal-review.png
```

Inkscape terminó con código 0; emitió avisos de integración GTK/Pango que no impidieron exportar ni decodificar. La lectura física debe comprobarse con una impresión al 100 % y cámara antes de producir etiquetas en cantidad.
