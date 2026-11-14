import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadSingle, uploadMultiple } from '../../middleware/upload';
import { sendSuccess } from '../../utils/apiResponse';
import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { NotFoundError, BadRequestError } from '../../utils/appError';
import { env } from '../../config/environment';

const router = Router();

/**
 * @swagger
 * /files/upload:
 *   post:
 *     tags: [Files]
 *     summary: Upload a single file
 */
router.post('/upload', authenticate, uploadSingle, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new BadRequestError('No file uploaded');

    sendSuccess(res, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    }, 'File uploaded successfully', 201, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /files/upload-multiple:
 *   post:
 *     tags: [Files]
 *     summary: Upload up to 5 files
 */
router.post('/upload-multiple', authenticate, uploadMultiple, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw new BadRequestError('No files uploaded');

    const uploaded = files.map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
    }));

    sendSuccess(res, uploaded, `${files.length} file(s) uploaded`, 201, undefined, req.requestId);
  } catch (err) { next(err); }
});

/**
 * @swagger
 * /files/{filename}:
 *   delete:
 *     tags: [Files]
 *     summary: Delete an uploaded file (admin/officer only)
 */
router.delete('/:filename', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = String(req.params.filename);
    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.resolve(process.cwd(), env.UPLOAD_DIR, safeName);

    if (!fs.existsSync(filePath)) throw new NotFoundError('File');

    fs.unlinkSync(filePath);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
