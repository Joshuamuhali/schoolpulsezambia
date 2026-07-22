/**
 * Module Pricing Service
 * Handles module pricing, cost calculations, and subscription management
 * All modules are paid - no free modules
 */

import { supabase } from "@/lib/supabase/client";

// Cast supabase to any to avoid TypeScript strict typing issues
const db = supabase as any;

// ============================================================================
// TYPES
// ============================================================================

export interface Feature {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  icon: string;
  monthly_price: number;
  quarterly_price: number;
  yearly_price: number;
  setup_price: number;
  is_paid: boolean;
  is_core: boolean;
  display_order: number;
  badge: string | null;
  status: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  setup_fee: { amount: number; currency: string };
  currency: string;
  payment_methods: string[];
  subscription_periods: string[];
}

export interface ModuleCost {
  setup_fee: number;
  subtotal: number;
  discount: number;
  total: number;
  total_with_discount: number;
  savings: number;
  period: string;
  module_count: number;
}

export interface SchoolFeature {
  id: string;
  school_id: string;
  feature_id: string;
  enabled: boolean;
  billing_period: string;
  price_paid: number;
  subscription_start_date: string;
  subscription_end_date: string;
  features?: Feature;
}

// ============================================================================
// MODULE PRICING SERVICE
// ============================================================================

