import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';

export const getHospitalMetrics = async (req: Request, res: Response) => {
  try {
    const range = req.query.range as string;
    const metrics = await AnalyticsService.getOperationalMetrics(range);
    return res.status(200).json(metrics);
  } catch (error: any) {
    console.error('Get hospital metrics error:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};
