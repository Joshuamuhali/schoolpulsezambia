# Onboarding & User Registration Workflow Audit

**Date:** 2026-07-07  
**Scope:** Authentication, onboarding flow, database schema, security, and UX  
**Status:** Critical Issues Found

---

## Executive Summary

The onboarding and registration workflow has **critical security vulnerabilities** and **significant UX issues** that need immediate attention. The system uses a multi-step wizard with OTP email verification, but lacks essential security measures and has an unstable database schema history.

**Risk Level:** 🔴 HIGH  
**Recommendation:** Address critical issues before production launch

---

## 1. Authentication Flow Overview

### Current Flow
```
LoginPage (email/password)
    ↓
ForgotPasswordPage (reset link)
    ↓
OnboardingPage (4-step wizard)
    Step 1: Email entry → OTP send
    Step 2: OTP verification
    Step 3: School details (name, subdomain)
    Step 4: Review & submit
    ↓
Dashboard (post-onboarding)
```

### Key Components
- **Frontend:** `src/pages/auth/OnboardingPage.tsx` (346 lines)
- **Services:** `src/lib/services/users.ts` (193 lines)
- **Database:** `supabase/migrations/20240005_onboarding_rpc.sql`
- **Auth Hook:** `supabase/migrations/20240007_jwt_authority_hook.sql`

---

## 2. Critical Security Issues

### 🔴 2.1 No Email Confirmation Requirement
**Severity:** CRITICAL  
**Location:** `src/lib/services/users.ts:24-40`

**Issue:** The `signUp` function exists but is **never used** in the onboarding flow. The system uses `signInWithOtp` (magic link) which doesn't require email confirmation.

```typescript
// This function exists but is never called:
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
}
```

**Impact:** 
- Users can enter any email without proving ownership
- No verification that the administrator actually controls the email
- Potential for fake school registrations

**Recommendation:**
- Implement proper email confirmation flow
- Require users to click a confirmation link before proceeding
- Add a "Check email confirmation status" step in onboarding

---

### 🔴 2.2 No CAPTCHA/Bot Protection
**Severity:** HIGH  
**Location:** `src/pages/auth/OnboardingPage.tsx:61-75`

**Issue:** The OTP endpoint is vulnerable to automated abuse. Only client-side deduplication exists (5-second window).

```typescript
// Client-side only - easily bypassed:
if (isDuplicate(`otp:${email}`)) {
  throw new Error("Too many attempts. Please wait a moment.");
}
```

**Impact:**
- Bots can spam OTP requests
- No protection against credential stuffing
- Potential for email bombing attacks

**Recommendation:**
- Add reCAPTCHA v3 or similar to OTP request
- Implement server-side rate limiting (Supabase Edge Function)
- Add IP-based rate limiting
- Consider phone verification for high-value actions

---

### 🔴 2.3 Weak Subdomain Validation
**Severity:** MEDIUM  
**Location:** `src/pages/auth/OnboardingPage.tsx:16-22`

**Issue:** Subdomain validation is client-side only and can be bypassed.

```typescript
const onboardingSchema = z.object({
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens")
});
```

**Impact:**
- Users can bypass validation by modifying client code
- No profanity/inappropriate content filtering
- No reserved word checking (e.g., "admin", "api", "www")

**Recommendation:**
- Add server-side validation in `create_school_onboarding` RPC
- Check against reserved subdomains list
- Add profanity filter
- Validate subdomain availability atomically (no race conditions)

---

### 🟡 2.4 No Duplicate Email Detection
**Severity:** MEDIUM  
**Location:** `supabase/migrations/20240005_onboarding_rpc.sql:7-50`

**Issue:** The `create_school_onboarding` RPC doesn't check if the email is already registered.

```sql
-- Missing: Check if email already exists in auth.users
-- Missing: Check if user already has a school membership
```

**Impact:**
- Same email can create multiple schools
- No protection against account takeover attempts
- Confusion if user forgets they already registered

**Recommendation:**
- Add email uniqueness check in onboarding RPC
- Return clear error if email already exists
- Provide "Sign in instead" link in error message

