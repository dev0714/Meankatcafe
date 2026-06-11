// Downscale + recompress large images in the browser before upload.
// Serverless upload routes cap the request body (~4.5MB), so print-ready
// PNGs/photos can fail. This keeps small images untouched and shrinks big
// ones to a sane size, well under the limit.
export async function compressImage(file: File, maxDim = 2000, quality = 0.85): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width: w0, height: h0 } = bitmap;

    // Small enough already — leave it as-is.
    if (w0 <= maxDim && h0 <= maxDim && file.size < 1_500_000) {
      bitmap.close?.();
      return file;
    }

    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bitmap.close?.(); return file; }
    // White backdrop so transparent PNGs don't go black when flattened to JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}
