import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import SchoolLayout from "@/components/school/SchoolLayout";
import { supabase } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

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
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!userRole) {
        setCheckingOnboarding(false);
        return;
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

      // For school users, check if they need to complete onboarding
      if (currentSchool && !isParent && !platformAdmin) {
        // Check if school has completed module selection and payment
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCheckingOnboarding(false);
          return;
        }

        const { data: member } = await supabase
          .from("school_members")
          .select("school_id")
          .eq("user_id", user.id)
          .single();

        if (member) {
          // Check if module selection exists
          const { data: moduleSelection } = await supabase
            .from("school_module_selections")
            .select("id")
            .eq("school_id", (member as any).school_id)
            .single();

          // Check if payment exists
          const { data: payment } = await supabase
            .from("school_payments")
            .select("id")
            .eq("school_id", (member as any).school_id)
            .single();

          // If no module selection or no payment, redirect to module selection
          if (!moduleSelection || !payment) {
            setCheckingOnboarding(false);
            navigate("/onboarding/modules", { replace: true });
            return;
          }
        }
      }

      setCheckingOnboarding(false);
    };

    checkAccess();
  }, [userRole, currentSchool, navigate]);

  // Show loading while checking
  if (isPlatformAdmin === null || checkingOnboarding) {
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
