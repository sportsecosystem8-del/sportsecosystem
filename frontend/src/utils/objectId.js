const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** Populated user ref or raw id string → valid MongoDB id, or null if missing/invalid. */
export function resolveUserRefId(ref) {
  const raw = ref?._id ?? ref;
  if (raw == null) return null;
  const id = String(raw);
  if (id === 'null' || id === 'undefined' || !OBJECT_ID_RE.test(id)) return null;
  return id;
}
