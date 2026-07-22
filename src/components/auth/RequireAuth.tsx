import { type ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore, type UserRole } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";

interface RequireAuthProps {
  children: ReactNode;
  requirePlatformAdmin?: boolean;
  requireParent?: boolean;
  allowedRoles?: UserRole[];
}

export function RequireAuth({ 
  children, 
  requirePlatformAdmin = false,
  requireParent = false,
  allowedRoles
}: RequireAuthProps) {
  const { session, loading } = useAuth();
  const userRole = useAppStore((s) => s.userRole);
  const currentSchool = useAppStore((s) => s.currentSchool);
  const location = useLocation();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (session?.user) {
      supabase.rpc("is_platform_admin").then(({ data }) => {
        setIsPlatformAdmin(data ?? false);
      });
    }
  }, [session]);

  if (loading || isPlatformAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Platform admin check using secure RPC
  if (requirePlatformAdmin && !isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Parent check
  if (requireParent && userRole !== "parent") {
    return <Navigate to="/dashboard" replace />;
  }

  // Specific role check
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="mb-4 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-2xl font-bold">Access Denied</h1>
        <p className="mb-6 text-muted-foreground">
          You don't have the required permissions to access this page.
        </p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  // Tenant status validation
  if (currentSchool && currentSchool.accessState !== "active" && currentSchool.accessState !== "preview") {
    // If school is inactive, block access unless it's a platform admin
    if (!isPlatformAdmin) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <ShieldAlert className="mb-4 h-16 w-16 text-warning" />
          <h1 className="mb-2 text-2xl font-bold">Account Restricted</h1>
          <p className="mb-6 text-muted-foreground">
            Your school account is currently {currentSchool.accessState}. 
            Please contact support for activation.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
