// ============================================================================
// FEATURE MANAGEMENT TYPES
// Complete type definitions for feature lifecycle management
// ============================================================================

export type FeatureStatus = 'active' | 'paused' | 'expired' | 'pending' | 'removed';
export type FeatureChangeType = 'add' | 'remove';
export type ChangeRequestStatus = 'pending' | 'approved' | 'executed' | 'rejected';
export type BillingStatus = 'paid' | 'pending' | 'failed' | 'refunded' | 'paused' | 'cancelled';

// ============================================================================
// FEATURE CATALOG (Platform-wide features)
// ============================================================================

export interface Feature {
  id: string;
  code: string;
  name: string;
  description: string;
  category: FeatureCategory;
  monthly_price: number;
  setup_fee: number;
  is_core: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Pricing mutability fields
  price_monthly: number;
  price_termly: number;
  price_annual: number;
  billing_frequency: "monthly" | "termly" | "annual";
  is_price_editable: boolean;
  last_price_update_by: string | null;
  last_price_update_at: string | null;
  price_change_reason: string | null;
}

export type FeatureCategory = 
  | 'core'
  | 'academic'
  | 'finance'
  | 'communication'
  | 'hr'
  | 'analytics'
  | 'other';

// ============================================================================
// SCHOOL FEATURES (Features subscribed by a school)
// ============================================================================

export interface SchoolFeature {
  id: string;
  school_id: string;
  feature_code: string;
  status: FeatureStatus;
  enabled: boolean;
  price_paid: number;
  activated_at: string;
  expires_at: string | null;
  grace_period_ends_at: string | null;
  paused_reason: string | null;
  paused_at: string | null;
  removal_requested_at: string | null;
  removal_effective_date: string | null;
  added_at: string;
  updated_at: string;
  
  // Joined data
  feature?: Feature;
}

// ============================================================================
// FEATURE CHANGE REQUESTS (Add/Remove features)
// ============================================================================

export interface FeatureChangeRequest {
  id: string;
  school_id: string;
  feature_code: string;
  change_type: FeatureChangeType;
  status: ChangeRequestStatus;
  requested_at: string;
  effective_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  feature?: Feature;
  school?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// BILLING HISTORY
// ============================================================================

export interface FeatureBillingHistory {
  id: string;
  school_id: string;
  feature_code: string;
  amount: number;
  payment_id: string | null;
  billing_month: string; // First day of month (DATE format)
  status: BillingStatus;
  created_at: string;
  updated_at: string;
  
  // Joined data
  feature?: Feature;
  payment?: SchoolPayment;
}

// ============================================================================
// BILLING SETTINGS
// ============================================================================

export interface BillingSettings {
  id: string;
  school_id: string | null; // null = global default
  grace_period_days: number;
  pause_after_days: number;
  reminder_days: number[];
  billing_day: number;
  auto_pause_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SCHOOL PAYMENTS (Existing - for reference)
// ============================================================================

export interface SchoolPayment {
  id: string;
  school_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string;
  proof_url: string | null;
  status: PaymentStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'airtel' | 'mtn' | 'bank_transfer' | 'cash';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

// ============================================================================
// FEATURE SELECTION (School's current selection)
// ============================================================================

export interface FeatureSelection {
  feature_code: string;
  feature: Feature;
  is_selected: boolean;
  is_currently_active: boolean;
  monthly_price: number;
}

export interface FeatureSubscriptionSummary {
  selected_features: FeatureSelection[];
  current_monthly_total: number;
  new_monthly_total: number;
  setup_fees_total: number;
  features_to_add: FeatureSelection[];
  features_to_remove: FeatureSelection[];
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateFeatureRequest {
  code: string;
  name: string;
  description: string;
  category: FeatureCategory;
  monthly_price: number;
  setup_fee: number;
  is_core?: boolean;
  is_active?: boolean;
}

export interface UpdateFeatureRequest {
  name?: string;
  description?: string;
  category?: FeatureCategory;
  monthly_price?: number;
  setup_fee?: number;
  is_core?: boolean;
  is_active?: boolean;
}

export interface SubscribeToFeaturesRequest {
  feature_codes: string[];
  payment_method: PaymentMethod;
  reference_number: string;
  proof_url?: string;
}

export interface UpdateSchoolFeatureRequest {
  status?: FeatureStatus;
  enabled?: boolean;
  notes?: string;
}

export interface ApprovePaymentRequest {
  approved: boolean;
  notes?: string;
}

export interface FeatureOverrideRequest {
  feature_code: string;
  status: FeatureStatus;
  enabled: boolean;
  reason: string;
}

// ============================================================================
// DASHBOARD / UI TYPES
// ============================================================================

export interface FeatureStats {
  total_features: number;
  active_features: number;
  paused_features: number;
  expired_features: number;
  pending_features: number;
  monthly_revenue: number;
  adoption_rate: number; // percentage
}

export interface SchoolFeatureStats {
  total_available: number;
  total_active: number;
  total_paused: number;
  monthly_cost: number;
  pending_payments: number;
  next_billing_date: string | null;
}

export interface BillingOverview {
  total_schools: number;
  schools_paid: number;
  schools_pending: number;
  schools_overdue: number;
  total_revenue: number;
  pending_revenue: number;
}

// ============================================================================
// AUTOMATION TYPES
// ============================================================================

export interface BillingReminder {
  school_id: string;
  feature_code: string;
  days_until_due: number;
  amount_due: number;
  reminder_type: 'upcoming' | 'due_soon' | 'overdue' | 'grace_period';
}

export interface AutomatedAction {
  action: 'pause_features' | 'send_reminder' | 'reactivate_features' | 'generate_invoice';
  school_id: string;
  feature_codes?: string[];
  reason?: string;
  executed_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getFeatureStatusColor = (status: FeatureStatus): string => {
  switch (status) {
    case 'active':
      return 'text-success bg-success/10';
    case 'paused':
      return 'text-warning bg-warning/10';
    case 'expired':
      return 'text-destructive bg-destructive/10';
    case 'pending':
      return 'text-info bg-info/10';
    case 'removed':
      return 'text-muted-foreground bg-muted';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export const getFeatureStatusLabel = (status: FeatureStatus): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'expired':
      return 'Expired';
    case 'pending':
      return 'Pending';
    case 'removed':
      return 'Removed';
    default:
      return status;
  }
};

export const formatCurrency = (amount: number | null | undefined): string => {
  const safeAmount = amount ?? 0;
  return `K${safeAmount.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const calculateProratedAmount = (
  monthlyPrice: number,
  startDate: Date,
  endDate: Date
): number => {
  const daysInMonth = new Date(
    endDate.getFullYear(),
    endDate.getMonth() + 1,
    0
  ).getDate();
  const daysRemaining = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const prorated = (monthlyPrice / daysInMonth) * daysRemaining;
  return Math.round(prorated * 100) / 100;
};