---

### 🟡 2.5 Insufficient Password Reset Validation
**Severity:** MEDIUM  
**Location:** `src/pages/auth/ForgotPasswordPage.tsx:17-34`

**Issue:** Password reset doesn't validate if the email exists (good for privacy), but provides no feedback.

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  await sendPasswordReset(email);
  setSent(true); // Always shows success, even for non-existent emails
};
```

**Impact:**
- Attackers can enumerate valid emails (timing attacks)
- Users don't know if they mistyped their email

**Recommendation:**
- Always show generic success message (current behavior is correct for privacy)
- Add rate limiting on password reset endpoint
- Consider adding a "resend" button with cooldown

---

## 3. UX Issues

### 🔴 3.1 No Progress Persistence
**Severity:** HIGH  
**Location:** `src/pages/auth/OnboardingPage.tsx:1-346`

**Issue:** If user refreshes the page during onboarding, all progress is lost.

```typescript
const [step, setStep] = useState(1); // Resets to 1 on refresh
const [otpCode, setOtpCode] = useState(""); // Lost on refresh
const [user, setUser] = useState<any>(null); // Lost on refresh
```

**Impact:**
- Users must restart onboarding if they accidentally refresh
- OTP code expires, requiring new request
- Frustrating experience, especially on slow connections

**Recommendation:**
- Store onboarding state in `sessionStorage` (not `localStorage` for security)
- Persist: current step, email, OTP (temporarily), form data
- Add "Resume onboarding?" prompt if state exists
- Implement auto-save on each step completion

---

### 🔴 3.2 No Back Navigation Validation
**Severity:** MEDIUM  
**Location:** `src/pages/auth/OnboardingPage.tsx:286-289`

**Issue:** Users can click "Back" from step 3 to step 2, but the OTP verification state is lost.

```typescript
<Button type="button" className="ml-auto" onClick={nextStep}>
  Review Registration <ArrowRight className="ml-2 h-4 w-4" />
</Button>
// No back button on step 3!
```

**Impact:**
- Users can't go back to change email after OTP verification
- Confusing navigation flow
- No clear path if user wants to use different email

**Recommendation:**
- Add "Back" button on step 3
- Allow email change with OTP re-verification
- Clear navigation: show all step transitions explicitly

---

### 🟡 3.3 Unclear Trial Period Communication
**Severity:** LOW  
**Location:** `src/pages/auth/OnboardingPage.tsx:315-318`

**Issue:** Trial period details are vague.

```typescript
<div className="rounded-lg bg-primary/5 p-4 border border-primary/10 text-sm">
  <p className="text-primary font-medium mb-1">Plan: 14-Day Free Trial</p>
  <p className="text-muted-foreground">Get full access to all modules. No credit card required.</p>
