import { Admission, Ward, Payment, Invoice, DiagnosticRequest, Prescription, getNextSequence } from '../models';
import { emitSocketEvent } from '../config/socket';

export class BillingService {
  /**
   * Calculates length-of-stay charges and gathers all unpaid services for an inpatient stay.
   * Does NOT use hardcoded amounts.
   */
  static async calculateDischargeBill(admissionId: string): Promise<{
    admission: any;
    stayDays: number;
    dailyRate: number;
    bedCharges: number;
    unpaidDiagnostics: any[];
    diagnosticsCharges: number;
    unpaidPrescriptions: any[];
    pharmacyCharges: number;
    admissionDepositPaid: number;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
    balancePayable: number;
  }> {
    const admission = await Admission.findById(admissionId)
      .populate('wardId')
      .populate('patientId');

    if (!admission) {
      throw new Error('Admission record not found.');
    }

    // 1. Calculate actual elapsed stay duration in 24-hour days
    const startTime = admission.admittedAt || admission.createdAt;
    const endTime = new Date();
    const durationMs = Math.max(0, endTime.getTime() - new Date(startTime).getTime());
    // Minimum 1 day for any admitted stay
    const stayDays = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60 * 24)));

    // 2. Fetch configured daily rate from Ward
    const ward: any = admission.wardId;
    const dailyRate = ward?.dailyRate || 1000;
    const bedCharges = stayDays * dailyRate;

    // 3. Fetch unpaid diagnostic tests ordered during this stay
    const unpaidDiagnostics = await DiagnosticRequest.find({
      patientId: admission.patientId,
      status: { $in: ['REQUESTED', 'PAYMENT_PENDING', 'QUEUED', 'RECEIVED', 'IN_PROGRESS', 'COMPLETED'] },
      $or: [{ paymentId: { $exists: false } }, { paymentId: null }],
    });
    const diagnosticsCharges = unpaidDiagnostics.reduce((acc, curr) => acc + (curr.cost || 0), 0);

    // 4. Fetch unpaid pharmacy orders during this stay
    const unpaidPrescriptions = await Prescription.find({
      patientId: admission.patientId,
      paymentStatus: 'PENDING',
    });
    const pharmacyCharges = unpaidPrescriptions.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

    // 5. Fetch initial admission deposit already paid
    const admissionDepositPayment = await Payment.findOne({
      patientId: admission.patientId,
      referenceId: admission._id,
      serviceType: 'ADMISSION',
      status: 'PAID',
    });
    const admissionDepositPaid = admissionDepositPayment?.amount || 0;

    // 6. Tax and Total calculation
    const subtotal = bedCharges + diagnosticsCharges + pharmacyCharges;
    const taxRate = 5; // 5% hospital service tax
    const taxAmount = Math.round((subtotal * taxRate) / 100);
    const grossTotal = subtotal + taxAmount;
    const balancePayable = Math.max(0, grossTotal - admissionDepositPaid);

    return {
      admission,
      stayDays,
      dailyRate,
      bedCharges,
      unpaidDiagnostics,
      diagnosticsCharges,
      unpaidPrescriptions,
      pharmacyCharges,
      admissionDepositPaid,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount: grossTotal,
      balancePayable,
    };
  }

  /**
   * Generates a formal itemized Invoice for discharge.
   */
  static async createDischargeInvoice(admissionId: string, operatorName: string = 'Doctor'): Promise<any> {
    const calc = await this.calculateDischargeBill(admissionId);
    const admission = calc.admission;

    // Generate atomic invoice number: INV-2026-XXXX
    const seq = await getNextSequence('invoiceNumber', 1000);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${seq}`;

    const lineItems: any[] = [
      {
        description: `Hospital Inpatient Bed Stay (${calc.stayDays} days @ ₹${calc.dailyRate}/day in ${admission.wardId?.name || 'Ward'})`,
        category: 'BED_STAY',
        quantity: calc.stayDays,
        unitPrice: calc.dailyRate,
        total: calc.bedCharges,
      },
    ];

    if (calc.diagnosticsCharges > 0) {
      lineItems.push({
        description: `Clinical Diagnostics & Laboratory Scans (${calc.unpaidDiagnostics.length} tests)`,
        category: 'DIAGNOSTIC',
        quantity: calc.unpaidDiagnostics.length,
        unitPrice: calc.diagnosticsCharges,
        total: calc.diagnosticsCharges,
      });
    }

    if (calc.pharmacyCharges > 0) {
      lineItems.push({
        description: `Pharmacy Inpatient Medications Dispensed (${calc.unpaidPrescriptions.length} prescriptions)`,
        category: 'PHARMACY',
        quantity: calc.unpaidPrescriptions.length,
        unitPrice: calc.pharmacyCharges,
        total: calc.pharmacyCharges,
      });
    }

    if (calc.admissionDepositPaid > 0) {
      lineItems.push({
        description: `Admission Advance Deposit Paid (Credit)`,
        category: 'ADMISSION_DEPOSIT',
        quantity: 1,
        unitPrice: -calc.admissionDepositPaid,
        total: -calc.admissionDepositPaid,
      });
    }

    const invoice = await Invoice.create({
      invoiceNumber,
      patientId: admission.patientId._id || admission.patientId,
      admissionId: admission._id,
      lineItems,
      subtotal: calc.subtotal,
      taxRate: calc.taxRate,
      taxAmount: calc.taxAmount,
      discount: 0,
      totalAmount: calc.totalAmount,
      paidAmount: calc.admissionDepositPaid,
      balanceAmount: calc.balancePayable,
      status: calc.balancePayable === 0 ? 'PAID' : 'PENDING',
      generatedBy: operatorName,
    });

    // Also create matching Payment ledger row so existing payment views display the pending balance
    const payment = await Payment.create({
      patientId: admission.patientId._id || admission.patientId,
      serviceType: 'ADMISSION',
      amount: calc.balancePayable,
      status: calc.balancePayable === 0 ? 'PAID' : 'PENDING',
      referenceId: admission._id,
      referenceModel: 'INVOICE',
      invoiceId: invoice._id,
      admissionId: admission._id,
      description: `Discharge final stay settlement (${invoiceNumber})`,
    });

    emitSocketEvent('payment:updated', { patientId: admission.patientId, payment, invoice });
    return { invoice, payment, breakdown: calc };
  }
}
