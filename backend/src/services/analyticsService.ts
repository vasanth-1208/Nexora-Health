import { Bed, Admission, Consultation, Payment, Patient, DiagnosticRequest } from '../models';

export class AnalyticsService {
  /**
   * Hospital-wide operational census and bed turnover aggregations.
   * Uses real database aggregation pipelines instead of in-memory calculations.
   */
  static async getOperationalMetrics(range: string = 'today') {
    // 1. Bed status census
    const bedStats = await Bed.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusCounts: Record<string, number> = {
      AVAILABLE: 0,
      RESERVED: 0,
      OCCUPIED: 0,
      CLEANING: 0,
      MAINTENANCE: 0,
      BLOCKED: 0,
    };
    let totalBeds = 0;
    for (const stat of bedStats) {
      statusCounts[stat._id] = stat.count;
      totalBeds += stat.count;
    }

    const occupiedOrReserved = (statusCounts.OCCUPIED || 0) + (statusCounts.RESERVED || 0);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedOrReserved / totalBeds) * 100) : 0;

    // 2. Date filtering
    let startDate: Date;
    if (range === '7d') {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === 'all') {
      startDate = new Date(0);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    const [todayPatients, todayConsultations, activeAdmissions, totalCollections] = await Promise.all([
      Patient.countDocuments({ createdAt: { $gte: startDate } }),
      Consultation.countDocuments({ createdAt: { $gte: startDate } }),
      Admission.countDocuments({ admissionStatus: 'OCCUPIED' }),
      Payment.aggregate([
        { $match: { status: 'PAID', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    // 3. Average Length of Stay (ALOS) for completed discharges
    const alosAggregation = await Admission.aggregate([
      { $match: { admissionStatus: 'DISCHARGED', admittedAt: { $exists: true }, dischargedAt: { $exists: true } } },
      {
        $project: {
          durationDays: {
            $ceil: {
              $divide: [{ $subtract: ['$dischargedAt', '$admittedAt'] }, 1000 * 60 * 60 * 24],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          avgStayDays: { $avg: '$durationDays' },
        },
      },
    ]);

    // Zero fake fallbacks: genuine 0 if no discharges exist
    const averageLengthOfStay = alosAggregation.length > 0 ? Math.round(alosAggregation[0].avgStayDays * 10) / 10 : 0;

    // 4. Revenue breakdown by service category
    const revenueBreakdown = await Payment.aggregate([
      { $match: { status: 'PAID', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$serviceType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalBeds,
      statusCounts,
      occupancyRate,
      todayPatients,
      todayConsultations,
      activeAdmissions,
      totalCollections: totalCollections[0]?.total || 0,
      averageLengthOfStay,
      revenueBreakdown,
    };
  }
}
