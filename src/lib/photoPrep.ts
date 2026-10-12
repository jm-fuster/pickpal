/**
 * La foto que la dueña sube a un elemento de «Mi lista». Antes de subirla se
 * redibuja en un canvas: se reduce a 1200 px por el lado largo y se vuelve a
 * codificar en WebP (o JPEG si el navegador no sabe). Al redibujarla se pierden
 * los metadatos del archivo original, ubicación GPS incluida: el servidor solo
 * puede comprobar tipo y tamaño (`lists.setItemPhoto`), así que esto es lo que
 * evita que la ubicación de la foto acabe a la vista de quien lee la lista.
 */

export const MAX_PHOTO_SIDE = 1200;
/** Lo que se acepta del móvil antes de reducirla; la que se sube pesa mucho menos. */
export const MAX_INPUT_BYTES = 25_000_000;
/** Espejo del tope de `lists.setItemPhoto`. */
export const MAX_UPLOAD_BYTES = 1_500_000;

/** Medidas que caben en `max` sin deformar ni ampliar. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export type PhotoPrepError = "not-image" | "too-large" | "unreadable";

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** La foto lista para subir, o el motivo por el que no se puede. Solo en el navegador. */
export async function preparePhoto(file: File): Promise<Blob | PhotoPrepError> {
  if (!file.type.startsWith("image/")) return "not-image";
  if (file.size > MAX_INPUT_BYTES) return "too-large";
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return "unreadable";
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_PHOTO_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return "unreadable";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= MAX_UPLOAD_BYTES) return blob;
  }
  return "too-large";
}
