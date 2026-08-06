import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export type SchoolState = 'no_school' | 'setup_complete' | 'kyc_pending' | 'kyc_approved' | 'active';

interface SchoolStatus {
  state: SchoolState;
  schoolId: string | null;
  loading: boolean;
}

export function useSchoolStatus(userId: string | undefined): SchoolStatus {
  const { data, isLoading } = useQuery({
    queryKey: ["school-status", userId],
    queryFn: async () => {
      if (!userId) {
        return { state: 'no_school' as SchoolState, schoolId: null };
      }

      const { data: member, error } = await supabase
        .from("school_members")
        .select("school_id, schools(state)")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching school status:", error);
        return { state: 'no_school' as SchoolState, schoolId: null };
      }

      if (!member) {
        return { state: 'no_school' as SchoolState, schoolId: null };
      }

      const school = member as any;
      return {
        state: school.schools?.state || 'setup_complete',
        schoolId: school.school_id,
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    state: data?.state || 'no_school',
    schoolId: data?.schoolId || null,
    loading: isLoading,
  };
}