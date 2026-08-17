/** Settings endpoints. Stored as flat key/value rows and returned flat. */

import type { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service.js';

export const settingsController = {
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await settingsService.getAll() });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await settingsService.updateAll(req.body) });
    } catch (error) {
      next(error);
    }
  },
};
