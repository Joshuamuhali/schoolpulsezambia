import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  KYCStatus,
  KYCProgress,
  KYCSchool,
  SetupFeeRequest,
} from "@/types/kyc";

export class KYCService {
  /**
   * Get KYC status for a school
   */
  async getStatus(schoolId: string): Promise<KYCStatus> {
    const { data, error } = await (supabase as any).rpc("get_kyc_status", {
      p_school_id: schoolId,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get KYC progress
   */
  async getProgress(schoolId: string): Promise<KYCProgress> {
    const { data, error } = await (supabase as any).rpc("get_kyc_progress", {
      p_school_id: schoolId,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Save a KYC section
   */
  async saveSection(schoolId: string, section: string, data: any): Promise<void> {
    const { error } = await (supabase as any).from("kyc_sections").upsert({
      school_id: schoolId,
      section_name: section,
      is_completed: true,
      completed_at: new Date().toISOString(),
      data: data,
    });

    if (error) throw error;
  }

  /**
   * Submit KYC for review
   */
  async submitKYC(schoolId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("schools")
      .update({
        kyc_status: "in_review",
        kyc_submitted_at: new Date().toISOString(),
      })
      .eq("id", schoolId);

    if (error) throw error;
  }

  /**
   * Get pending sections
   */
  async getPendingSections(schoolId: string): Promise<string[]> {
    const status = await this.getStatus(schoolId);
    const pending: string[] = [];

    if (status.registration === "pending") pending.push("registration");
    if (status.business === "pending") pending.push("business");
    if (status.ownership === "pending") pending.push("ownership");
    if (status.head_teacher === "pending") pending.push("head_teacher");
    if (status.address === "pending") pending.push("address");
    if (status.statistics === "pending") pending.push("statistics");

    return pending;
  }

  /**
   * Admin: Get all KYC submissions
   */
  async getSubmissions(status?: string): Promise<KYCSchool[]> {
    let query = (supabase as any)
      .from("schools")
      .select(`
        id,
        name,
        subdomain,
        state,
        kyc_status,
        kyc_submitted_at,
        school_members!inner(
          user_id,
          profiles!inner(
            full_name,
            email
          )
        )
      `)
      .order("kyc_submitted_at", { ascending: false });

    if (status) {
      query = query.eq("kyc_status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((school: any) => ({
      id: school.id,
      name: school.name,
      subdomain: school.subdomain,
      state: school.state,
      kyc_status: school.kyc_status,
      kyc_submitted_at: school.kyc_submitted_at,
      admin_name: school.school_members?.[0]?.profiles?.full_name || "N/A",
      admin_email: school.school_members?.[0]?.profiles?.email || "N/A",
      sections: {},
    }));
  }

  /**
   * Admin: Get KYC details for a school
   */
  async getKYCDetails(schoolId: string) {
    const [
      registration,
      business,
      ownership,
      headTeacher,
      address,
      statistics,
      facilities,
    ] = await Promise.all([
      (supabase as any).from("school_registrations").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("business_registrations").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("school_ownership").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("school_heads").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("school_addresses").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("school_statistics").select("*").eq("school_id", schoolId).maybeSingle(),
      (supabase as any).from("school_facilities").select("*").eq("school_id", schoolId),
    ]);

    return {
      registration: registration.data,
      business: business.data,
      ownership: ownership.data,
      head_teacher: headTeacher.data,
      address: address.data,
      statistics: statistics.data,
      facilities: facilities.data || [],
    };
  }

  /**
   * Admin: Approve KYC
   */
  async approveKYC(schoolId: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;

    // Update school KYC status
    const { error: schoolError } = await (supabase as any)
      .from("schools")
      .update({
        kyc_status: "verified",
        kyc_verified_at: new Date().toISOString(),
        kyc_verified_by: adminId,
      })
      .eq("id", schoolId);

    if (schoolError) throw schoolError;

    // Log verification
    await (supabase as any).from("kyc_verification_log").insert({
      school_id: schoolId,
      admin_id: adminId,
      section: "overall",
      status: "approved",
      notes: notes,
    });

    // Trigger setup fee request
    await this.triggerSetupFee(schoolId);

    toast.success("KYC approved! Setup fee has been triggered.");
  }

  /**
   * Admin: Reject KYC
   */
  async rejectKYC(schoolId: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;

    // Update school KYC status
    const { error: schoolError } = await (supabase as any)
      .from("schools")
      .update({
        kyc_status: "rejected",
        kyc_rejection_reason: reason,
      })
      .eq("id", schoolId);

    if (schoolError) throw schoolError;

    // Log rejection
    await (supabase as any).from("kyc_verification_log").insert({
      school_id: schoolId,
      admin_id: adminId,
      section: "overall",
      status: "rejected",
      notes: reason,
    });

    toast.success("KYC rejected. School has been notified.");
  }

  /**
   * Admin: Verify specific section
   */
  async verifySection(schoolId: string, section: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;

    const tableMap: Record<string, string> = {
      registration: "school_registrations",
      business: "business_registrations",
      ownership: "school_ownership",
      head_teacher: "school_heads",
      address: "school_addresses",
      statistics: "school_statistics",
    };

    const table = tableMap[section];
    if (!table) throw new Error("Invalid section");

    const { error } = await (supabase as any)
      .from(table)
      .update({
        status: "verified",
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        notes: notes,
      })
      .eq("school_id", schoolId);

    if (error) throw error;

    // Log verification
    await (supabase as any).from("kyc_verification_log").insert({
      school_id: schoolId,
      admin_id: adminId,
      section: section,
      status: "approved",
      notes: notes,
    });

    toast.success(`${section} verified successfully`);
  }

  /**
   * Admin: Reject specific section
   */
  async rejectSection(schoolId: string, section: string, reason: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    const adminId = user?.id;

    const tableMap: Record<string, string> = {
      registration: "school_registrations",
      business: "business_registrations",
      ownership: "school_ownership",
      head_teacher: "school_heads",
      address: "school_addresses",
      statistics: "school_statistics",
    };

    const table = tableMap[section];
    if (!table) throw new Error("Invalid section");

    const { error } = await (supabase as any)
      .from(table)
      .update({
        status: "rejected",
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        notes: reason,
      })
      .eq("school_id", schoolId);

    if (error) throw error;

    // Log rejection
    await (supabase as any).from("kyc_verification_log").insert({
      school_id: schoolId,
      admin_id: adminId,
      section: section,
      status: "rejected",
      notes: reason,
    });

    toast.success(`${section} rejected`);
  }

  /**
   * Trigger setup fee request
   */
  private async triggerSetupFee(schoolId: string): Promise<void> {
    // Create setup fee request
    const { error } = await (supabase as any).from("setup_fee_requests").insert({
      school_id: schoolId,
      amount: 3500,
      status: "pending",
      requested_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating setup fee request:", error);
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(schoolId: string, file: File, type: string): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${schoolId}/${type}-${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("kyc-documents")
      .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
      .from("kyc-documents")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  /**
   * Get setup fee status
   */
  async getSetupFeeStatus(schoolId: string): Promise<SetupFeeRequest | null> {
    const { data, error } = await (supabase as any)
      .from("setup_fee_requests")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  /**
   * Check if KYC is required
   */
  async isKYCRequired(schoolId: string): Promise<boolean> {
    const { data, error } = await (supabase as any).rpc("check_kyc_required", {
      p_school_id: schoolId,
    });
    if (error) return true;
    return data ?? true;
  }
}

export const kycService = new KYCService();