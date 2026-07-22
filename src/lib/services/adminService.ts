
/**
 * Service: admin — Platform admin operations
 *
 * Provides functions for:
 * - School CRUD operations
 * - User management
 * - Payment management
 * - System logs and monitoring
 */

import { supabase as supabaseClient } from "@/lib/supabase/client";

// Helper to call RPC functions that don't have TypeScript types yet
// @ts-ignore - Supabase hasn't generated types for custom RPC functions
const rpc = supabaseClient.rpc.bind(supabaseClient.rpc);

// Bypass TypeScript strict typing for Supabase operations
// @ts-ignore - TypeScript strict mode bypass
const db = supabaseClient as any;

// ─── School Management ────────────────────────────────────────────────────────

export async function createSchool(schoolData: {
  name: string;
  subdomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  state?: string;
}) {
  // @ts-ignore - RPC function not in Supabase generated types yet
  const { data, error } = await (rpc as any)("create_school_with_admin", {
    p_name: schoolData.name,
    p_subdomain: schoolData.subdomain,
    p_admin_email: schoolData.adminEmail,
    p_admin_password: schoolData.adminPassword,
    p_admin_first_name: schoolData.adminFirstName,
    p_admin_last_name: schoolData.adminLastName,
    p_state: schoolData.state || "preview",
  });

  if (error) throw error;
  return data;
}

export async function updateSchool(
  schoolId: string,
  updates: {
    name?: string;
    subdomain?: string;
    state?: string;
  }
) {
  const { data, error } = await db
    .from("schools")
    .update(updates)
    .eq("id", schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSchool(schoolId: string) {
  const { error } = await db
    .from("schools")
    .delete()
    .eq("id", schoolId);

  if (error) throw error;
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function fetchAllUsers(filters?: {
  search?: string;
  role?: string;
  schoolId?: string;
}) {
  let query = db
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      phone,
      created_at,
      school_members (
        school_id,
        role,
        is_active,
        schools ( id, name )
      )
    `)
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  if (filters?.schoolId) {
    query = query.eq("school_members.school_id", filters.schoolId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function createPlatformAdmin(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "operations_admin" | "finance_admin" | "support_admin";
}) {
  // @ts-ignore - RPC function not in Supabase generated types yet
  const { data, error } = await (rpc as any)("create_platform_admin", {
    p_email: userData.email,
    p_password: userData.password,
    p_first_name: userData.firstName,
    p_last_name: userData.lastName,
    p_role: userData.role,
  });

  if (error) throw error;
  return data;
}

export async function updateUserRole(
  userId: string,
  schoolId: string | null,
  role: string,
  isActive: boolean
) {
  const { data, error } = await db
    .from("school_members")
    .update({ role, is_active: isActive })
    .eq("user_id", userId)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function disableUser(userId: string) {
  const { error } = await db
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) throw error;
}

export async function enableUser(userId: string) {
  const { error } = await db
    .from("profiles")
    .update({ is_active: true })
    .eq("id", userId);

  if (error) throw error;
}

// ─── Payment Management ───────────────────────────────────────────────────────

export async function fetchAllPayments(filters?: {
  schoolId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = db
    .from("school_payments")
    .select(`
      id,
      amount,
      currency,
      status,
      payment_method,
      reference,
      created_at,
      verified_at,
      schools ( id, name ),
      profiles ( id, full_name )
    `)
    .order("created_at", { ascending: false });

  if (filters?.schoolId) {
    query = query.eq("school_id", filters.schoolId);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function approvePayment(paymentId: string) {
  // @ts-ignore - RPC function not in Supabase generated types yet
  const { data, error } = await (rpc as any)("approve_payment", {
    p_payment_id: paymentId,
  });

  if (error) throw error;
  return data;
}

export async function rejectPayment(paymentId: string, reason: string) {
  // @ts-ignore - RPC function not in Supabase generated types yet
  const { data, error } = await (rpc as any)("reject_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });

  if (error) throw error;
  return data;
}

// ─── System Logs & Monitoring ─────────────────────────────────────────────────

export async function fetchSystemLogs(filters?: {
  action?: string;
  tableName?: string;
  schoolId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  let query = db
    .from("audit_logs")
    .select(`
      id,
      action,
      table_name,
      user_id,
      school_id,
      created_at,
      metadata,
      profiles ( id, full_name, email ),
      schools ( id, name )
    `)
    .order("created_at", { ascending: false });

  if (filters?.action) {
    query = query.eq("action", filters.action);
  }

  if (filters?.tableName) {
    query = query.eq("table_name", filters.tableName);
  }

  if (filters?.schoolId) {
    query = query.eq("school_id", filters.schoolId);
  }

  if (filters?.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function fetchSystemHealth() {
  // @ts-ignore - RPC function not in Supabase generated types yet
  const { data, error } = await (rpc as any)("get_system_health");

  if (error) throw error;
  return data;
}

// ─── Platform Statistics ──────────────────────────────────────────────────────

export async function fetchPlatformUserStats() {
  const [totalUsers, activeUsers, admins, teachers, parents, students] =
    await Promise.all([
      db.from("profiles").select("id", { count: "exact", head: true }),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      db
        .from("school_members")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "admin"),
      db
        .from("school_members")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "teacher"),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("user_type", "parent"),
      db.from("students").select("id", { count: "exact", head: true }),
    ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    admins: admins.count ?? 0,
    teachers: teachers.count ?? 0,
    parents: parents.count ?? 0,
    students: students.count ?? 0,
  };
}

export async function fetchPaymentStats() {
  const [pending, approved, rejected, totalAmount] = await Promise.all([
    db
      .from("school_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("school_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified"),
    db
      .from("school_payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
    db
      .from("school_payments")
      .select("amount")
      .eq("status", "verified"),
  ]);

  const totalRevenue = (totalAmount.data ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount),
    0
  );

  return {
    pendingPayments: pending.count ?? 0,
    approvedPayments: approved.count ?? 0,
    rejectedPayments: rejected.count ?? 0,
    totalRevenue,
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

async function fetchRoleId(roleKey: string): Promise<string | null> {
  // Roles are stored as text in school_members, not in a separate roles table
  return roleKey;
}

export async function fetchRoles() {
  // Return common roles since there's no roles table
  return [
    { id: "admin", key: "admin", name: "Admin", description: "School administrator" },
    { id: "teacher", key: "teacher", name: "Teacher", description: "Teaching staff" },
    { id: "parent", key: "parent", name: "Parent", description: "Parent/Guardian" },
    { id: "student", key: "student", name: "Student", description: "Student" },
  ];
}

export async function fetchSubscriptionPlans() {
  const { data, error } = await db
    .from("subscription_plans")
    .select(`
      id,
      name,
      description,
      price,
      currency,
      billing_cycle,
      features,
      is_active,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createSubscriptionPlan(plan: {
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_cycle: string;
  features?: string[];
  is_active?: boolean;
}) {
  const { data, error } = await db
    .from("subscription_plans")
    .insert(plan)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubscriptionPlan(
  planId: string,
  updates: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    billing_cycle?: string;
    features?: string[];
    is_active?: boolean;
  }
) {
  const { data, error } = await db
    .from("subscription_plans")
    .update(updates)
    .eq("id", planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSubscriptionPlan(planId: string) {
  const { error } = await db
    .from("subscription_plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;
}
