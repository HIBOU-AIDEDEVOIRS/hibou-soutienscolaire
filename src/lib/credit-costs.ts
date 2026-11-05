export const TEXT_COST = 1;
export const VOICE_COST = 0.5;
export const IMAGE_SMALL_COST = 0.5;
export const IMAGE_LARGE_COST = 0.75;
/** Images strictly larger than this (bytes) cost IMAGE_LARGE_COST. */
export const LARGE_IMAGE_BYTES = 1024 * 1024;

export function imageCost(bytes: number) {
  return bytes > LARGE_IMAGE_BYTES ? IMAGE_LARGE_COST : IMAGE_SMALL_COST;
}

/** Approximate decoded size of a base64 data URL. */
export function dataUrlBytes(url: string) {
  const i = url.indexOf(",");
  if (!url.startsWith("data:") || i < 0) return 0;
  const b64 = url.slice(i + 1);
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

