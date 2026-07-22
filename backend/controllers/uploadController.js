const { asyncHandler } = require('../utils/asyncHandler');

const uploadSingle = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
  res.json({ success: true, data: { path: `/uploads/${req.file.filename}` } });
});

module.exports = { uploadSingle };
