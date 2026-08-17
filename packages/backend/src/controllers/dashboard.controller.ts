/** Dashboard endpoints. */

import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';

export const dashboardController = {
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await dashboardService.getStats() });
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(50, Number(req.query.limit) || 15);
      res.json({ success: true, data: await dashboardService.getRecentActivity(limit) });
    } catch (error) {
      next(error);
    }
  },
};
