/**
 * Subscription Service
 * Manages school subscriptions, payments, and feature access
 */

import { supabase } from "@/lib/supabase/client";

// Cast supabase to any to avoid TypeScript issues with RPC calls
const db = supabase as any;

// ============================================================================
// TYPES
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_period: "monthly" | "quarterly" | "yearly";
  status: "active" | "archived";
  features: string[];
  max_students?: number;
  max_staff?: number;
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  icon?: string;
  is_core: boolean;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface TenantSubscription {
  id: string;
  tenant_id: string;
  plan_id?: string;
  status: "trial" | "pending_payment" | "active" | "expired" | "suspended";
  start_date: string;
  expiry_date?: string;
  trial_end_date?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayment {
  id: string;
  tenant_id: string;
  subscription_id?: string;
  amount: number;
  payment_method: string;
  reference: string;
  proof_url?: string;
  status: "pending" | "verified" | "rejected";
  submitted_at: string;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantFeature {
  id: string;
  tenant_id: string;
  feature_id: string;
  enabled: boolean;
  activated_by?: string;
  activated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAlert {
  id: string;
  tenant_id: string;
  type: "trial_expiring" | "subscription_expiring" | "subscription_expired" | "payment_pending";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  status: "active" | "acknowledged" | "resolved";
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUBSCRIPTION SERVICE
// ============================================================================

export const subscriptionService = {
  /**
   * Get all subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await db
      .from("subscription_plans")
      .select("*")
      .eq("status", "active")
      .order("price");

    if (error) throw error;
    return data as SubscriptionPlan[];
  },

  /**
   * Get subscription plan by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await db
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error) throw error;
    return data as SubscriptionPlan;
  },

  /**
   * Get all features
   */
  async getFeatures(): Promise<Feature[]> {
    const { data, error } = await db
      .from("features")
      .select("*")
      .eq("status", "active")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return data as Feature[];
  },

  /**
   * Get tenant subscription
   */
  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const { data, error } = await db
      .from("tenant_subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;
    return data as TenantSubscription;
  },

  /**
   * Create or update tenant subscription
   */
  async upsertTenantSubscription(
    tenantId: string,
    subscription: Partial<TenantSubscription>
  ): Promise<TenantSubscription> {
    const { data, error } = await db
      .from("tenant_subscriptions")
      .upsert({
        tenant_id: tenantId,
        ...subscription,
        updated_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  /**
   * Get tenant features
   */
  async getTenantFeatures(tenantId: string): Promise<TenantFeature[]> {
    const { data, error } = await db
      .from("tenant_features")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("feature_id");

    if (error) throw error;
    return data as TenantFeature[];
  },

  /**
   * Check if tenant has access to a feature
   */
  async hasFeatureAccess(tenantId: string, featureCode: string): Promise<boolean> {
    const { data, error } = await db.rpc("check_tenant_feature_access", {
      p_tenant_id: tenantId,
      p_feature_code: featureCode,
    });

    if (error) throw error;
    return data as boolean;
  },

  /**
   * Enable feature for tenant
   */
  async enableFeature(tenantId: string, featureId: string, activatedBy: string): Promise<void> {
    const { error } = await db.rpc("enable_tenant_feature", {
      p_tenant_id: tenantId,
      p_feature_id: featureId,
      p_activated_by: activatedBy,
    });

    if (error) throw error;
  },

  /**
   * Disable feature for tenant
   */
  async disableFeature(tenantId: string, featureId: string): Promise<void> {
    const { error } = await db.rpc("disable_tenant_feature", {
      p_tenant_id: tenantId,
      p_feature_id: featureId,
    });

    if (error) throw error;
  },

  /**
   * Submit payment proof
   */
  async submitPayment(payment: {
    tenant_id: string;
    amount: number;
    payment_method: string;
    reference: string;
    proof_url?: string;
  }): Promise<SubscriptionPayment> {
    const { data, error } = await db
      .from("subscription_payments")
      .insert(payment as any)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  /**
   * Get tenant payments
   */
  async getTenantPayments(tenantId: string): Promise<SubscriptionPayment[]> {
    const { data, error } = await db
      .from("subscription_payments")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("submitted_at", { ascending: false });

    if (error) throw error;
    return data as SubscriptionPayment[];
  },

  /**
   * Get all pending payments (admin)
   */
  async getPendingPayments(): Promise<SubscriptionPayment[]> {
    const { data, error } = await db
      .from("subscription_payments")
      .select("*")
      .eq("status", "pending")
      .order("submitted_at", { ascending: true });

    if (error) throw error;
    return data as SubscriptionPayment[];
  },

  /**
   * Approve payment (admin)
   */
  async approvePayment(paymentId: string, verifiedBy: string): Promise<void> {
    const { error } = await db.rpc("approve_subscription_payment", {
      p_payment_id: paymentId,
      p_verified_by: verifiedBy,
    });

    if (error) throw error;
  },

  /**
   * Reject payment (admin)
   */
  async rejectPayment(paymentId: string, rejectionReason: string): Promise<void> {
    const { error } = await db.rpc("reject_subscription_payment", {
      p_payment_id: paymentId,
      p_rejection_reason: rejectionReason,
    });

    if (error) throw error;
  },

  /**
   * Get all subscriptions (admin)
   */
  async getAllSubscriptions(): Promise<
    (TenantSubscription & {
      tenants: { name: string; slug: string };
      subscription_plans: { name: string; price: number };
    })[]
  > {
    const { data, error } = await db
      .from("tenant_subscriptions")
      .select(
        `
        *,
        tenants (name, slug),
        subscription_plans (name, price)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as any;
  },

  /**
   * Get subscription alerts (admin)
   */
  async getAlerts(status?: string): Promise<SubscriptionAlert[]> {
    let query = db
      .from("subscription_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;
    return data as SubscriptionAlert[];
  },

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const { error } = await db
      .from("subscription_alerts")
      .update({
        status: "acknowledged",
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;
  },

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await db
      .from("subscription_alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", alertId);

    if (error) throw error;
  },

  /**
   * Get subscription statistics (admin)
   */
  async getSubscriptionStats(): Promise<{
    total_schools: number;
    active_schools: number;
    trial_schools: number;
    expired_schools: number;
    pending_payments: number;
    total_revenue: number;
  }> {
    const { data, error } = await db.rpc("get_subscription_stats");

    if (error) throw error;
    return data as any;
  },
};