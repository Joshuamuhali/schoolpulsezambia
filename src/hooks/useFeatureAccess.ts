import { useAppStore, type FeatureKey } from "@/store/appStore";

export type FeatureAccessResult = {
  /** Feature is enabled and school is active */
  enabled: boolean;
  /** Feature is visible but interactions are blocked */
  locked: boolean;
  /** Current access mode */
  mode: "active" | "preview" | "payment_pending" | "suspended" | "inactive";
  /** Human-readable reason why the feature is locked */
  lockReason: string | null;
};

/**
 * Core feature gating hook.
 * Checks school_feature_flags and school_access_state to determine
 * whether a module is enabled, locked, or in preview.
 */
export function useFeatureAccess(featureKey: FeatureKey): FeatureAccessResult {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const userRole = useAppStore((s) => s.userRole);

  // Supa admins always have full access
  if (userRole === "supa_admin") {
    return { enabled: true, locked: false, mode: "active", lockReason: null };
  }

  // No school session — lock everything
  if (!currentSchool) {
    return {
      enabled: false,
      locked: true,
      mode: "inactive",
      lockReason: "No school session active.",
    };
  }

  const { accessState, featureFlags } = currentSchool;

  // Suspended school — hard lock
  if (accessState === "suspended") {
    return {
      enabled: false,
      locked: true,
      mode: "suspended",
      lockReason: "Your school account has been suspended. Please contact support.",
    };
  }

  // Preview mode — visible but locked
  if (accessState === "preview") {
    return {
      enabled: false,
      locked: true,
      mode: "preview",
      lockReason: "Your school is in Preview Mode. Activate to unlock this feature.",
    };
  }

  // Payment pending — partially locked
  if (accessState === "payment_pending") {
    return {
      enabled: false,
      locked: true,
      mode: "payment_pending",
      lockReason: "Payment is being verified. Access will unlock once confirmed.",
    };
  }

  // School is active — check specific feature flag
  const flagStatus = featureFlags[featureKey];

  if (flagStatus === "active") {
    return { enabled: true, locked: false, mode: "active", lockReason: null };
  }

  return {
    enabled: false,
    locked: true,
    mode: "inactive",
    lockReason:
      "This feature is not activated for your school. Contact your admin or upgrade your plan.",
  };
}
