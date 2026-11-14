/**
 * Prepara fotos "Antes e Depois" para o PDF: recorte quadrado centralizado
 * (equivalente a object-fit: cover), no máximo 1200 x 1200 px, sem ampliar
 * fotos menores, orientação EXIF corrigida e um único redimensionamento a
 * partir da imagem original, exportado em JPEG 0,92 (PNG quando há transparência).
 */
export const FOTO_QUADRADA_MAX = 1200;

/** Lado do quadrado final: menor lado da original, limitado a 1200 px (nunca amplia). */
export function ladoQuadrado(w: number, h: number, max = FOTO_QUADRADA_MAX): number {
  return Math.max(1, Math.min(max, Math.floor(Math.min(w, h))));
}

/** Região de recorte centralizada na imagem original. */
export function recorteCentral(w: number, h: number) {
  const s = Math.min(w, h);
  return { sx: Math.floor((w - s) / 2), sy: Math.floor((h - s) / 2), s };
}

async function carregar(src: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const blob = await (await fetch(src)).blob();
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch { /* cai para <img>, que também respeita EXIF nos navegadores atuais */ }
  }
  return await new Promise((ok, err) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = err;
    img.src = src;
  });
}

export async function fotoQuadrada(src: string): Promise<string> {
  if (typeof document === "undefined" || !src) return src;
  try {
    const img = await carregar(src);
    const w = "naturalWidth" in img ? img.naturalWidth : img.width;
    const h = "naturalHeight" in img ? img.naturalHeight : img.height;
    const { sx, sy, s } = recorteCentral(w, h);
    const lado = ladoQuadrado(w, h);
    const canvas = document.createElement("canvas");
    canvas.width = lado; canvas.height = lado;
    const ctx = canvas.getContext("2d");
    if (!ctx) return src;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const png = src.startsWith("data:image/png");
    if (!png) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, lado, lado); }
    ctx.drawImage(img, sx, sy, s, s, 0, 0, lado, lado);
    if ("close" in img) img.close();
    return png ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return src;
  }
}

export async function fotosQuadradas(lista: string[] = []): Promise<string[]> {
  return Promise.all(lista.filter(Boolean).map(fotoQuadrada));
}
