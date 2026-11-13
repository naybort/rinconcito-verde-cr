import QRCode from 'qrcode';
import { plantUrl } from '../../../functions/src/domain';
import { identity } from '../../shared/brand/identity';

export const labelLimits = { minWidth: 50, maxWidth: 100, minHeight: 45, maxHeight: 150, maxCopies: 100 };
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
export async function createLabelSvg(plant: LabelPlant, width: number, height: number, icon: string): Promise<string> {
 if (!Number.isInteger(width) || width < 50 || width > 100 || !Number.isInteger(height) || height < 45 || height > 150) throw new Error('Tamaño de etiqueta inválido.');
 const qr = await QRCode.toDataURL(plantUrl(plant.id), labelQrOptions);
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
