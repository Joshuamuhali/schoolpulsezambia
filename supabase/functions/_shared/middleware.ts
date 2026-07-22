/**
 * Shared Middleware for Supabase Edge Functions
 * Provides tenant scoping, RBAC, and module gating
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Context {
  user: any;
  userId: string;
  schoolId: string;
  role: string;
  permissions: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}

/**
 * Resolve tenant from authenticated user
 */
export async function resolveTenant(
  supabase: any,
  authHeader: string
): Promise<Context> {
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  // Get user profile with school and role
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("school_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  if (!profile.school_id) {
    throw new Error("NO_SCHOOL_ASSOCIATED");
  }

  // Get permissions
  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("permission_code")
    .eq("role", profile.role);

  return {
    user,
    userId: user.id,
    schoolId: profile.school_id,
    role: profile.role,
    permissions: permissions?.map((p: any) => p.permission_code) || [],
  };
}

/**
 * Check if user has required permission
 */
export function checkPermission(context: Context, requiredPermission: string): void {
  if (context.role === "supa_admin") return; // Platform admin has all permissions

  if (!context.permissions.includes(requiredPermission)) {
    throw new Error("PERMISSION_DENIED");
  }
}

/**
 * Check if module is enabled for school
 */
export async function checkModuleEnabled(
  supabase: any,
  schoolId: string,
  featureKey: string
): Promise<void> {
  const { data, error } = await supabase
    .from("school_feature_flags")
    .select("status")
    .eq("school_id", schoolId)
    .eq("feature_id", featureKey)
    .single();

  if (error || !data || data.status !== "active") {
    throw new Error("MODULE_NOT_ENABLED");
  }
}

/**
 * Standard error response
 */
export function errorResponse(code: string, message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Standard success response
 */
export function successResponse<T>(
  data: T,
  meta?: any,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      data,
      ...(meta && { meta }),
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Middleware chain for Edge Functions
 */
export async function withMiddleware(
  req: Request,
  handler: (context: Context, supabase: any) => Promise<Response>,
  options?: {
    requirePermission?: string;
    requireModule?: string;
  }
): Promise<Response> {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("MISSING_AUTH", "Authorization header required", 401);
    }

    // Resolve tenant
    const context = await resolveTenant(supabase, authHeader);

    // Check permission if required
    if (options?.requirePermission) {
      checkPermission(context, options.requirePermission);
    }

    // Check module if required
    if (options?.requireModule) {
      await checkModuleEnabled(supabase, context.schoolId, options.requireModule);
    }

    // Call handler
    return await handler(context, supabase);
  } catch (error: any) {
    console.error("Middleware error:", error);

    const errorMap: Record<string, { code: string; message: string; status: number }> = {
      UNAUTHORIZED: { code: "UNAUTHORIZED", message: "Invalid or expired token", status: 401 },
      PROFILE_NOT_FOUND: { code: "PROFILE_NOT_FOUND", message: "User profile not found", status: 404 },
      NO_SCHOOL_ASSOCIATED: { code: "NO_SCHOOL_ASSOCIATED", message: "User not associated with a school", status: 403 },
      PERMISSION_DENIED: { code: "PERMISSION_DENIED", message: "Insufficient permissions", status: 403 },
      MODULE_NOT_ENABLED: { code: "MODULE_NOT_ENABLED", message: "Module not enabled for this school", status: 403 },
    };

    const errorInfo = errorMap[error.message] || {
      code: "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred",
      status: 500,
    };

    return errorResponse(errorInfo.code, errorInfo.message, errorInfo.status);
  }
}
