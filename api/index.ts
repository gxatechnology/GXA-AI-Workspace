import type { Request, Response } from 'express';
import app from '../server.js';
import { restoreApiUrl } from '../server/vercel.js';

export default function handler(request: Request, response: Response) {
  request.url = restoreApiUrl(request.url);
  return app(request, response);
}
