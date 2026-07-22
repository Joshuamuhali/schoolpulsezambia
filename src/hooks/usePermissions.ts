/**
 * Hook: usePermissions
 * Permission checking utilities for role-based access control
 */

import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/appStore";
import { userManagementService } from "@/lib/services/userManagementService";

export function usePermissions() {
  const { userId, currentSchool } = useAppStore();

  const hasPermission = async (resource: string, action: string): Promise<boolean> => {
    if (!userId || !currentSchool) return false;

    // Check if user is school owner (full access)
    const isMaster = await userManagementService.isMasterAccount(userId, currentSchool.id);
    if (isMaster) return true;

    // Check permissions via service
    return userManagementService.hasPermission(
      userId,
      currentSchool.id,
      resource,
      action
    );
  };

  const hasAnyPermission = async (permissions: Array<{ resource: string; action: string }>) => {
    for (const perm of permissions) {
      if (await hasPermission(perm.resource, perm.action)) {
        return true;
      }
    }
    return false;
  };

  const hasAllPermissions = async (permissions: Array<{ resource: string; action: string }>) => {
    for (const perm of permissions) {
      if (!(await hasPermission(perm.resource, perm.action))) {
        return false;
      }
    }
    return true;
  };

  // Get all user permissions
  const { data: userPermissions } = useQuery({
    queryKey: ["user-permissions", userId, currentSchool?.id],
    queryFn: async () => {
      if (!userId || !currentSchool) return [];
      return userManagementService.getUserPermissions(userId, currentSchool.id);
    },
    enabled: !!userId && !!currentSchool,
  });

  // Get user's primary role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", userId, currentSchool?.id],
    queryFn: async () => {
      if (!userId || !currentSchool) return null;
      return userManagementService.getUserRole(userId, currentSchool.id);
    },
    enabled: !!userId && !!currentSchool,
  });

  // Check if user is master account
  const { data: isMaster } = useQuery({
    queryKey: ["is-master", userId, currentSchool?.id],
    queryFn: async () => {
      if (!userId || !currentSchool) return false;
      return userManagementService.isMasterAccount(userId, currentSchool.id);
    },
    enabled: !!userId && !!currentSchool,
  });

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions: userPermissions || [],
    userRole: userRole || null,
    isMaster: isMaster || false,
  };
}