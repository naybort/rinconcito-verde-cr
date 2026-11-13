import { identity, loadImage } from './identity';

/** Add a separate margin and signature strip; never paint over or crop source pixels. */
export function photoLayout(width: number, height: number) {
 const scale = Math.min(1, 2400 / Math.max(width, height));
 const photoWidth = Math.max(1, Math.round(width * scale));
 const photoHeight = Math.max(1, Math.round(height * scale));
 const inset = Math.max(8, Math.round(photoWidth * .012));
 const strip = Math.max(42, Math.round(photoWidth * .065));
 return { photoWidth, photoHeight, inset, strip, width: photoWidth + 2 * inset, height: photoHeight + 2 * inset + strip };
}

export async function composeBrandedPhoto(src: string): Promise<Blob> {
 const [photo, icon] = await Promise.all([loadImage(src), loadImage(identity.icon)]);
 const layout = photoLayout(photo.naturalWidth, photo.naturalHeight);
 const { width, height, photoWidth, photoHeight, inset, strip } = layout;
 const canvas = document.createElement('canvas');
 canvas.width = width; canvas.height = height;
 const ctx = canvas.getContext('2d');
 if (!ctx) throw new Error('Este navegador no permite preparar la descarga.');
 ctx.fillStyle = identity.paper; ctx.fillRect(0, 0, width, height);
 ctx.drawImage(photo, inset, inset, photoWidth, photoHeight);
 const centerY = inset + photoHeight + strip / 2;
 const fontSize = Math.min(strip * .24, width / 18);
 ctx.font = `${fontSize}px sans-serif`;
 const iconSize = strip * .62;
 const textWidth = ctx.measureText(identity.name).width;
 const start = (width - iconSize - fontSize * .6 - textWidth) / 2;
 const iconScale = Math.min(iconSize / icon.naturalWidth, iconSize / icon.naturalHeight);
 ctx.drawImage(icon, start, centerY - icon.naturalHeight * iconScale / 2, icon.naturalWidth * iconScale, icon.naturalHeight * iconScale);
 ctx.fillStyle = identity.ink; ctx.textBaseline = 'middle';
 ctx.fillText(identity.name, start + iconSize + fontSize * .6, centerY);
 ctx.strokeStyle = identity.line; ctx.lineWidth = Math.max(1, width / 1000);
 ctx.strokeRect(inset / 2, inset / 2, width - inset, height - inset);
 ctx.beginPath(); ctx.moveTo(inset * 2, centerY); ctx.lineTo(Math.max(inset * 2, start - inset), centerY);
 ctx.moveTo(width - start + inset, centerY); ctx.lineTo(width - inset * 2, centerY); ctx.stroke();
 return new Promise((resolve, reject) => {
  try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la descarga.')), 'image/png'); }
  catch { reject(new Error('La imagen no permite descargarse desde este navegador. Podés seguir viéndola en la ficha.')); }
 });
}