</div>
```

**Impact:**
- Users don't know what happens after 14 days
- No pricing information
- Unclear what "all modules" means

**Recommendation:**
- Add trial end date
- Show pricing plans
- Clarify what happens post-trial (auto-cancel, auto-charge, etc.)
- Add link to full terms of service

---

### 🟡 3.4 No Terms of Service Acceptance
**Severity:** MEDIUM  
**Location:** Missing from entire onboarding flow

**Issue:** No terms of service or privacy policy acceptance.

**Impact:**
- Legal liability
- No consent for data processing
- Non-compliant with GDPR, CCPA, etc.

**Recommendation:**
- Add terms acceptance checkbox on final step
- Link to full terms and privacy policy
- Record acceptance timestamp in database
- Consider age verification if required

---

### 🟡 3.5 Missing Error Recovery
**Severity:** MEDIUM  
**Location:** `src/pages/auth/OnboardingPage.tsx:105-141`

**Issue:** If onboarding fails, user is stuck with no clear recovery path.

```typescript
} catch (err: any) {
  setError(err.message || "An error occurred during onboarding.");
  setLoading(false);
  // No recovery action, user must manually retry
}
```

**Impact:**
- Users don't know how to retry failed operations
- No partial state preservation
- Confusing error messages

**Recommendation:**
- Add specific error messages for common failures:
  - "Subdomain already taken - try another"
  - "School creation failed - contact support"
  - "Session expired - please verify email again"
- Add "Retry" button for failed steps
- Preserve form data on error

---

## 4. Database Schema Issues

### 🔴 4.1 Schema Instability
**Severity:** HIGH  
**Evidence:** Multiple migrations modifying the same tables

**Migrations affecting `schools` table:**
- `20240001_platform_foundation.sql` - Creates with `access_state` column
- `20240006_real_schema_reconciliation.sql` - Renames to `state`

**Migrations affecting `profiles` table:**
- `20240001_platform_foundation.sql` - Creates with `school_id`, `avatar_url`, `updated_at`
- `20240006_real_schema_reconciliation.sql` - Drops all three columns

**Impact:**
- Difficult to maintain and debug
- Risk of data loss during migrations
- Unclear which schema version is "correct"
- Deployment failures on existing databases

**Recommendation:**
- Consolidate schema changes into single migration
- Use proper migration versioning (no destructive changes without backups)
- Document schema decisions in comments
- Create schema migration guide for existing deployments

---

### 🟡 4.2 Inconsistent Helper Functions
**Severity:** MEDIUM  
**Evidence:** Multiple versions of `current_user_school()` and `is_platform_admin()`

**Versions found:**
1. `20240001_platform_foundation.sql:174-177` - Uses `profiles` table
2. `20240005_onboarding_rpc.sql:54-61` - Uses `school_members` table
3. `20240006_real_schema_reconciliation.sql:124-132` - Uses `school_members` with filters
4. `20240007_jwt_authority_hook.sql:149-152` - Uses JWT claims

**Impact:**
- Unclear which version is active
- Potential for inconsistent behavior
- Difficult to debug authorization issues

**Recommendation:**
- Remove duplicate function definitions
- Keep only the JWT-based version (most performant)
- Add migration to drop old versions
- Document the chosen approach

---

### 🟡 4.3 Missing Database Constraints
**Severity:** MEDIUM  
**Location:** `supabase/migrations/20240005_onboarding_rpc.sql`

**Issue:** No constraints on subdomain format at database level.

```sql
-- Missing constraints:
-- - CHECK constraint on subdomain format
-- - Reserved subdomain list
-- - Minimum length validation
```

**Recommendation:**
```sql
ALTER TABLE schools ADD CONSTRAINT subdomain_format 
  CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');
  
CREATE TABLE reserved_subdomains (subdomain TEXT PRIMARY KEY);
INSERT INTO reserved_subdomains VALUES 
  ('admin'), ('api'), ('www'), ('app'), ('dashboard');
