/** Processa somente arquivos recém-selecionados, sem modificar fotos salvas. */
export async function compressPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a imagem.");
    let width = Math.min(1024, image.naturalWidth);
    let result = "";
    do {
      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * canvas.width / image.naturalWidth));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      result = canvas.toDataURL("image/jpeg", 0.7);
      if (photoBytes(result) <= 300 * 1024 || canvas.width === 1) break;
      width = Math.max(1, Math.floor(canvas.width * 0.85));
    } while (true);
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
}