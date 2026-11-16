import QRCode from 'qrcode';
import { plantUrl } from '../../../functions/src/domain';
import { identity } from '../../shared/brand/identity';

export const labelLimits = { minWidth: 50, maxWidth: 100, minHeight: 45, maxHeight: 150, maxCopies: 100 };
export const labelFormats = {
 compact: { name: 'Compacta', minWidth: 50, minHeight: 45, width: 60, height: 50 },
 house: { name: 'Casita y contacto', minWidth: 70, minHeight: 120, width: 80, height: 120 },
} as const;
export type LabelVariant = keyof typeof labelFormats;
export const labelQrOptions = { errorCorrectionLevel: 'M', margin: 4, width: 600, color: { dark: '#000000', light: '#ffffff' } } as const;
export type LabelPlant = { id: string; name: string };
const escapeXml = (text: string) => text.replace(/[<>&"']/g, value => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[value]!);

// Conservative character wrapping also handles long unbroken names. SVG text is escaped.
export function labelLines(text: string, limit: number): string[] {
 const lines: string[] = [];
 let current = '';
 for (const word of text.trim().split(/\s+/)) {
  if (current && current.length + word.length + 1 > limit) { lines.push(current); current = ''; }
  let rest = word;
  while (rest.length > limit) { lines.push(rest.slice(0, limit)); rest = rest.slice(limit); }
  current = current ? current + ' ' + rest : rest;
 }
 if (current) lines.push(current);
 return lines;
}

/** Physical mm, opaque white QR background and four-module quiet zone, with no overlays. */
export async function createLabelSvg(plant: LabelPlant, width: number, height: number, icon: string, variant: LabelVariant = 'compact'): Promise<string> {
 const format = labelFormats[variant];
 if (!format || !Number.isInteger(width) || width < format.minWidth || width > labelLimits.maxWidth || !Number.isInteger(height) || height < format.minHeight || height > labelLimits.maxHeight) throw new Error('Tamaño de etiqueta inválido.');
 const qr = await QRCode.toDataURL(plantUrl(plant.id), labelQrOptions);
 if (variant === 'house') return createHouseLabel(plant, width, height, icon, qr);
 const qrX = (width - 26) / 2;
 const nameLines = labelLines(plant.name, Math.floor((width - 6) / 1.25));
 const nameFont = Math.min(2.5, 5.4 / nameLines.length);
 const idLines = labelLines(plant.id, Math.floor((width - 6) / .85));
 const sideCenters = [qrX / 2, width - qrX / 2];
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
 <rect width="${width}" height="${height}" fill="#ffffff"/>
 <rect x=".4" y=".4" width="${width - .8}" height="${height - .8}" rx="1.8" fill="none" stroke="${identity.line}" stroke-width=".25"/>
 <g fill="${identity.ink}" font-family="Arial, sans-serif" text-anchor="middle">
 <text x="${width / 2}" y="4.2" font-size="2.3">${escapeXml(identity.name)}</text>
 ${sideCenters.map(x => `<path d="M${x} 9v5m0 11v5" stroke="${identity.line}" stroke-width=".35"/><image href="${icon}" x="${x - 3.5}" y="16" width="7" height="7"/>`).join('')}
 <image href="${qr}" x="${qrX}" y="6" width="26" height="26"/>
 ${nameLines.map((line, i) => `<text x="${width / 2}" y="${34 + i * nameFont * 1.08}" font-size="${nameFont}" font-weight="700">${escapeXml(line)}</text>`).join('')}
 ${idLines.map((line, i) => `<text x="${width / 2}" y="${height - 2.8 + i * 1.5 - (idLines.length - 1) * 1.5}" font-size="1.4">${escapeXml(line)}</text>`).join('')}
 </g></svg>`;
}

export function labelDataUrl(svg: string) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

/** The original house artwork and contact details stay outside the opaque QR quiet zone. */
function createHouseLabel(plant: LabelPlant, width: number, height: number, icon: string, qr: string) {
 const footerTop = height - 27;
 const nameTop = 69;
 const nameSpace = footerTop - nameTop - 2;
 let nameFont = 2.8;
 let nameLines = labelLines(plant.name, Math.floor((width - 10) / (nameFont * .95)));
 // Keep the entire plant name readable, including the supported 120-character names.
 while (nameLines.length * nameFont * 1.15 > nameSpace && nameFont > 2.2) {
  nameFont = Math.max(2.2, Math.round((nameFont - .1) * 10) / 10);
  nameLines = labelLines(plant.name, Math.floor((width - 10) / (nameFont * .95)));
 }
 const nameY = nameTop + (nameSpace - nameLines.length * nameFont * 1.15) / 2 + nameFont;
 const titleX = (width + 24) / 2;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
 <title>Etiqueta de ${escapeXml(plant.name)}</title>
 <desc>QR de la ficha ${escapeXml(plant.id)}. ${escapeXml(identity.location)}. WhatsApp ${escapeXml(identity.whatsappLocal)}. Facebook: ${escapeXml(identity.facebook)}. ${escapeXml(identity.delivery.join(' '))}.</desc>
 <rect width="${width}" height="${height}" fill="#ffffff"/>
 <rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="2" fill="none" stroke="#bf744d" stroke-width=".3"/>
 <path d="M3 28H${width - 3}" stroke="${identity.line}" stroke-width=".3"/>
 <image href="${icon}" x="3" y="2.5" width="24" height="24"/>
 <g fill="${identity.ink}" font-family="Arial, sans-serif" text-anchor="middle">
 <text x="${titleX}" y="9" font-size="3" letter-spacing=".2">EL RINCONCITO</text>
 <text x="${titleX}" y="14.5" font-size="3.8" font-weight="700">VERDE C.R.</text>
 <text x="${titleX}" y="20" font-size="2.2">Suculentas y plantas</text>
 <text x="${titleX}" y="23.2" font-size="2.2">ornamentales</text>
 <image href="${qr}" x="${(width - 34) / 2}" y="30" width="34" height="34"/>
 <text x="${width / 2}" y="67" font-size="2.2">Escaneá para conocer sus cuidados</text>
 ${nameLines.map((line, i) => `<text x="${width / 2}" y="${nameY + i * nameFont * 1.15}" font-size="${nameFont}" font-weight="700">${escapeXml(line)}</text>`).join('')}
 <path d="M5 ${footerTop}H${width - 5}" stroke="${identity.line}" stroke-width=".3"/>
 <text x="${width / 2}" y="${footerTop + 4}" font-size="2.4">${escapeXml(identity.location)}</text>
 <text x="${width / 2}" y="${footerTop + 9}" font-size="3" font-weight="700">WhatsApp ${escapeXml(identity.whatsappLocal)}</text>
 <text x="${width / 2}" y="${footerTop + 13.5}" font-size="2.4">Facebook: ${escapeXml(identity.facebook)}</text>
 <rect x="3" y="${height - 11}" width="${width - 6}" height="8.5" rx="1.6" fill="#edf0e5"/>
 ${identity.delivery.map((line, i) => `<text x="${width / 2}" y="${height - 7.6 + i * 3.2}" font-size="2.3">${escapeXml(line)}</text>`).join('')}
 </g></svg>`;
}