```

---

## 5. Authentication & Authorization Issues

### 🟡 5.1 JWT Claim Dependency
**Severity:** MEDIUM  
**Location:** `supabase/migrations/20240007_jwt_authority_hook.sql`

**Issue:** System relies on JWT claims for authorization, but claims are only updated on session refresh.

```typescript
// In OnboardingPage.tsx:129
await supabase.auth.refreshSession(); // Required to get new JWT claims
```

**Impact:**
- If refresh fails, user has stale permissions
- Race condition between RPC call and JWT update
- Complex debugging when claims don't match database

**Recommendation:**
- Add explicit permission check after onboarding (query DB directly)
- Implement retry logic for session refresh
- Add fallback to query `school_members` directly if JWT claims are stale
- Log all JWT claim changes for debugging

---

### 🟡 5.2 Platform Admin Detection Complexity
**Severity:** LOW  
**Location:** `src/hooks/useAuth.ts:44-47`

**Issue:** Platform admin detection requires checking multiple sources.

```typescript
const appMetadata = authUser.app_metadata || {};
const isPlatformAdmin = !!appMetadata.is_platform_admin;
// Also checks: school_members with school_id IS NULL
```

**Impact:**
- Complex logic increases bug risk
- Unclear which source is authoritative
- Potential for inconsistent state

**Recommendation:**
- Standardize on JWT claims (already done in 20240007)
- Remove redundant database checks
- Add unit tests for platform admin detection

---

## 6. Missing Features

### 🔴 6.1 No Email Confirmation Flow
**Severity:** CRITICAL

**Missing:**
- Email confirmation before onboarding
- Resend confirmation email option
- Confirmation status check
- Graceful handling of unconfirmed users

**Recommendation:**
```typescript
// Add to onboarding flow:
1. User enters email
2. System sends confirmation email
3. User clicks link in email
4. System verifies confirmation
5. Proceed to OTP or skip if using magic link
```

---

### 🟡 6.2 No Audit Logging
**Severity:** MEDIUM

**Missing:**
- School creation events
- OTP request/verification events
- Failed onboarding attempts
- Admin actions during onboarding

**Recommendation:**
```sql
-- Add to create_school_onboarding RPC:
INSERT INTO audit_logs (school_id, user_id, action, table_name, new_data)
VALUES (v_school_id, p_admin_id, 'school_created', 'schools', v_result);
```

---

### 🟡 6.3 No Notification System
**Severity:** LOW

**Missing:**
- Welcome email after successful onboarding
- Trial expiration reminders
- Onboarding completion notification to admin

**Recommendation:**
- Add email notifications via Supabase Edge Function
- Use `email_logs` table for tracking
- Allow users to resend welcome email

---

## 7. Code Quality Issues

### 🟡 7.1 Inconsistent Error Handling
**Severity:** LOW  
**Location:** Multiple files

**Issue:** Error handling is inconsistent across the codebase.

```typescript
// Some places:
const msg = raw.toLowerCase().includes("invalid login") ? "..." : raw;

// Other places:
setError(err.message || "An error occurred.");
```

**Recommendation:**
- Create centralized error handling utility
- Map Supabase error codes to user-friendly messages
- Add error logging service

---

### 🟡 7.2 Magic Numbers
**Severity:** LOW  
**Location:** `src/pages/auth/OnboardingPage.tsx:78`

```typescript
if (otpCode.length < 6) return; // Magic number
```

**Recommendation:**
```typescript
const OTP_LENGTH = 6;
if (otpCode.length < OTP_LENGTH) return;
```

---

## 8. Recommendations Priority Matrix

### Immediate (Before Production)
1. ✅ **Implement email confirmation** - Critical security issue
2. ✅ **Add CAPTCHA to OTP endpoint** - Prevent bot abuse
3. ✅ **Add server-side rate limiting** - Protect against abuse
4. ✅ **Add progress persistence** - Critical UX issue
5. ✅ **Add terms of service acceptance** - Legal requirement

### High Priority (Within 1 Week)
6. ✅ **Add server-side subdomain validation** - Security hardening
7. ✅ **Add duplicate email detection** - Data integrity
8. ✅ **Add back navigation to step 3** - UX improvement
9. ✅ **Add error recovery mechanisms** - UX improvement
10. ✅ **Consolidate database schema** - Maintainability

### Medium Priority (Within 1 Month)
11. ✅ **Add audit logging** - Security and debugging
12. ✅ **Add email notifications** - User experience
13. ✅ **Standardize error handling** - Code quality
14. ✅ **Add onboarding analytics** - Product insights
15. ✅ **Implement retry logic for session refresh** - Reliability

### Low Priority (Nice to Have)
16. ✅ **Add profanity filter for subdomains** - Brand protection
17. ✅ **Add reserved subdomain list** - Prevent conflicts
18. ✅ **Add onboarding tutorial** - User education
19. ✅ **Add progress indicators** - UX polish
20. ✅ **Remove magic numbers** - Code quality

---

## 9. Testing Recommendations

### Security Testing
- [ ] Test OTP rate limiting (100 requests/minute)
- [ ] Test email enumeration (timing attacks)
- [ ] Test subdomain injection attacks
- [ ] Test SQL injection in onboarding RPC
- [ ] Test XSS in subdomain/name fields
- [ ] Test CSRF on onboarding endpoints

### UX Testing
- [ ] Test onboarding with slow network (3G)
- [ ] Test onboarding with page refresh at each step
- [ ] Test onboarding with browser back button
- [ ] Test onboarding with multiple tabs
- [ ] Test onboarding on mobile devices
- [ ] Test onboarding with screen readers (accessibility)

### Integration Testing
- [ ] Test full flow: signup → onboarding → dashboard
- [ ] Test concurrent onboarding attempts
- [ ] Test subdomain collision handling
- [ ] Test session expiration during onboarding
- [ ] Test tenant switching after onboarding

---

## 10. Database Migration Recommendations

### Immediate Actions
```sql
-- 1. Add email confirmation requirement
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at TIMESTAMPTZ;

