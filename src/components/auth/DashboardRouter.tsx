import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import SchoolLayout from "@/components/school/SchoolLayout";
import { supabase } from "@/lib/supabase/client";

/**
 * DashboardRouter — role-based dashboard router.
 *
 * Checks the authenticated user's role and redirects to the correct dashboard:
 * - Platform admins → /admin (checked via secure RPC)
 * - Parents → /parent
 * - Everyone else → renders SchoolLayout with child routes
 */
export const DashboardRouter = () => {
  const userRole = useAppStore((s) => s.userRole);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (userRole) {
      supabase.rpc("is_platform_admin").then(({ data }) => {
        const isAdmin = data ?? false;
        setIsPlatformAdmin(isAdmin);
        if (isAdmin) {
          window.location.href = "/admin";
        } else if (userRole === "parent") {
          window.location.href = "/parent";
        }
      });
    }
  }, [userRole]);

  // While checking platform admin status or redirecting, show nothing
  if (isPlatformAdmin === null || isPlatformAdmin || userRole === "parent") {
    return null;
  }

  // For school users, render SchoolLayout
  // Child routes will automatically render in SchoolLayout's Outlet
  return <SchoolLayout />;
};
