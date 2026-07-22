/**
 * Staff Contract Service
 * Handles staff contract management and tracking
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface StaffContract {
  id: string;
  school_id: string;
  staff_id: string;
  contract_type: "permanent" | "contract" | "temporary" | "internship";
  contract_number: string;
  start_date: string;
  end_date?: string;
  position: string;
  department?: string;
  salary_amount?: number;
  salary_currency: string;
  working_hours_per_week?: number;
  annual_leave_days: number;
  sick_leave_days: number;
  contract_document_url?: string;
  supporting_documents?: string[];
  status: "draft" | "active" | "expired" | "terminated" | "renewed";
  terms_and_conditions?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  staff_profiles?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export interface CreateStaffContractInput {
  schoolId: string;
  staffId: string;
  contractType: StaffContract["contract_type"];
  contractNumber: string;
  startDate: string;
  endDate?: string;
  position: string;
  department?: string;
  salaryAmount?: number;
  workingHoursPerWeek?: number;
  annualLeaveDays?: number;
  sickLeaveDays?: number;
  contractDocumentUrl?: string;
  supportingDocuments?: string[];
  termsAndConditions?: string;
  notes?: string;
}

export interface UpdateStaffContractInput {
  contractType?: StaffContract["contract_type"];
  endDate?: string;
  position?: string;
  department?: string;
  salaryAmount?: number;
  workingHoursPerWeek?: number;
  annualLeaveDays?: number;
  sickLeaveDays?: number;
  contractDocumentUrl?: string;
  supportingDocuments?: string[];
  status?: StaffContract["status"];
  termsAndConditions?: string;
  notes?: string;
}

// ============================================================================
// STAFF CONTRACT CRUD
// ============================================================================

/**
 * Create staff contract
 */
export async function createStaffContract(input: CreateStaffContractInput): Promise<StaffContract> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("staff_contracts")
    .insert({
      school_id: input.schoolId,
      staff_id: input.staffId,
      contract_type: input.contractType,
      contract_number: input.contractNumber,
      start_date: input.startDate,
      end_date: input.endDate,
      position: input.position,
      department: input.department,
      salary_amount: input.salaryAmount,
      salary_currency: "USD",
      working_hours_per_week: input.workingHoursPerWeek,
      annual_leave_days: input.annualLeaveDays || 21,
      sick_leave_days: input.sickLeaveDays || 10,
      contract_document_url: input.contractDocumentUrl,
      supporting_documents: input.supportingDocuments || [],
      terms_and_conditions: input.termsAndConditions,
      notes: input.notes,
      created_by: user.id,
    } as never)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffContract;
}

/**
 * Get staff contracts
 */
export async function getStaffContracts(
  schoolId: string,
  filters?: {
    staffId?: string;
    status?: StaffContract["status"];
    contractType?: StaffContract["contract_type"];
  }
): Promise<StaffContract[]> {
  let query = supabase
    .from("staff_contracts")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  if (filters?.staffId) {
    query = query.eq("staff_id", filters.staffId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.contractType) {
    query = query.eq("contract_type", filters.contractType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StaffContract[];
}

/**
 * Get staff contract by ID
 */
export async function getStaffContractById(contractId: string): Promise<StaffContract> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("id", contractId)
    .single();

  if (error) throw error;
  return data as StaffContract;
}

/**
 * Get active contract for staff member
 */
export async function getActiveStaffContract(staffId: string, schoolId: string): Promise<StaffContract | null> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("staff_id", staffId)
    .eq("school_id", schoolId)
    .eq("status", "active")
    .lte("start_date", new Date().toISOString().split("T")[0])
    .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split("T")[0]}`)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as StaffContract | null;
}

/**
 * Update staff contract
 */
export async function updateStaffContract(
  contractId: string,
  updates: UpdateStaffContractInput
): Promise<StaffContract> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contractId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffContract;
}

/**
 * Renew staff contract
 */
export async function renewStaffContract(
  contractId: string,
  newEndDate: string
): Promise<StaffContract> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .update({
      status: "renewed",
      end_date: newEndDate,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contractId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffContract;
}

/**
 * Terminate staff contract
 */
export async function terminateStaffContract(contractId: string): Promise<StaffContract> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .update({
      status: "terminated",
      end_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", contractId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffContract;
}

/**
 * Delete staff contract
 */
export async function deleteStaffContract(contractId: string): Promise<void> {
  const { error } = await supabase
    .from("staff_contracts")
    .delete()
    .eq("id", contractId);

  if (error) throw error;
}

// ============================================================================
// CONTRACT STATISTICS
// ============================================================================

/**
 * Get contract statistics for a school
 */
export async function getContractStatistics(
  schoolId: string
): Promise<{
  totalContracts: number;
  activeContracts: number;
  expiredContracts: number;
  draftContracts: number;
  byType: Record<string, number>;
  expiringSoon: Array<{
    contractId: string;
    staffName: string;
    contractNumber: string;
    endDate: string;
    daysRemaining: number;
  }>;
}> {
  const { data, error } = await supabase
    .from("staff_contracts")
    .select("*, staff_profiles(first_name, last_name)")
    .eq("school_id", schoolId);

  if (error) throw error;

  const contracts = data as StaffContract[];

  const byType: Record<string, number> = {};
  const expiringSoon: Array<{
    contractId: string;
    staffName: string;
    contractNumber: string;
    endDate: string;
    daysRemaining: number;
  }> = [];

  const today = new Date();
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  contracts.forEach((contract) => {
    // By type
    byType[contract.contract_type] = (byType[contract.contract_type] || 0) + 1;

    // Expiring soon
    if (contract.end_date && contract.status === "active") {
      const endDate = new Date(contract.end_date);
      if (endDate >= today && endDate <= thirtyDaysFromNow) {
        const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        expiringSoon.push({
          contractId: contract.id,
          staffName: `${contract.staff_profiles?.first_name} ${contract.staff_profiles?.last_name}`,
          contractNumber: contract.contract_number,
          endDate: contract.end_date,
          daysRemaining,
        });
      }
    }
  });

  return {
    totalContracts: contracts.length,
    activeContracts: contracts.filter((c) => c.status === "active").length,
    expiredContracts: contracts.filter((c) => c.status === "expired").length,
    draftContracts: contracts.filter((c) => c.status === "draft").length,
    byType,
    expiringSoon: expiringSoon.sort((a, b) => a.daysRemaining - b.daysRemaining),
  };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const staffContractService = {
  // CRUD
  createStaffContract,
  getStaffContracts,
  getStaffContractById,
  getActiveStaffContract,
  updateStaffContract,
  deleteStaffContract,

  // Actions
  renewStaffContract,
  terminateStaffContract,

  // Statistics
  getContractStatistics,
};