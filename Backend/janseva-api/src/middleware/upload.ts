import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import type { Request } from 'express';
import { env } from '../config/environment';
import { BadRequestError } from '../utils/appError';

const allowedMimeTypes = env.ALLOWED_MIME_TYPES.split(',');
const maxSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;

// Disk storage — files saved with unique names to prevent collisions
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), env.UPLOAD_DIR));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `janseva-${uniqueSuffix}${ext}`);
  },
});

// MIME type whitelist validation
function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `File type '${file.mimetype}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      ),
    );
  }
}

// General file upload — single file
export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeBytes },
}).single('file');

// Multiple files (up to 5) — for complaint evidence
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeBytes, files: 5 },
}).array('files', 5);

// Memory storage for buffer-based operations (e.g., AI vision analysis)
export const uploadToMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: maxSizeBytes },
}).single('file');
