import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import SchoolLayout from "@/components/school/SchoolLayout";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import { kycService } from "@/lib/services/kycService";
import { useSchoolStatus, SchoolState } from "@/hooks/useSchoolStatus";

/**
 * DashboardRouter — role-based dashboard router with onboarding check.
 *
 * Checks the authenticated user's role and onboarding status:
 * - Platform admins → /admin (checked via secure RPC)
 * - Parents → /parent
 * - School users without completed onboarding → /onboarding/modules
 * - School users with completed onboarding → renders SchoolLayout with child routes
 */
export const DashboardRouter = () => {
  const navigate = useNavigate();
  const userRole = useAppStore((s) => s.userRole);
  const userId = useAppStore((s) => s.userId);
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const setSchoolState = useAppStore((s) => s.setSchoolState);

  // Get school status for the current user
  const { state: schoolState, loading: schoolStatusLoading } = useSchoolStatus(userId);

  // Update app store when school state changes
  useEffect(() => {
    if (schoolState !== 'no_school') {
      setSchoolState(schoolState);
    }
  }, [schoolState, setSchoolState]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userRole) {
        setCheckingOnboarding(false);
        return;
      }

      // Check if user is blocked (applies to all users)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // CRITICAL: Block unconfirmed users
        if (!user.email_confirmed_at) {
          setCheckingOnboarding(false);
          navigate("/auth/confirm-email", { replace: true });
          return;
        }

        const { data: blockStatus } = await (supabase as any).rpc("get_user_block_status", {
          p_user_id: user.id,
        });
        if (blockStatus && (blockStatus as any).is_blocked) {
          setCheckingOnboarding(false);
          navigate("/access-blocked", { replace: true });
          return;
        }
      }

      // Check if platform admin
      const { data: isAdmin } = await supabase.rpc("is_platform_admin");
      const platformAdmin = isAdmin ?? false;
      setIsPlatformAdmin(platformAdmin);

      if (platformAdmin) {
        setCheckingOnboarding(false);
        navigate("/admin", { replace: true });
        return;
      }

      // Check if user is a parent
      const isParent = userRole === "parent" || userRole?.includes("parent");
      if (isParent) {
        setCheckingOnboarding(false);
        navigate("/parent", { replace: true });
        return;
      }

      // For school users, use the new school state system
      if (!isParent && !platformAdmin && user) {
        // Update school state in app store
        setSchoolState(schoolState);

        console.log('[DashboardRouter] User school state:', schoolState);

        // If no school, redirect to onboarding welcome page
        if (schoolState === 'no_school') {
          console.log('[DashboardRouter] No school found, redirecting to welcome');
          setCheckingOnboarding(false);
          navigate("/onboarding/welcome", { replace: true });
          return;
        }

        // If school is not active, redirect to pending approval
        if (schoolState !== 'active') {
          console.log('[DashboardRouter] School not active, redirecting to pending approval');
          setCheckingOnboarding(false);
          navigate("/onboarding/pending-approval", { replace: true });
          return;
        }

        // School is active, allow dashboard access
        console.log('[DashboardRouter] School active, allowing dashboard access');
        setCheckingOnboarding(false);
        return;
      }

      setCheckingOnboarding(false);
    };

    checkAccess();
  }, [userRole, schoolState, navigate, setSchoolState]);

  // Show loading while checking
  if (isPlatformAdmin === null || checkingOnboarding || schoolStatusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Don't render anything if redirecting
  const isParent = userRole === "parent" || userRole?.includes("parent");
  if (isPlatformAdmin || isParent) {
    return null;
  }

  // For school users, render SchoolLayout
  return <SchoolLayout />;
};