-- 2. Add subdomain constraints
ALTER TABLE schools ADD CONSTRAINT subdomain_format 
  CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$');

-- 3. Add reserved subdomains
CREATE TABLE IF NOT EXISTS reserved_subdomains (
  subdomain TEXT PRIMARY KEY,
  reason TEXT
);

INSERT INTO reserved_subdomains VALUES
  ('admin', 'System reserved'),
  ('api', 'System reserved'),
  ('www', 'System reserved'),
  ('app', 'System reserved'),
  ('dashboard', 'System reserved')
ON CONFLICT DO NOTHING;

-- 4. Add onboarding audit logging
CREATE TABLE IF NOT EXISTS onboarding_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  subdomain TEXT,
  school_id UUID,
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onboarding_attempts_email ON onboarding_attempts(email);
CREATE INDEX idx_onboarding_attempts_created_at ON onboarding_attempts(created_at DESC);
```

---

## 11. Code Changes Required

### 11.1 Add Email Confirmation
**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// Add after step 1:
const handleSendOtp = async () => {
  const isValid = await trigger("email");
  if (!isValid) return;

  setLoading(true);
  setError(null);
  try {
    // First, check if email is confirmed
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === getValues("email"));
    
    if (existingUser && !existingUser.email_confirmed_at) {
      setError("Please confirm your email before proceeding. Check your inbox.");
      setLoading(false);
      return;
    }

    await signInWithOtp(getValues("email"));
    setStep(2);
  } catch (err: any) {
    setError(err.message || "Failed to send verification code.");
  } finally {
    setLoading(false);
  }
};
```

### 11.2 Add Progress Persistence
**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// Add at top of component:
useEffect(() => {
  const saved = sessionStorage.getItem('onboarding_state');
  if (saved) {
    const state = JSON.parse(saved);
    setStep(state.step);
    setOtpCode(state.otpCode || '');
    if (state.email) setValue('email', state.email);
    if (state.fullName) setValue('fullName', state.fullName);
    if (state.schoolName) setValue('schoolName', state.schoolName);
    if (state.subdomain) setValue('subdomain', state.subdomain);
  }
}, [setValue]);

// Add before each step change:
const saveState = () => {
  sessionStorage.setItem('onboarding_state', JSON.stringify({
    step,
    otpCode,
    email: getValues('email'),
    fullName: getValues('fullName'),
    schoolName: getValues('schoolName'),
    subdomain: getValues('subdomain')
  }));
};

