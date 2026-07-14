import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Upload middleware for a single profile photo.
 * Stores the file in memory (req.file) for downstream processing.
 * Returns 413 JSON if the file exceeds 5 MB.
 */
export function uploadPhoto(req: Request, res: Response, next: NextFunction): void {
  multerUpload.single('photo')(req, res, (err) => {
    if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size must not exceed 5 MB.',
      });
      return;
    }

    next(err);
  });
}
