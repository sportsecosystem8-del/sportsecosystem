/**
 * Parse page/limit query params for list endpoints.
 */
function parsePagination(query, { defaultLimit = 24, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query?.page, 10) || 1);
  const rawLimit = Number.parseInt(query?.limit, 10);
  const limit = Math.min(maxLimit, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function paginationMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasMore: page < totalPages };
}

module.exports = { parsePagination, paginationMeta };
