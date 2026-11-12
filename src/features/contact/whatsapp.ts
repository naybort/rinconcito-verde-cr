import type { Plant } from '../catalog/schema';
export const MAX_URL_LENGTH = 2000;
export function buildMessage(plants: Plant[], intro: string): string {
 const unique = [...new Map(plants.map(p => [p.id, p])).values()];
 return unique.length ? intro + '\n' + unique.map(p => '• ' + p.name).join('\n') : '';
}
export function buildWhatsAppLink(number: string, message: string): { href: string | null; reason: string } {
 if (!message.trim()) return { href: null, reason: 'Agregá una planta a favoritos para preparar tu consulta.' };
 if (!/^[1-9]\d{7,14}$/.test(number)) return { href: null, reason: 'El contacto por WhatsApp estará disponible cuando el vivero confirme su número.' };
 const href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
 if (href.length > MAX_URL_LENGTH) return { href: null, reason: 'La consulta es demasiado extensa. Reducí tu selección antes de continuar; no se omitió ninguna planta del mensaje.' };
 return { href, reason: '' };
}
