

/**
 * Service: users
 * Profile, RBAC, and auth-related queries.
 */
import { supabase } from "@/lib/supabase/client";

// ─── Deduplication Logic ─────────────────────────────────────────────────────
const requestHistory = new Map<string, number>();

/**
 * Prevents duplicate requests within a certain time window.
 * Returns true if the request is a duplicate.
 */
function isDuplicate(key: string, windowMs: number = 5000): boolean {
  const now = Date.now();
  const lastTime = requestHistory.get(key) || 0;
  if (now - lastTime < windowMs) return true;
  requestHistory.set(key, now);
  return false;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signUp(email: string, password: string, fullName: string) {
  if (isDuplicate(`signup:${email}`)) {
    throw new Error("Too many attempts. Please wait a moment.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithOtp(email: string) {
  if (isDuplicate(`otp:${email}`)) {
    throw new Error("Too many attempts. Please wait a moment.");
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  return data;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
  return data;
}

export async function onboardSchool(
  schoolName: string,
  subdomain: string,
  adminId: string,
  selectedModules?: string[]
): Promise<{ school_id: string; school_name: string; subdomain: string; state: string }> {
  if (isDuplicate(`onboard:${subdomain}`)) {
    throw new Error("An onboarding request for this subdomain is already in progress. Please wait.");
  }

  const { data, error } = await (supabase as any).rpc("create_school_onboarding", {
    p_school_name: schoolName,
    p_subdomain: subdomain,
    p_admin_id: adminId,
    p_selected_modules: selectedModules,
  });
  
  if (error) throw error;
  
  // Type assertion for the returned JSONB
  return data as { school_id: string; school_name: string; subdomain: string; state: string };
}

export async function signIn(email: string, password: string) {
  if (isDuplicate(`signin:${email}`)) {
    throw new Error("Too many sign-in attempts. Please wait a moment.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  if (isDuplicate(`reset:${email}`)) {
    throw new Error("Reset email already sent recently. Please check your inbox or wait a moment.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function promoteToSuperAdmin(email: string) {
  const { error } = await (supabase as any).rpc("promote_to_super_admin_by_email", {
    target_email: email,
  });
  if (error) throw error;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function fetchCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(updates: { full_name?: string; phone?: string; avatar_url?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await (supabase as any)
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) throw error;
}

// ─── RBAC: get user permissions ──────────────────────────────────────────────

export async function fetchUserPermissions(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("school_members")
    .select(`
      roles (
        role_permissions (
          permissions ( key )
        )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw error;

  const permissions: string[] = [];
  (data ?? []).forEach((sm) => {
    const roles = sm.roles as { role_permissions: { permissions: { key: string } }[] } | null;
    if (roles) {
      (roles.role_permissions ?? []).forEach((rp) => {
        if (rp.permissions?.key) permissions.push(rp.permissions.key);
      });
    }
  });

  return [...new Set(permissions)];
}

// ─── School users list (admin) ────────────────────────────────────────────────

export async function fetchSchoolUsers(schoolId: string) {
  const { data, error } = await (supabase as any)
    .from("school_members")
    .select(`
      user_id,
      status,
      profiles:user_id ( id, full_name, email, phone, created_at ),
      roles ( name, key )
    `)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
