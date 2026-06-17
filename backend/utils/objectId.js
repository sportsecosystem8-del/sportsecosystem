const mongoose = require('mongoose');

/** Populated user ref or raw ObjectId → valid id string, or null if missing/invalid. */
function resolveUserRefId(ref) {
  const raw = ref?._id ?? ref;
  if (raw == null) return null;
  const id = String(raw);
  if (id === 'null' || id === 'undefined' || id === '') return null;
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

module.exports = { resolveUserRefId };