export const modulePricingService = {
  /**
   * Get all features with pricing
   */
  async getAllFeatures(): Promise<Feature[]> {
    const { data, error } = await db
      .from("features")
      .select("*")
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Feature[];
  },

  /**
   * Get active visible features
   */
  async getActiveFeatures(): Promise<Feature[]> {
    const { data, error } = await db
      .from("features")
      .select("*")
      .eq("status", "active")
      .eq("is_visible", true)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Feature[];
  },

  /**
   * Get features by category
   */
  async getFeaturesByCategory(category: string): Promise<Feature[]> {
    const { data, error } = await db
      .from("features")
      .select("*")
      .eq("category", category)
      .eq("status", "active")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Feature[];
  },

  /**
   * Get core features (required modules)
   */
  async getCoreFeatures(): Promise<Feature[]> {
    const { data, error } = await db
      .from("features")
      .select("*")
      .eq("is_core", true)
      .eq("status", "active")
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    if (error) throw error;
    return data as Feature[];
  },

  /**
   * Get school's enabled features
   */
  async getSchoolFeatures(schoolId: string): Promise<SchoolFeature[]> {
    const { data, error } = await db
      .from("school_features")
      .select("*, features(*)")
      .eq("school_id", schoolId)
      .eq("enabled", true);

    if (error) throw error;
    return data as SchoolFeature[];
  },

  /**
   * Calculate cost for selected modules
   */
  async calculateModuleCost(
    moduleIds: string[],
    period: "monthly" | "quarterly" | "yearly" = "monthly"
  ): Promise<ModuleCost> {
    const { data, error } = await db.rpc("calculate_module_cost", {
      p_module_ids: moduleIds,
      p_period: period,
    });

    if (error) throw error;
    return data as ModuleCost;
  },

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    const { data, error } = await db.rpc("get_system_settings");

    if (error) throw error;
    return data as SystemSettings;
  },

  /**
   * Get setup fee
   */
  async getSetupFee(): Promise<number> {
    const { data, error } = await db
      .from("system_settings")
      .select("value")
      .eq("key", "setup_fee")
      .single();

    if (error) throw error;
    return (data.value as any).amount;
  },

  /**
   * Enable feature for school
   */
  async enableFeature(
    schoolId: string,
    featureId: string,
    billingPeriod: "monthly" | "quarterly" | "yearly",
    userId: string
  ): Promise<void> {
    const { data: feature } = await db
      .from("features")
      .select("monthly_price", "quarterly_price", "yearly_price")
      .eq("id", featureId)
      .single();

    const priceMap = {
      monthly: feature.monthly_price,
      quarterly: feature.quarterly_price,
      yearly: feature.yearly_price,
    };

    const price = priceMap[billingPeriod];

    const { error } = await db.from("school_features").upsert({
      school_id: schoolId,
      feature_id: featureId,
      enabled: true,
      billing_period: billingPeriod,
      price_paid: price,
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: this.calculateEndDate(billingPeriod),
    });

    if (error) throw error;
  },

  /**
   * Disable feature for school
   */
  async disableFeature(schoolId: string, featureId: string): Promise<void> {
    const { error } = await db
      .from("school_features")
      .update({ enabled: false })
      .eq("school_id", schoolId)
      .eq("feature_id", featureId);

    if (error) throw error;
  },

  /**
   * Update feature pricing (admin)
   */
  async updateFeaturePricing(
    featureId: string,
    pricing: {
      monthly_price?: number;
      quarterly_price?: number;
      yearly_price?: number;
      setup_price?: number;
    },
    userId: string,
    reason?: string
  ): Promise<void> {
    // Get current pricing
    const { data: current } = await db
      .from("features")
      .select("monthly_price", "quarterly_price", "yearly_price", "setup_price")
      .eq("id", featureId)
      .single();

    // Update pricing
    const { error: updateError } = await db
      .from("features")
      .update({
        ...pricing,
        updated_at: new Date().toISOString(),
      })
      .eq("id", featureId);

    if (updateError) throw updateError;

    // Log pricing history
    const { error: historyError } = await db.from("feature_pricing_history").insert({
      feature_id: featureId,
      old_monthly_price: current.monthly_price,
      new_monthly_price: pricing.monthly_price ?? current.monthly_price,
      old_quarterly_price: current.quarterly_price,
      new_quarterly_price: pricing.quarterly_price ?? current.quarterly_price,
      old_yearly_price: current.yearly_price,
      new_yearly_price: pricing.yearly_price ?? current.yearly_price,
      old_setup_price: current.setup_price,
      new_setup_price: pricing.setup_price ?? current.setup_price,
      changed_by: userId,
      change_reason: reason,
      effective_date: new Date().toISOString(),
    });

    if (historyError) throw historyError;
  },

  /**
   * Get pricing history for a feature
   */
  async getPricingHistory(featureId: string): Promise<any[]> {
    const { data, error } = await db
      .from("feature_pricing_history")
      .select("*, auth.users(email)")
      .eq("feature_id", featureId)
      .order("effective_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Update system settings (admin)
   */
  async updateSystemSetting(
    key: string,
    value: any,
    userId: string
  ): Promise<void> {
    const { error } = await db
      .from("system_settings")
      .update({
        value,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (error) throw error;
  },

  /**
   * Get module statistics (admin)
   */
  async getModuleStats(): Promise<{
    total_modules: number;
    core_modules: number;
    active_modules: number;
    schools_using_module: Record<string, number>;
  }> {
    const { data: features } = await db
      .from("features")
      .select("id, is_core, status");

    const { data: schoolFeatures } = await db
      .from("school_features")
      .select("feature_id, school_id")
      .eq("enabled", true);

    const totalModules = features?.length || 0;
    const coreModules = features?.filter((f: Feature) => f.is_core).length || 0;
    const activeModules = features?.filter((f: Feature) => f.status === "active").length || 0;

    const schoolsUsingModule: Record<string, number> = {};
    schoolFeatures?.forEach((sf: SchoolFeature) => {
      schoolsUsingModule[sf.feature_id] = (schoolsUsingModule[sf.feature_id] || 0) + 1;
    });

    return {
      total_modules: totalModules,
      core_modules: coreModules,
      active_modules: activeModules,
      schools_using_module: schoolsUsingModule,
    };
  },

  /**
   * Helper: Calculate subscription end date
   */
  calculateEndDate(period: "monthly" | "quarterly" | "yearly"): string {
    const now = new Date();
    const months = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12;
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  },
};
