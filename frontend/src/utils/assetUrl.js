/**
 * Resolve public media paths (e.g. `/uploads/...`) for img src.
 * Local/dev (no VITE_API_URL): relative paths work via the Vite proxy.
 * Split deploy: prefix with the API origin from VITE_API_URL
 * (e.g. https://api.onrender.com/api → https://api.onrender.com).
 */
function getApiOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl || typeof apiUrl !== 'string') return '';
  const trimmed = apiUrl.trim();
  if (!trimmed) return '';
  try {
    return new URL(trimmed).origin;
  } catch {
    return '';
  }
}

export function publicAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';
  const t = path.trim();
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  const relative = t.startsWith('/') ? t : `/${t}`;
  const origin = getApiOrigin();
  return origin ? `${origin}${relative}` : relative;
}
