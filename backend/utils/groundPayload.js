function parseGroundImagePaths(body = {}) {
  if (Array.isArray(body.imagePaths)) {
    return body.imagePaths.map((p) => String(p).trim()).filter(Boolean);
  }
  if (body.imagePath) return [String(body.imagePath).trim()].filter(Boolean);
  return [];
}

function sanitizeGroundPayload(body = {}) {
  const imagePaths = parseGroundImagePaths(body);
  const payload = {
    name: body.name,
    sportType: body.sportType,
    ownerName: body.ownerName,
    ownerPhone: body.ownerPhone,
    ownerAddress: body.ownerAddress,
    ownerLocation: body.ownerLocation,
    location: body.location,
    address: body.address,
    city: body.city,
    description: body.description,
    imagePaths: imagePaths.length ? imagePaths : undefined,
    imagePath: imagePaths[0],
    lengthFeet: body.lengthFeet != null ? Number(body.lengthFeet) : undefined,
    areaSqFt: body.areaSqFt != null ? Number(body.areaSqFt) : undefined,
    isActive: body.isActive,
    slotDurationMinutes: body.slotDurationMinutes,
    openTime: body.openTime,
    closeTime: body.closeTime,
    pricePerHour: body.pricePerHour != null ? Number(body.pricePerHour) : undefined,
    businessOwner: body.businessOwner,
    listedBy: body.listedBy,
  };
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function validateGroundImages(imagePaths) {
  if (imagePaths.length < 3) {
    return 'At least 3 ground images are required';
  }
  return null;
}

module.exports = { parseGroundImagePaths, sanitizeGroundPayload, validateGroundImages };
