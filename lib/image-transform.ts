import type { CSSProperties } from "react";
import type { ImageTransform } from "./cats";

// Turns a stored transform into the inline <img> style used everywhere the photo
// is shown (cards, modal, admin thumbnails, the crop editor) so the framing is
// identical on the admin and the public site. The <img> must fill a container
// with `overflow: hidden`.
export function transformToStyle(t: ImageTransform | null | undefined): CSSProperties {
  const x = t?.x ?? 50;
  const y = t?.y ?? 50;
  const zoom = t?.zoom ?? 1;
  return {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${zoom})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

// Clamp/validate an incoming image transform. Returns null for "no transform"
// (or an identity transform), so we never persist garbage from the client.
export function sanitizeTransform(value: unknown): ImageTransform | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const zoom = Number(v.zoom);
  const x = Number(v.x);
  const y = Number(v.y);
  if (!Number.isFinite(zoom) || !Number.isFinite(x) || !Number.isFinite(y)) return null;

  const clampedZoom = Math.min(4, Math.max(1, zoom));
  const clampedX = Math.min(100, Math.max(0, x));
  const clampedY = Math.min(100, Math.max(0, y));

  // Identity transform — store null to keep rows clean.
  if (clampedZoom === 1 && clampedX === 50 && clampedY === 50) return null;

  return { zoom: clampedZoom, x: clampedX, y: clampedY };
}
