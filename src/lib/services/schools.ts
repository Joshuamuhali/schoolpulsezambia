/**
 * Service: schools — aligned to real schema.
 *
 * Key differences from original:
 *  - schools.state (not access_state)
 *  - school_feature_flags.feature_id (UUID FK, not feature_key text)
 *  - feature_pricing is a separate table joined to feature_catalog
 *  - No payment_verifications table — uses invoices/payments
 *  - No audit_logs.schools join (audit_logs.school_id is nullable UUID)
 */
import { supabase } from "@/lib/supabase/client";
import type { School, SchoolFeatureFlag, FeatureCatalog } from "@/lib/supabase/types";

// ─── Admin: all schools ───────────────────────────────────────────────────────

export async function fetchAllSchools(): Promise<School[]> {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, subdomain, state, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as School[];
}

export async function fetchSchoolById(schoolId: string): Promise<School> {
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();

  if (error) throw error;
  return data as School;
}

// ─── Admin: platform stats ────────────────────────────────────────────────────

export async function fetchAdminStats() {
  const [total, active, preview, revenue] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("state", "active"),
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("state", "preview"),
    supabase.from("payments").select("amount"),
  ]);

  if (total.error)   throw total.error;
  if (active.error)  throw active.error;
  if (preview.error) throw preview.error;
  if (revenue.error) throw revenue.error;

  const totalRevenue = (revenue.data ?? []).reduce(
    (sum: number, p: { amount: number }) => sum + Number(p.amount), 0
  );

  return {
    totalSchools:    total.count  ?? 0,
    activeSchools:   active.count ?? 0,
    previewSchools:  preview.count ?? 0,
    pendingActivations: preview.count ?? 0,
    totalRevenue,
  };
}

// ─── Landing Page Stats ───────────────────────────────────────────────────────

export async function fetchLandingStats() {
  const [schools, students] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  return {
    schools: schools.count ?? 0,
    students: students.count ?? 0,
    uptime: "99.9%", // Usually hardcoded for marketing
  };
}

// ─── Admin: update school state ───────────────────────────────────────────────

export async function updateSchoolState(schoolId: string, state: School["state"]) {
  const { error } = await supabase
    .from("schools")
    .update({ state })
    .eq("id", schoolId);

  if (error) throw error;
}

// ─── Feature catalog ──────────────────────────────────────────────────────────

export async function fetchFeatureCatalog() {
  const { data, error } = await supabase
    .from("feature_catalog")
    .select(`
      id, key, name, description, category, created_at,
      feature_pricing ( monthly_price, setup_price, currency, is_active )
    `)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

// ─── School feature flags ─────────────────────────────────────────────────────

export async function fetchSchoolFeatureFlags(schoolId: string) {
  const { data, error } = await supabase
    .from("school_feature_flags")
    .select(`
      id, school_id, status, enabled_at,
      feature_catalog ( id, key, name )
    `)
    .eq("school_id", schoolId);

  if (error) throw error;
  return data ?? [];
}

export async function upsertFeatureFlag(
  schoolId: string,
  featureId: string,
  status: "active" | "inactive" | "locked"
) {
  const { error } = await supabase
    .from("school_feature_flags")
    .upsert(
      {
        school_id:  schoolId,
        feature_id: featureId,
        status,
        enabled_at: status === "active" ? new Date().toISOString() : null,
      },
      { onConflict: "school_id,feature_id" }
    );

  if (error) throw error;
}

// ─── Recent audit activity ────────────────────────────────────────────────────

export async function fetchRecentAuditLogs(limit = 20) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, school_id, actor_id, created_at, after_state")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
