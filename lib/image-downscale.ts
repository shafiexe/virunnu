// Shrinks a phone photo before it is uploaded: a 12-megapixel picture is several MB, far more than a bill needs to be read.
export async function downscaleToJpeg(file: File, maxSide = 1600, quality = 0.82): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { base64: canvas.toDataURL("image/jpeg", quality).split(",")[1], mediaType: "image/jpeg" };
}
