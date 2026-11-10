import crypto from 'crypto';
import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

export const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2 MB, keep in sync with nginx client_max_body_size

// The extension is derived from this server-side allowlist, never from the client filename:
// a file declared as image/png is always stored as .png and served as image/png (no stored XSS).
const ALLOWED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (Object.hasOwn(ALLOWED_TYPES, file.mimetype)) {
    return cb(null, true);
  }
  const error = new Error('Images only: PNG or JPEG.');
  error.statusCode = 400;
  cb(error, false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1 }
}).single('image');

// Auth runs first: multer must not write anything to disk for an unauthenticated request.
router.post('/', protect, admin, upload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  res.status(201).json({
    message: 'Image uploaded',
    imageUrl: `/uploads/${req.file.filename}`
  });
});

export default router;
