/**
 * Service: userManagementService
 * Complete user management, role assignment, invitations, and permissions
 */

import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  key: string;
  description: string | null;
  category: "school" | "module" | "system";
  module_key: string | null;
  is_master: boolean;
  is_default: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface SchoolMember {
  id: string;
  school_id: string;
  user_id: string;
  role_id: string;
  status: "active" | "inactive" | "pending";
  is_master: boolean;
  joined_at: string;
  updated_at: string;
  user: {
    email: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
  };
  role: {
    id: string;
    name: string;
    key: string;
    description: string | null;
    category: string;
    module_key: string | null;
    is_master: boolean;
  };
}

export interface RoleHistory {
  id: string;
  school_member_id: string;
  old_role_id: string | null;
  new_role_id: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  old_role?: { name: string; key: string };
  new_role?: { name: string; key: string };
  changed_by_user?: { full_name: string; email: string };
}

export interface UserInvitation {
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  role_id: string;
  invited_by: string;
  token: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  role?: {
    name: string;
    key: string;
    description: string | null;
  };
  invited_by_user?: {
    full_name: string;
    email: string;
  };
}

export interface UserPermission {
  permission_key: string;
  resource: string;
  action: string;
}

// ─── User Management Service ──────────────────────────────────────────────────

export const userManagementService = {
  /**
   * Get all users for a school with their roles
   */
  async getSchoolUsers(schoolId: string): Promise<SchoolMember[]> {
    const { data, error } = await supabase
      .from("school_members")
      .select(`
        id,
        school_id,
        user_id,
        role_id,
        status,
        is_master,
        joined_at,
        updated_at,
        user:profiles!inner(
          email,
          full_name,
          phone,
          avatar_url
        ),
        role:roles!inner(
          id,
          name,
          key,
          description,
          category,
          module_key,
          is_master
        )
      `)
      .eq("school_id", schoolId)
      .order("joined_at", { ascending: false });

    if (error) throw error;
    return data as SchoolMember[];
  },

  /**
   * Get available roles for a school based on selected modules
   */
  async getAvailableRoles(schoolId: string): Promise<Role[]> {
    // Get school's selected modules
    const { data: school } = await supabase
      .from("schools")
      .select("feature_flags")
      .eq("id", schoolId)
      .single();

    // For now, return all roles. In production, filter by selected modules
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Role[];
  },

  /**
   * Invite a new user to the school
   */
  async inviteUser(params: {
    schoolId: string;
    email: string;
    fullName: string;
    roleId: string;
    sendWelcome?: boolean;
  }) {
    const { data, error } = await supabase.rpc("invite_user_to_school", {
      p_school_id: params.schoolId,
      p_email: params.email,
      p_full_name: params.fullName,
      p_role_id: params.roleId,
      p_invited_by: (await supabase.auth.getUser()).data.user?.id,
      p_expires_in_hours: 168, // 7 days
    });

    if (error) throw error;
    return data;
  },

  /**
   * Change user's role with audit trail
   */
  async changeUserRole(params: {
    userId: string;
    schoolId: string;
    newRoleId: string;
    reason?: string;
  }) {
    const { data, error } = await supabase.rpc("change_user_role", {
      p_user_id: params.userId,
      p_school_id: params.schoolId,
      p_new_role_id: params.newRoleId,
      p_changed_by: (await supabase.auth.getUser()).data.user?.id,
      p_reason: params.reason || null,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string, schoolId: string) {
    const { error } = await supabase
      .from("school_members")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Reactivate a user
   */
  async reactivateUser(userId: string, schoolId: string) {
    const { error } = await supabase
      .from("school_members")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Get role history for a user
   */
  async getRoleHistory(schoolMemberId: string): Promise<RoleHistory[]> {
    const { data, error } = await supabase
      .from("role_history")
      .select(`
        *,
        old_role:roles!left(name, key),
        new_role:roles!left(name, key),
        changed_by_user:profiles!left(full_name, email)
      `)
      .eq("school_member_id", schoolMemberId)
      .order("changed_at", { ascending: false });

    if (error) throw error;
    return data as RoleHistory[];
  },

  /**
   * Get all invitations for a school
   */
  async getSchoolInvitations(schoolId: string): Promise<UserInvitation[]> {
    const { data, error } = await supabase
      .from("user_invitations")
      .select(`
        *,
        role:roles(name, key, description),
        invited_by_user:profiles!left(full_name, email)
      `)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as UserInvitation[];
  },

  /**
   * Cancel an invitation
   */
  async cancelInvitation(invitationId: string) {
    const { error } = await supabase
      .from("user_invitations")
      .update({ 
        status: "cancelled", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", invitationId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Resend invitation
   */
  async resendInvitation(invitationId: string) {
    const { data, error } = await supabase.rpc("resend_invitation", {
      p_invitation_id: invitationId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Check if current user has a specific permission
   */
  async hasPermission(
    userId: string,
    schoolId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc("user_has_permission", {
      p_user_id: userId,
      p_school_id: schoolId,
      p_resource: resource,
      p_action: action,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get all permissions for a user in a school
   */
  async getUserPermissions(userId: string, schoolId: string): Promise<UserPermission[]> {
    const { data, error } = await supabase
      .from("user_permissions_view")
      .select("permission_key")
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) throw error;

    // Parse permission keys into structured format
    const permissions: UserPermission[] = [];
    (data || []).forEach((item: any) => {
      const [resource, action] = item.permission_key.split(":");
      permissions.push({
        permission_key: item.permission_key,
        resource,
        action,
      });
    });

    return permissions;
  },

  /**
   * Check if user is master account
   */
  async isMasterAccount(userId: string, schoolId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc("is_master_account", {
      p_user_id: userId,
      p_school_id: schoolId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Get user's primary role
   */
  async getUserRole(userId: string, schoolId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("get_user_role", {
      p_user_id: userId,
      p_school_id: schoolId,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Set master account for a school
   */
  async setMasterAccount(userId: string, schoolId: string) {
    // Remove master status from all other users
    await supabase
      .from("school_members")
      .update({ is_master: false })
      .eq("school_id", schoolId)
      .neq("user_id", userId);

    // Set this user as master
    const { error } = await supabase
      .from("school_members")
      .update({ is_master: true })
      .eq("user_id", userId)
      .eq("school_id", schoolId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Get all permissions (for permission management UI)
   */
  async getAllPermissions(): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true })
      .order("action", { ascending: true });

    if (error) throw error;
    return data as Permission[];
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const { data, error } = await supabase
      .from("role_permissions")
      .select(`
        permission:permissions!inner(*)
      `)
      .eq("role_id", roleId);

    if (error) throw error;
    return data.map((item: any) => item.permission) as Permission[];
  },

  /**
   * Update role permissions
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    // Delete existing permissions
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);

    if (deleteError) throw deleteError;

    // Insert new permissions
    if (permissionIds.length > 0) {
      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(
          permissionIds.map((permissionId) => ({
            role_id: roleId,
            permission_id: permissionId,
          }))
        );

      if (insertError) throw insertError;
    }

    return { success: true };
  },
};