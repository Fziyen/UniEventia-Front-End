import imageCompression from "browser-image-compression";

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png"]);

export async function compressImage(file, options = {}) {
  if (!file || !COMPRESSIBLE_TYPES.has(file.type)) return file;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      initialQuality: 0.82,
      useWebWorker: true,
      ...options,
    });

    if (compressedFile.size >= file.size) return file;

    return new File([compressedFile], file.name, {
      type: compressedFile.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn(
      "Image compression failed; uploading the original file.",
      error,
    );
    return file;
  }
}
