/**
 * App store — session state only.
 * Populated exclusively by useAuth after a real Supabase session loads.
 * NO demo seeds. NO hardcoded roles. NO mock data.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types (mirrors DB enums) ─────────────────────────────────────────────────

export type UserRole =
  | "supa_admin"
  | "operations_admin"
  | "finance_admin"
  | "support_admin"
  | "school_owner"
  | "school_admin"
  | "academic_manager"
  | "bursar"
  | "teacher"
  | "class_teacher"
  | "parent"
  | "student";

export type AccessState = "draft" | "preview" | "payment_pending" | "active" | "suspended";

export type FeatureKey =
  | "students"
  | "teachers"
  | "attendance"
  | "exams"
  | "finance"
  | "communication"
  | "timetable"
  | "parent_portal"
  | "analytics"
  | "reports";

export type FeatureStatus = "active" | "inactive";

export type SchoolFeatureFlags = Record<FeatureKey, FeatureStatus>;

export type School = {
  id: string;
  name: string;
  subdomain: string;
  accessState: AccessState;
  featureFlags: Record<FeatureKey, FeatureStatus>;
};

// ─── Store ────────────────────────────────────────────────────────────────────

type AppStore = {
  userRole: UserRole | null;
  userId: string | null;
  currentSchool: School | null;
  contextMismatch: { targetSubdomain: string; targetSchoolId: string; targetSchoolName: string } | null;

  setUserRole: (role: UserRole) => void;
  setUserId: (id: string) => void;
  setCurrentSchool: (school: School) => void;
  setAccessState: (state: AccessState) => void;
  setFeatureFlag: (key: FeatureKey, status: FeatureStatus) => void;
  setContextMismatch: (mismatch: { targetSubdomain: string; targetSchoolId: string; targetSchoolName: string } | null) => void;
  clearSession: () => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userRole: null,
      userId: null,
      currentSchool: null,
      contextMismatch: null,

      setUserRole: (role) => set({ userRole: role }),
      setUserId: (id) => set({ userId: id }),

      setCurrentSchool: (school) => set({ currentSchool: school, contextMismatch: null }),

      setAccessState: (state) =>
        set((s) =>
          s.currentSchool
            ? { currentSchool: { ...s.currentSchool, accessState: state } }
            : {}
        ),

      setFeatureFlag: (key, status) =>
        set((s) =>
          s.currentSchool
            ? {
                currentSchool: {
                  ...s.currentSchool,
                  featureFlags: { ...s.currentSchool.featureFlags, [key]: status },
                },
              }
            : {}
        ),

      setContextMismatch: (mismatch) => set({ contextMismatch: mismatch }),

      clearSession: () =>
        set({ userRole: null, userId: null, currentSchool: null, contextMismatch: null }),
    }),
    { name: "schoolpulse-session" }
  )
);
