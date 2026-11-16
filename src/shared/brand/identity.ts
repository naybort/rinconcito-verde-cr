import business from '../../config/business.json';

// Preserve existing compositions; the public house icon is a faithful crop of the original flyer.
export const identity = {
 name: business.name,
 icon: '/rinconcito-icon.png',
 houseIcon: '/rinconcito-house.png',
 location: 'Cartago, Cervantes, El Descanso',
 facebook: 'El Rinconcito Verde C.R.',
 delivery: ['Servicio a domicilio o por', 'Correos de Costa Rica a todo el país'],
 whatsappLocal: business.whatsappNumber.replace(/^506/, ''),
 whatsapp: business.whatsappNumber.replace(/^506(\d{4})(\d{4})$/, '+506 $1 $2'),
 ink: '#2c694e',
 paper: '#f9f9f8',
 line: '#ccd8d0',
} as const;

export function loadImage(src: string): Promise<HTMLImageElement> {
 return new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
  image.src = src;
 });
}

const iconData = new Map<string, Promise<string>>();
export function brandIconData(variant: 'compact' | 'house' = 'compact'): Promise<string> {
 const path = variant === 'house' ? identity.houseIcon : identity.icon;
 const cached = iconData.get(path);
 if (cached) return cached;
 const data = fetch(path).then(async response => {
  if (!response.ok) throw new Error('No se pudo cargar el ícono de marca.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = () => resolve(String(reader.result));
   reader.onerror = () => reject(new Error('No se pudo preparar el ícono de marca.'));
   reader.readAsDataURL(blob);
  });
 }).catch(error => { iconData.delete(path); throw error; });
 iconData.set(path, data);
 return data;
}

export function downloadBlob(blob: Blob, name: string) {
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = name;
 document.body.append(link);
 link.click();
 link.remove();
 window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
