const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safe);
  },
});

/** SDD — verification & product uploads: PDF, JPG, PNG only */
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/pjpeg',
]);

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/pjpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i;

const fileFilter = (_req, file, cb) => {
  if (ALLOWED.has(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF, JPG, and PNG files are allowed (SDD).'), false);
};

const imageFileFilter = (_req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  if (IMAGE_MIMES.has(mime) || mime.startsWith('image/')) {
    return cb(null, true);
  }
  if ((!mime || mime === 'application/octet-stream') && IMAGE_EXT.test(file.originalname || '')) {
    return cb(null, true);
  }
  cb(new Error('Profile photo must be JPG, PNG, WebP, or GIF (max 8 MB).'), false);
};

const cloudinary = require('cloudinary').v2;

const multerUpload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter,
});

/** Coach profile photos — images only, relaxed MIME (phones often send HEIC/WebP or empty type). */
const uploadImageMulter = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: imageFileFilter,
});

async function uploadToCloudinary(req, res, next) {
  if (!req.file) return next();
  try {
    if (process.env.CLOUDINARY_URL) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'sports-ecosystem',
        resource_type: 'auto',
      });
      req.file.cloudinaryUrl = result.secure_url;
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting local file:', err);
      }
    }
    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    next(error);
  }
}

function wrapMulterWithCloudinary(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) return next(err);
      uploadToCloudinary(req, res, next);
    });
  };
}

const upload = {
  single: (fieldName) => wrapMulterWithCloudinary(multerUpload.single(fieldName)),
  array: (fieldName, maxCount) => multerUpload.array(fieldName, maxCount),
  fields: (fields) => multerUpload.fields(fields),
  any: () => multerUpload.any(),
};

const uploadImage = {
  single: (fieldName) => wrapMulterWithCloudinary(uploadImageMulter.single(fieldName)),
  array: (fieldName, maxCount) => uploadImageMulter.array(fieldName, maxCount),
  fields: (fields) => uploadImageMulter.fields(fields),
  any: () => uploadImageMulter.any(),
};

module.exports = { upload, uploadImage, uploadDir };

