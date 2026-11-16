# Seguimiento de la entrega local — 16 de noviembre de 2026

La implementación de los cinco frentes existe en la aplicación y en el backend. **Ninguno se declara validado de extremo a extremo**: quedan verificaciones de navegador, transporte callable y servicios reales que no se completaron en este entorno. No hay un bloqueo de aprobación para continuar trabajo local. Se conserva el límite de esta entrega: sin Mac, nuevas credenciales, IA paga, publicación ni despliegue.

La entrega inicial es el commit local `e75be7bdc5fcd59d5611c1f40b4dc7f9d0b72de6`; este seguimiento se agrega como otro commit de la misma rama `work/five-fronts-20261116`. El manifiesto externo de la nueva entrega registra el SHA final. La copia anterior y el primer bundle/parche se conservan.

## Estado por frente

| Frente | Implementación real | Evidencia disponible | Incompleto o pendiente de verificación |
| --- | --- | --- | --- |
| 1. Registro | Editor en Planta de catálogo, Inventario y Revisión final; asistencia opcional siempre disponible; categorías en contexto; borradores antiguos y guardias de salida; revisión antes de publicar | Pruebas DOM de secciones/recuperación y reglas de navegación; integración de guardado/publicación con servicios emulados | Falta recorrer el flujo completo en navegador a 320/390/1280 px y revisar legibilidad/foco. No se ha certificado la experiencia visual |
| 2. IA contextual | Backend para nombre o 1–4 fotos; candidatos; instrucciones por operación; aplicación por campo; protección de edición humana; categorías sugeridas; dictado editable y alternativa escrita; referencias verificadas solo con evidencia | Pruebas DOM, contratos y parser; worker y cuotas sobre Firestore emulado, con transporte OpenAI simulado | IA real no ejecutada: disponibilidad/calidad de respuesta y metadatos de fuentes no certificados. Micrófono real no probado. Dictado del navegador es supuesto de producto pendiente de revisión; entrada manual funciona sin él |
| 3. Inventario | Maceta por presentación; varias presentaciones con precios; guardados parciales; publicación explícita de precios y retiro al desautorizar; WhatsApp sin descuento; QR por ficha | Pruebas de edición, recuperación y errores; transacciones y proyección pública con emuladores verifican cantidades conservadas y datos privados excluidos | Pendiente revisión visual de selección/edición y precios en el detalle público. Confirmar en revisión de producto que maceta sigue siendo atributo de presentación, no identificador de unidad |
| 4. Identidad y galerías | Tipografía y fondo; carrusel público/admin, swipe, teclado y descarga con marca; casita original como icono público/favicon; variante QR Casita y contacto, compacta conservada | Pruebas DOM de galerías; procedencia píxel a píxel; tres etiquetas completas renderizadas a 300 dpi y QR decodificados; revisión visual de esas imágenes | Ya no falta la imagen original. Faltan capturas de las pantallas, ver el favicon en navegador, impresión física/escaneo con cámara y revisión táctil real. El raster de etiqueta no sustituye esas pruebas |
| 5. Pantalla de carga | Backoffice de título/subtítulo, animaciones seguras y tips revisados/activos; generación explícita; GET público sanitizado; tip aleatorio estable, fallback y mínimo de 3 s; loader privado preservado | Pruebas DOM y contratos; integración de guardado/concurrencia/proyección pública; GET probado por HTTP Express local; sugerencias IA simuladas | Falta revisar animación y formulario en navegador. Endpoint no desplegado ni validado por Cloud Run/IAM. Calidad de sugerencias con IA real no comprobada |

No quedan requisitos de código identificados como ausentes dentro del alcance acordado. Esto describe implementación, **no certificación en producción**. Los mocks sustituyen proveedores, micrófono y parte del transporte en las pruebas; no son el mecanismo de las funciones implementadas para uso real.

## Verificaciones de este seguimiento

- `npm run check`: lint, tipos de frontend/Functions, **310 pruebas / 33 archivos**, catálogo y build.
- `node scripts/derive-brand-assets.ts --check`: original y derivación coinciden con los hashes registrados; los píxeles conservados no se alteran.
- [Tres etiquetas completas](qa/identity-followup/README.md): SVG reales de 60×80 mm (normal y extrema) y 50×45 mm (compacta extrema), rasterizados por Inkscape a 300 dpi. jsQR leyó las tres imágenes completas sin recortar el QR. Se revisó composición y márgenes visualmente.
- La suite de **30 pruebas con Auth, Firestore y Storage emulados + handlers directos** pasó en la entrega inicial. No se repitió en este seguimiento: no cambian backend, reglas ni dependencias. El proveedor IA está simulado; no demuestra el transporte callable.
- Ninguna llamada IA paga, credencial nueva ni operación de publicación/despliegue.

## Original recuperado

La afirmación inicial de que faltaba la imagen era incompleta: el archivo estaba en la carpeta general del entorno, fuera del checkout. Se conserva exactamente en `assets/source/rinconcito-original.png`, SHA-256 `bfafae49f455e39ebe84511e2ac45facd355463dbea902aa390681ddd2ebbf79`.

El script `scripts/derive-brand-assets.ts` aplica un recorte y máscara determinísticos, sin generación de IA ni remuestreo. El resultado es `public/rinconcito-house.png`; se usa en encabezado público y favicon. La variante QR agrega solo dirección y WhatsApp visibles en el original y compatibles con los contactos existentes. No agrega condiciones de envío.

## Bloqueos observados y acción precisa

1. **Navegador local:** Chromium no inicia por `socket() failed: Operation not permitted`. **Alternativa cloud:** Vite sí inició en `127.0.0.1:4173`, pero el navegador cloud devolvió `ERR_CONNECTION_REFUSED`. El servidor de revisión se cerró. No se publicó la aplicación ni se creó un túnel para evitar la restricción. Las imágenes de etiquetas son renders de SVG, no capturas de la aplicación.
2. **Functions emulado:** socket interno `fire_emu_*.sock` rechazado con `EPERM`. La alternativa `--direct` prueba los mismos handlers y servicios de datos, pero no el gateway callable ni su verificación de tokens/App Check.
3. **Acción pendiente en un entorno permitido:** abrir una copia nueva desde el bundle, instalar dependencias y ejecutar, de forma secuencial, `npm run test:emulators`, `npm run test:admin` y `npm run test:e2e`. Las suites usan proyecto demo/proveedor simulado y no requieren IA paga. No ejecutar `verify:online` ni `release:online` para esta revisión, pues pertenecen al flujo de producción.

Si Chrome está instalado en la ruta habitual de macOS, los dos últimos comandos pueden usar:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:admin
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

La revisión subjetiva de Bryan puede concentrarse en orden de registro, significado de maceta, dictado opcional e identidad visual. No hace falta su aprobación adicional para corregir fallos locales que aparezcan. Probar modelos reales o publicar requerirá un alcance posterior autorizado; no es necesario para continuar la revisión local.
