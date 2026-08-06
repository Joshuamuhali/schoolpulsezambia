import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface KYCStatus {
  overall: "pending" | "in_review" | "verified" | "rejected";
  registration: "pending" | "verified" | "rejected";
  business: "pending" | "verified" | "rejected";
  ownership: "pending" | "verified" | "rejected";
  head_teacher: "pending" | "verified" | "rejected";
  address: "pending" | "verified" | "rejected";
  statistics: "pending" | "verified" | "rejected";
}

export interface KYCProgress {
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  is_complete: boolean;
  sections: Array<{
    name: string;
    completed: boolean;
    completed_at: string | null;
  }>;
}

export function useKYC(schoolId: string | undefined) {
  const queryClient = useQueryClient();

  // Get KYC status
  const { data: kycStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["kyc-status", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await (supabase as any).rpc("get_kyc_status", {
        p_school_id: schoolId,
      });
      if (error) throw error;
      return data as KYCStatus;
    },
    enabled: !!schoolId,
  });

  // Get KYC progress
  const { data: kycProgress, isLoading: progressLoading } = useQuery({
    queryKey: ["kyc-progress", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      const { data, error } = await (supabase as any).rpc("get_kyc_progress", {
        p_school_id: schoolId,
      });
      if (error) throw error;
      return data as KYCProgress;
    },
    enabled: !!schoolId,
  });

  // Check if KYC is required
  const { data: isKYCMandatory } = useQuery({
    queryKey: ["kyc-required", schoolId],
    queryFn: async () => {
      if (!schoolId) return true;
      const { data, error } = await (supabase as any).rpc("check_kyc_required", {
        p_school_id: schoolId,
      });
      if (error) throw error;
      return data ?? true;
    },
    enabled: !!schoolId,
  });

  // Check if KYC is complete
  const isKYCComplete = kycStatus?.overall === "verified";

  // Check if KYC is in review
  const isKYCInReview = kycStatus?.overall === "in_review";

  const isLoading = statusLoading || progressLoading;

  return {
    kycStatus,
    kycProgress,
    isKYCMandatory,
    isKYCComplete,
    isKYCInReview,
    isLoading,
  };
}

// Save KYC section
export function useSaveKYCSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      schoolId,
      section,
      data,
    }: {
      schoolId: string;
      section: string;
      data: any;
    }) => {
      const { error } = await (supabase as any).from("kyc_sections").upsert({
        school_id: schoolId,
        section_name: section,
        is_completed: true,
        completed_at: new Date().toISOString(),
        data: data,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kyc-progress", variables.schoolId] });
      toast.success("Section saved successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save section");
    },
  });
}

// Submit KYC for review
export function useSubmitKYC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      const { error } = await (supabase as any)
        .from("schools")
        .update({
          kyc_status: "in_review",
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq("id", schoolId);

      if (error) throw error;
    },
    onSuccess: (_, schoolId) => {
      queryClient.invalidateQueries({ queryKey: ["kyc-status", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["kyc-progress", schoolId] });
      toast.success("KYC submitted for review!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit KYC");
    },
  });
}

// Get pending KYC sections
export function usePendingKYCSections(schoolId: string | undefined) {
  const { kycStatus } = useKYC(schoolId);

  const pendingSections: string[] = [];
  if (!kycStatus) return [];

  if (kycStatus.registration === "pending") pendingSections.push("registration");
  if (kycStatus.business === "pending") pendingSections.push("business");
  if (kycStatus.ownership === "pending") pendingSections.push("ownership");
  if (kycStatus.head_teacher === "pending") pendingSections.push("head_teacher");
  if (kycStatus.address === "pending") pendingSections.push("address");
  if (kycStatus.statistics === "pending") pendingSections.push("statistics");

  return pendingSections;
}