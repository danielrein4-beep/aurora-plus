/**
 * Reduce el tamaño de una foto ANTES de mandarla a la IA (OCR de facturas) —
 * un teléfono moderno toma fotos de 8-15 MB en 4000px+ de ancho, y ni la
 * subida ni la lectura de Gemini necesitan esa resolución para leer texto
 * impreso. Achicar a ~1600px de lado máximo en JPEG calidad 82% recorta el
 * tamaño del archivo en 80-95% típicamente, sin perder legibilidad, y
 * acelera bastante la respuesta. No toca PDFs — solo tiene sentido para
 * imágenes. Compartido entre todos los módulos que suben fotos de factura
 * (Horeca, Comercio, etc.) para no duplicar esta lógica por vertical.
 */
export async function comprimirImagenFactura(archivo: File): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  const LADO_MAXIMO = 1600;
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    if (escala >= 1 && archivo.size < 1_500_000) return archivo; // ya es chica, no vale la pena reprocesar
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo; // si algo falla comprimiendo, se sube la original tal cual
  }
}