// Call saveState() before setStep() in all navigation functions
```

### 11.3 Add Server-Side Subdomain Validation
**File:** `supabase/migrations/20240005_onboarding_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION create_school_onboarding(
  p_school_name TEXT,
  p_subdomain   TEXT,
  p_admin_id     UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_role_id   UUID;
  v_result    JSONB;
  v_normalized_subdomain TEXT;
BEGIN
  -- Normalize and validate subdomain
  v_normalized_subdomain := lower(trim(p_subdomain));
  
  -- Check format
  IF v_normalized_subdomain !~ '^[a-z0-9][a-z0-9-]{2,61}[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.';
  END IF;
  
  -- Check reserved subdomains
  IF EXISTS (SELECT 1 FROM reserved_subdomains WHERE subdomain = v_normalized_subdomain) THEN
    RAISE EXCEPTION 'This subdomain is reserved. Please choose another.';
  END IF;
  
  -- Check if already taken (atomic check)
  IF EXISTS (SELECT 1 FROM schools WHERE subdomain = v_normalized_subdomain) THEN
    RAISE EXCEPTION 'Subdomain % is already taken.', p_subdomain;
  END IF;

  -- Rest of the function...
```

---

## 12. Monitoring & Alerts

### Recommended Metrics
1. **Onboarding funnel:**
   - Step 1 → Step 2 conversion rate
   - Step 2 → Step 3 conversion rate
   - Step 3 → Step 4 conversion rate
   - Step 4 → Completion rate

2. **Security metrics:**
   - OTP requests per minute (alert if > 10)
   - Failed OTP verification rate
   - Duplicate email attempts
   - Subdomain collision attempts

3. **Performance metrics:**
   - Average onboarding completion time
   - Drop-off points
   - Error rates by step

### Recommended Alerts
- OTP request rate > 10/minute from single IP
- Onboarding failure rate > 20%
- Subdomain collision attempts > 5/hour
- Average onboarding time > 10 minutes

---

## 13. Compliance Considerations

### GDPR
- ✅ Add privacy policy acceptance
- ✅ Add data processing consent
- ✅ Add right to erasure mechanism
- ✅ Add data export functionality
- ✅ Document data retention policies

### CCPA
- ✅ Add "Do Not Sell My Data" option
- ✅ Add data deletion requests
- ✅ Add privacy policy link

### Local Regulations (Zambia/Africa)
- ✅ Add data localization considerations
- ✅ Add local language support (i18n)
- ✅ Add mobile money payment integration (future)

---

## 14. Conclusion

The onboarding workflow has a solid foundation with a well-structured multi-step wizard and proper use of Supabase authentication. However, **critical security issues** (lack of email confirmation, no bot protection) and **significant UX issues** (no progress persistence) must be addressed before production launch.

**Next Steps:**
1. Address all 🔴 CRITICAL issues immediately
2. Implement 🟡 HIGH priority issues within 1 week
3. Schedule remaining improvements for following sprint
4. Conduct security audit after fixes
5. Perform UX testing with real users

**Estimated Effort:**
- Critical fixes: 2-3 days
- High priority: 1 week
- Medium priority: 2-3 weeks
- Low priority: 1 month

---

## Appendix A: File Inventory

### Frontend Files
- `src/pages/auth/OnboardingPage.tsx` - Main onboarding wizard
- `src/pages/auth/LoginPage.tsx` - Login page
- `src/pages/auth/ForgotPasswordPage.tsx` - Password reset
- `src/lib/services/users.ts` - Auth service functions
- `src/hooks/useAuth.ts` - Authentication hook
- `src/store/appStore.ts` - Global state management
- `src/components/setup/Wizard.tsx` - Reusable wizard component
- `src/components/auth/TenantSwitchPrompt.tsx` - Tenant switching UI

### Database Files
- `supabase/migrations/20240001_platform_foundation.sql` - Core schema
- `supabase/migrations/20240005_onboarding_rpc.sql` - Onboarding RPC
- `supabase/migrations/20240006_real_schema_reconciliation.sql` - Schema fixes
- `supabase/migrations/20240007_jwt_authority_hook.sql` - JWT hook

### Configuration Files
- `supabase/config.toml` - Supabase configuration
- `src/lib/supabase/client.ts` - Supabase client setup

---

## Appendix B: Database Schema Reference

### Key Tables
```sql
schools (id, name, subdomain, state, created_at)
profiles (id, full_name, email, created_at)
school_members (id, school_id, user_id, role_id, status, created_at)
roles (id, name, key, scope, created_at)
permissions (id, key, module, action, created_at)
role_permissions (role_id, permission_id)
school_feature_flags (id, school_id, feature_id, status)
```

### Key Functions
```sql
create_school_onboarding(p_school_name, p_subdomain, p_admin_id) → JSONB
set_active_school(p_school_id) → JSONB
current_user_school() → UUID
is_platform_admin() → BOOLEAN
user_has_permission(p_permission) → BOOLEAN
```

---

**Audit Completed By:** AI Assistant  
**Review Status:** Pending human review  
**Next Review:** After critical fixes implemented