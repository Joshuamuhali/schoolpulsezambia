/**
 * Billing Service
 * Handles payment calculations, invoices, and payment verifications
 */

import { supabase } from "@/lib/supabase/client";

// Billing constants (in Kwacha - ZMW)
export const ONBOARDING_FEE = 7500; // ZK - One-time fee
export const MODULE_FEE = 550; // ZK - Per module per month
export const TRIAL_DAYS = 3; // Free trial period

export interface BillingCalculation {
  onboardingFee: number;
  moduleFees: { moduleId: string; amount: number }[];
  totalOneTime: number;
  totalMonthly: number;
  totalPayable: number;
}

export interface PaymentVerification {
  id: string;
  school_id: string;
  transaction_id: string;
  amount: number;
  payment_date: string;
  payment_time: string;
  mobile_network: string;
  sender_phone?: string;
  proof_of_payment_url: string;
  payment_type: "onboarding" | "monthly" | "both";
  onboarding_fee?: number;
  module_fees?: { moduleId: string; amount: number }[];
  modules_selected?: string[];
  status: "pending" | "verified" | "rejected";
  rejection_reason?: string;
  submitted_by: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  school_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  onboarding_fee: number;
  module_fees?: { moduleId: string; amount: number };
  total_amount: number;
  amount_paid: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate payment breakdown for selected modules
 */
export function calculatePayment(moduleIds: string[]): BillingCalculation {
  const moduleFees = moduleIds.map((id) => ({
    moduleId: id,
    amount: MODULE_FEE,
  }));

  const totalMonthly = moduleIds.length * MODULE_FEE;
  const totalOneTime = ONBOARDING_FEE;
  const totalPayable = totalOneTime + totalMonthly;

  return {
    onboardingFee: ONBOARDING_FEE,
    moduleFees,
    totalOneTime,
    totalMonthly,
    totalPayable,
  };
}

/**
 * Create invoice for a school
 */
export async function createInvoice(
  schoolId: string,
  moduleIds: string[],
  periodStart: Date,
  periodEnd: Date
): Promise<Invoice> {
  const calculation = calculatePayment(moduleIds);

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      school_id: schoolId,
      invoice_number: invoiceNumber,
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      onboarding_fee: calculation.onboardingFee,
      module_fees: calculation.moduleFees,
      total_amount: calculation.totalPayable,
      amount_paid: 0,
      status: "pending",
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as Invoice;
}

/**
 * Submit payment verification
 */
export async function submitPaymentVerification(
  schoolId: string,
  formData: {
    transactionId: string;
    amount: number;
    paymentDate: string;
    paymentTime: string;
    mobileNetwork: string;
    senderPhone?: string;
    proofOfPayment: File;
    paymentType: "onboarding" | "monthly" | "both";
    notes?: string;
  },
  moduleIds: string[],
  userId: string
): Promise<PaymentVerification> {
  // Upload proof of payment
  const file = formData.proofOfPayment;
  const filePath = `payment-proofs/${schoolId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("school-files")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("school-files")
    .getPublicUrl(filePath);

  // Calculate fees
  const calculation = calculatePayment(moduleIds);

  // Create payment verification
  const { data, error } = await supabase
    .from("payment_verifications")
    .insert({
      school_id: schoolId,
      transaction_id: formData.transactionId,
      amount: formData.amount,
      payment_date: formData.paymentDate,
      payment_time: formData.paymentTime,
      mobile_network: formData.mobileNetwork,
      sender_phone: formData.senderPhone,
      proof_of_payment_url: publicUrl,
      payment_type: formData.paymentType,
      onboarding_fee: calculation.onboardingFee,
      module_fees: calculation.moduleFees,
      modules_selected: moduleIds,
      submitted_by: userId,
      notes: formData.notes,
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as PaymentVerification;
}

/**
 * Process payment verification (admin action)
 */
export async function processPaymentVerification(
  verificationId: string,
  status: "verified" | "rejected",
  rejectionReason?: string,
  verifiedById?: string
): Promise<void> {
  // Get verification record
  const { data: verification, error: fetchError } = await supabase
    .from("payment_verifications")
    .select("*")
    .eq("id", verificationId)
    .single();

  if (fetchError) throw fetchError;
  if (!verification) throw new Error("Payment verification not found");

  // Update verification status
  const { error: updateError } = await supabase
    .from("payment_verifications")
    .update({
      status,
      verified_by: verifiedById,
      verified_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    } as any)
    .eq("id", verificationId);

  if (updateError) throw updateError;

  if (status === "verified" && verification.modules_selected) {
    // 1. Activate modules
    const modulePromises = (verification as any).modules_selected.map((moduleId: string) =>
      supabase.from("school_feature_flags").upsert({
        school_id: (verification as any).school_id,
        feature_id: moduleId,
        status: "active",
        enabled_at: new Date().toISOString(),
      } as any)
    );

    await Promise.all(modulePromises);

    // 2. Update school billing status
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

    await supabase
      .from("schools")
      .update({
        billing_status: "active",
        onboarding_fee_paid: true,
        onboarding_payment_id: verificationId,
        state: "active",
        subscription_status: "trialing",
        trial_end_date: trialEndDate.toISOString(),
      } as any)
      .eq("id", (verification as any).school_id);

    // 3. Create invoice
    await createInvoice(
      (verification as any).school_id,
      (verification as any).modules_selected,
      new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    // 4. Log feature access
    const logPromises = (verification as any).modules_selected.map((moduleId: string) =>
      supabase.from("feature_access_logs").insert({
        school_id: (verification as any).school_id,
        feature_id: moduleId,
        action: "activated",
        performed_by: verifiedById,
      })
    );

    await Promise.all(logPromises);

    // 5. Send confirmation email (TODO: implement email service)
  }
}

/**
 * Get payment verifications for a school
 */
export async function getSchoolPaymentVerifications(schoolId: string): Promise<PaymentVerification[]> {
  const { data, error } = await supabase
    .from("payment_verifications")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as PaymentVerification[];
}

/**
 * Get invoices for a school
 */
export async function getSchoolInvoices(schoolId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Invoice[];
}

/**
 * Get all pending payment verifications (admin)
 */
export async function getPendingPaymentVerifications(): Promise<PaymentVerification[]> {
  const { data, error } = await supabase
    .from("payment_verifications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as PaymentVerification[];
}