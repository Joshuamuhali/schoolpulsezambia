/**
 * useAuth — aligned to the REAL live schema.
 *
 * Schema facts:
 *  - Role membership is in school_members (not user_roles)
 *  - Platform admins have school_members.school_id = NULL
 *  - roles.key is the machine identifier (e.g. "super_admin")
 *  - schools.state is the access state column (not access_state)
 *  - school_feature_flags uses feature_id (UUID) not feature_key (text)
 *  - profiles has NO school_id column
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/store/appStore";
import type { AccessState, FeatureKey, FeatureStatus } from "@/store/appStore";
import { getSubdomain } from "@/lib/utils/tenant";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Platform-level role keys that bypass school scoping
const PLATFORM_ADMIN_KEYS = ["super_admin", "operations_admin", "finance_admin", "support_admin"];

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const setUserRole     = useAppStore((s) => s.setUserRole);
  const setUserId       = useAppStore((s) => s.setUserId);
  const setCurrentSchool = useAppStore((s) => s.setCurrentSchool);
  const setContextMismatch = useAppStore((s) => s.setContextMismatch);
  const clearSession    = useAppStore((s) => s.clearSession);

  async function loadUserContext(authUser: User) {
    try {
      // 1. Extract context from JWT (App Metadata)
      const appMetadata = authUser.app_metadata || {};
      let activeSchoolId = appMetadata.school_id as string | undefined;
      let userRole = appMetadata.role as string | undefined;

      // 2. Check platform admin status using secure RPC function
      const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin" as any);

      // 3. Resolve Subdomain
      const urlSubdomain = getSubdomain();

      // 4. Handle Tenant Mismatch / Prompt
      if (urlSubdomain) {
        const { data: targetSchool } = await (supabase as any)
          .from("schools")
          .select("id, name, subdomain, state")
          .eq("subdomain", urlSubdomain)
          .single();

        if (targetSchool && targetSchool.id !== activeSchoolId) {
          setContextMismatch({
            targetSchoolId: (targetSchool as any).id,
            targetSchoolName: (targetSchool as any).name,
            targetSubdomain: (targetSchool as any).subdomain
          });
          // We continue loading the current context from JWT, but the UI will show a prompt
        }
      }

      // 5. Handle Platform Admin
      if (isPlatformAdmin && !activeSchoolId) {
        setUserRole("supa_admin");
        setUserId(authUser.id);
        setCurrentSchool({
          id: "",
          name: "Platform",
          subdomain: "",
          accessState: "active",
          featureFlags: {} as Record<FeatureKey, FeatureStatus>,
        });
        return;
      }

      if (!activeSchoolId) {
        // Authenticated but no active school context
        clearSession();
        return;
      }

      // 5. Load Active School Details & Features
      const [schoolRes, flagsRes] = await Promise.all([
        supabase.from("schools").select("id, name, subdomain, state").eq("id", activeSchoolId).single(),
        supabase.from("school_feature_flags").select("status, feature_catalog(key)").eq("school_id", activeSchoolId),
      ]);

      if (schoolRes.error) throw schoolRes.error;
      const schoolData = schoolRes.data;

      if (!schoolData) {
        clearSession();
        return;
      }

      const school = schoolData as { id: string; name: string; subdomain: string; state: string };

      const featureFlags = (flagsRes.data ?? []).reduce(
        (acc: Record<string, FeatureStatus>, f: any) => {
          const key = f.feature_catalog?.key;
          if (key) acc[key as FeatureKey] = (f.status === "active" ? "active" : "inactive") as FeatureStatus;
          return acc;
        },
        {} as Record<FeatureKey, FeatureStatus>
      );

      // 6. Update App Store
      const storeRole = (userRole || "teacher").replace(/-/g, "_") as any;
      setUserRole(storeRole);
      setUserId(authUser.id);
      setCurrentSchool({
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
        accessState: school.state as AccessState,
        featureFlags: featureFlags as Record<FeatureKey, FeatureStatus>,
      });

    } catch (err) {
      console.error("[useAuth] Failed to load user context:", err);
      setError("Failed to load account. Please try again.");
      clearSession();
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserContext(s.user).finally(() => setLoading(false));
      } else {
        clearSession();
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadUserContext(s.user);
      } else {
        clearSession();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, user, loading, error };
}
