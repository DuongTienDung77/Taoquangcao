
export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const [mimeTypePart, base64Data] = reader.result.split(',');
        const mimeType = mimeTypePart.split(';')[0].split(':')[1];
        resolve({ base64: base64Data, mimeType });
      } else {
        reject(new Error('Failed to read file as data URL.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}
