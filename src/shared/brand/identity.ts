import business from '../../config/business.json';

// One existing asset and palette for the web frame, image exports and labels.
export const identity = {
 name: business.name,
 icon: '/rinconcito-icon.png',
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

let iconData: Promise<string> | undefined;
export function brandIconData(): Promise<string> {
 return iconData ??= fetch(identity.icon).then(async response => {
  if (!response.ok) throw new Error('No se pudo cargar el ícono de marca.');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = () => resolve(String(reader.result));
   reader.onerror = () => reject(new Error('No se pudo preparar el ícono de marca.'));
   reader.readAsDataURL(blob);
  });
 }).catch(error => { iconData = undefined; throw error; });
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
