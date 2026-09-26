/**
 * CrochetCalc (PuntoPerfecto) - File helpers
 * Utilidades del navegador para procesar imágenes y descargar archivos.
 */

/**
 * Comprime y convierte una imagen File a DataURL Base64 para guardarla en LocalStorage
 */
export function processImageFile(file, maxWidth = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Error al procesar la imagen seleccionada.'));
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
  });
}

/**
 * Descarga un objeto como archivo JSON
 */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
