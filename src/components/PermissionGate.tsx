/**
 * Component: PermissionGate
 * Wraps content and only shows it if user has the required permission
 */

import { ReactNode, useEffect, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { AlertCircle } from "lucide-react";

interface PermissionGateProps {
  resource: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ resource, action, children, fallback }: PermissionGateProps) {
  const { hasPermission } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    hasPermission(resource, action).then(setHasAccess);
  }, [resource, action, hasPermission]);

  if (hasAccess === null) {
    return <div className="flex justify-center p-4">Checking permissions...</div>;
  }

  if (!hasAccess) {
    return fallback || (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">You don't have permission to access this.</span>
      </div>
    );
  }

  return <>{children}</>;
}