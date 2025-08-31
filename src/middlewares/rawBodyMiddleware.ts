// src/middlewares/rawBodyMiddleware.ts
import { Request, Response, NextFunction } from 'express';

export function rawBodyMiddleware(req: Request, res: Response, buf: Buffer, encoding: BufferEncoding) {
    (req as any).rawBody = buf.toString(encoding || 'utf8');
}
