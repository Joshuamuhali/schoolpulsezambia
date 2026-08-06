# Onboarding Workflow Audit Report

**Date:** 2026-08-05  
**Auditor:** AI Assistant  
**Scope:** Complete onboarding flow, authentication, account creation, school setup, verification, and redirects  
**Status:** Multiple Implementation Paths Detected - Alignment Required

---

## Executive Summary

The onboarding system has **two competing implementations** that need to be reconciled:

1. **Legacy 5-Step Wizard** (`OnboardingPage.tsx`) - Original flow with account creation, school details, module selection, and review
2. **New Multi-Page Flow** (KYC → Modules → Payment → Activation) - Post-onboarding workflow with KYC verification

**Current State:** ⚠️ **INCONSISTENT** - Multiple entry points, conflicting routes, and state management issues  
**Risk Level:** 🔴 **HIGH** - Users may experience broken flows, incorrect redirects, and state inconsistencies  
**Recommendation:** Align implementations and fix routing before production deployment

---

## 1. Current Implementation Analysis

### 1.1 Detected Onboarding Flows

#### Flow A: Legacy 5-Step Wizard (OnboardingPage.tsx)

**Location:** `src/pages/auth/OnboardingPage.tsx`  
**Route:** `/onboarding` (mapped to `AccountCreationPage` in App.tsx line 132)

**Steps:**
1. **Step 1: Account Creation** - Full name, email, password, confirm password
2. **Step 2: School Details** - School name, type, education level, subdomain
3. **Step 3: Module Selection** - Select modules with pricing
4. **Step 4: Review & Submit** - Review all data, accept terms, submit

**Post-Submit Flow:**
```typescript
// Line 168-170 in OnboardingPage.tsx
setSuccess(true);
setTimeout(() => {
  navigate("/onboarding/kyc");
}, 3000);
```

**Key Issues:**
- ❌ Creates school with `onboardSchool()` RPC
- ❌ Sets school to 'preview' state
- ❌ Redirects to `/onboarding/kyc` after completion
- ❌ Does NOT redirect to setup wizard
- ❌ Does NOT handle payment flow
- ❌ Terms acceptance is NOT implemented (missing TermsCheckbox component)

#### Flow B: KYC Verification (KYCOnboardingPage.tsx)

**Location:** `src/pages/onboarding/KYCOnboardingPage.tsx`  
**Route:** `/onboarding/kyc` (App.tsx line 133)

**Steps:**
1. School Information
2. Ministry Registration
3. Business Registration
4. School Ownership
5. Head Teacher
6. School Address
7. Statistics
8. Facilities

**Post-Completion Flow:**
```typescript
// Line 117-127 in KYCOnboardingPage.tsx
const handleSubmitKYC = async () => {
  setLoading(true);
  try {
    await submitKYC.mutateAsync(user?.user_metadata?.school_id);
    navigate("/dashboard/pending");  // ❌ WRONG REDIRECT
  } catch (error) {
    console.error("Error submitting KYC:", error);
  } finally {
    setLoading(false);
  }
};
```

**Key Issues:**
- ❌ Redirects to `/dashboard/pending` (non-existent route)
- ❌ Should redirect to `/onboarding/modules` per SetupBanner config
- ❌ No integration with school state machine
- ❌ Progress saved to database but no state transition

#### Flow C: Module Selection (ModuleSelectionPage.tsx)

**Location:** `src/pages/onboarding/ModuleSelectionPage.tsx`  
**Route:** `/onboarding/modules` (App.tsx line 134)

**Features:**
- Module catalog from `module_catalog` table
- Billing frequency selection (monthly/termly/annual)
- Real-time pricing calculation
- Saves to `school_module_selections` table

**Post-Selection Flow:**
```typescript
// Line 90-93 in ModuleSelectionPage.tsx
onSuccess: () => {
  toast.success("Modules selected! Proceeding to payment.");
  navigate("/onboarding/payment");
},
```

**Key Issues:**
- ✅ Correctly redirects to `/onboarding/payment`
- ❌ Uses `module_catalog` table (different from `feature_catalog` used elsewhere)
- ❌ No validation that school is in correct state
- ❌ No check for KYC completion

#### Flow D: Payment (PaymentPage.tsx)

**Location:** `src/pages/onboarding/PaymentPage.tsx`  
**Route:** `/onboarding/payment` (App.tsx line 135)

**Features:**
- Payment method selection (bank transfer, mobile money)
- Payment reference entry
- Proof of payment upload
- Amount display from selection

**Post-Payment Flow:**
```typescript
// Line 82-88 in PaymentPage.tsx
onSuccess: () => {
  toast.success("Payment submitted successfully! Awaiting admin approval.");
  queryClient.invalidateQueries({ queryKey: ["module-selection"] });
  setTimeout(() => {
    navigate("/dashboard");  // ❌ WRONG - Should go to activation or setup
  }, 2000);
},
```

**Key Issues:**
- ❌ Redirects to `/dashboard` (user not fully onboarded)
- ❌ No school state update to `payment_pending`
- ❌ No integration with admin approval workflow
- ❌ Payment proof uploaded but no verification trigger

#### Flow E: Activation (ActivationPage.tsx)

**Location:** `src/pages/auth/ActivationPage.tsx`  
**Route:** `/onboarding/activate` (App.tsx line 136)

**Features:**
- Module selection for activation
- Feature flag creation
- School state update to 'active'

**Post-Activation Flow:**
```typescript
// Line 79-83 in ActivationPage.tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["school-feature-flags"] });
  queryClient.invalidateQueries({ queryKey: ["current-school"] });
  navigate("/dashboard/setup");  // ✅ CORRECT
},
```

**Key Issues:**
- ✅ Correctly redirects to `/dashboard/setup`
- ❌ Only accessible if school is in 'preview' state
- ❌ No payment verification check
- ❌ No KYC approval check

### 1.2 Routing Analysis

**App.tsx Route Configuration:**
```typescript
// Lines 132-136
<Route path="/onboarding" element={<AccountCreationPage />} />
<Route path="/onboarding/kyc" element={<KYCOnboardingPage />} />
<Route path="/onboarding/modules" element={<ModuleSelectionPage />} />
<Route path="/onboarding/payment" element={<PaymentPage />} />
<Route path="/onboarding/activate" element={<ActivationPage />} />
```

**Issues:**
- ❌ `/onboarding` maps to `AccountCreationPage` (not `OnboardingPage`)
- ❌ No route for `/onboarding/school-setup` (referenced in SetupBanner)
- ❌ No route for `/dashboard/pending` (referenced in KYCOnboardingPage)
- ❌ Inconsistent naming: `AccountCreationPage` vs `OnboardingPage`

### 1.3 State Management Analysis

**School States (useSchoolStatus.ts):**
```typescript
export type SchoolState = 'no_school' | 'setup_complete' | 'kyc_pending' | 'kyc_approved' | 'active';
```

**SetupBanner Configuration:**
```typescript
const bannerConfig = {
  no_school: {
    link: "/onboarding/school-setup",  // ❌ ROUTE DOESN'T EXIST
  },
  setup_complete: {
    link: "/onboarding/kyc",  // ✅ CORRECT
  },
  kyc_pending: {
    cta: null,  // ✅ CORRECT - No action while reviewing
  },
  kyc_approved: {
    link: "/onboarding/modules",  // ✅ CORRECT
  },
  active: {
    // No banner - ✅ CORRECT
  },
};
```

**Issues:**
- ❌ `no_school` state links to non-existent route
- ❌ No `preview` state in DashboardRouter (used in ActivationPage)
- ❌ No `payment_pending` state
- ❌ State transitions not properly triggered

### 1.4 Dashboard Router Analysis

**DashboardRouter.tsx Flow:**
```typescript
// Lines 78-98
if (!isParent && !platformAdmin && user) {
  setSchoolState(schoolState);

  // If no school, let them through to dashboard (banner will show)
  if (schoolState === 'no_school') {
    setCheckingOnboarding(false);
    return;  // ❌ Lets user through without onboarding
  }

  // If school is active, let them through
  if (schoolState === 'active') {
    setCheckingOnboarding(false);
    return;  // ✅ CORRECT
  }

  // For other states (setup_complete, kyc_pending, kyc_approved), let them through
  // The SetupBanner will guide them through the remaining steps
  setCheckingOnboarding(false);
  return;  // ✅ CORRECT - Banner guides user
}
```

**Issues:**
- ⚠️ Users with `no_school` state can access dashboard (by design, but confusing)
- ❌ No check for `preview` state (used in ActivationPage)
- ❌ No check for `payment_pending` state
- ❌ No automatic redirect to onboarding for incomplete states

---

## 2. Critical Issues Found

### 🔴 Issue #1: Conflicting Onboarding Entry Points

**Severity:** CRITICAL  
**Location:** Multiple files

**Problem:**
- `OnboardingPage.tsx` (5-step wizard) exists at `/onboarding` via `AccountCreationPage`
- `KYCOnboardingPage.tsx` expects to be called after school creation
- No clear entry point for new users

**Current Flow:**
```
User → /onboarding (AccountCreationPage → OnboardingPage)
  ↓ Completes 5-step wizard
  ↓ Creates school in 'preview' state
  ↓ Redirects to /onboarding/kyc
  ↓ Completes KYC
  ↓ Redirects to /dashboard/pending (404 ERROR)
```

**Expected Flow:**
```
User → /onboarding (AccountCreationPage → OnboardingPage)
  ↓ Completes 5-step wizard
  ↓ Creates school in 'preview' state
  ↓ Redirects to /onboarding/kyc
  ↓ Completes KYC → school state: kyc_approved
  ↓ Redirects to /onboarding/modules
  ↓ Selects modules
  ↓ Redirects to /onboarding/payment
  ↓ Submits payment → school state: payment_pending
  ↓ Admin approves payment → school state: active
  ↓ Redirects to /dashboard/setup/wizard
  ↓ Completes setup wizard
  ↓ Redirects to /dashboard
```

**Impact:** Users cannot complete onboarding successfully

---

### 🔴 Issue #2: Missing Routes

**Severity:** CRITICAL  
**Location:** `src/App.tsx`

**Missing Routes:**
1. `/onboarding/school-setup` - Referenced in SetupBanner.tsx line 17
2. `/dashboard/pending` - Referenced in KYCOnboardingPage.tsx line 121
3. `/onboarding` should map to `OnboardingPage` not `AccountCreationPage`

**Current Routes:**
```typescript
<Route path="/onboarding" element={<AccountCreationPage />} />
```

**Should Be:**
```typescript
<Route path="/onboarding" element={<OnboardingPage />} />
```

**Impact:** Users encounter 404 errors during onboarding

---

### 🔴 Issue #3: Incorrect Redirects

**Severity:** CRITICAL  
**Location:** Multiple files

**Incorrect Redirects:**

1. **KYCOnboardingPage.tsx (Line 121):**
   ```typescript
   navigate("/dashboard/pending");  // ❌ Route doesn't exist
   ```
   **Should Be:**
   ```typescript
   navigate("/onboarding/modules");  // ✅ Next step in flow
   ```

2. **PaymentPage.tsx (Line 86):**
   ```typescript
   navigate("/dashboard");  // ❌ User not fully onboarded
   ```
   **Should Be:**
   ```typescript
   navigate("/dashboard/setup/wizard");  // ✅ Continue setup
   ```

3. **OnboardingPage.tsx (Line 169):**
   ```typescript
   navigate("/onboarding/kyc");  // ✅ CORRECT
   ```

**Impact:** Users sent to non-existent or incorrect pages

---

### 🔴 Issue #4: School State Machine Not Implemented

**Severity:** CRITICAL  
**Location:** Database and service layer

**Problem:**
The school state machine is defined in `useSchoolStatus.ts` but not properly implemented:

**Expected States:**
- `no_school` - User hasn't created school
- `preview` - School created, awaiting activation (NOT in type definition)
- `setup_complete` - KYC completed (MISMATCH: should be `kyc_approved`)
- `kyc_pending` - KYC under review
- `kyc_approved` - KYC approved, ready for module selection
- `active` - Fully activated

**Actual Implementation:**
```typescript
export type SchoolState = 'no_school' | 'setup_complete' | 'kyc_pending' | 'kyc_approved' | 'active';
```

**Missing States:**
- ❌ `preview` - Used in ActivationPage but not in type definition
- ❌ `payment_pending` - Used in audit docs but not implemented

**Impact:** State-based routing and feature gating broken

---

### 🟡 Issue #5: Terms Acceptance Not Implemented

**Severity:** HIGH  
**Location:** `src/pages/auth/OnboardingPage.tsx`

**Problem:**
The 5-step wizard does NOT include terms acceptance before submission.

**Expected:**
```typescript
// Step 4 (Review) should include:
<TermsCheckbox onAccept={setTermsAccepted} />
<Button disabled={!termsAccepted}>Complete Registration</Button>
```

**Current:**
```typescript
// Step 4 (Review) - No terms acceptance
<Button type="submit" variant="hero" disabled={loading}>
  {loading ? "Finalizing..." : "Complete Registration"}
</Button>
```

**Impact:** Legal compliance risk (GDPR, CCPA, COPPA)

---

### 🟡 Issue #6: Module Catalog Inconsistency

**Severity:** MEDIUM  
**Location:** Multiple files

**Problem:**
Two different module catalog tables are used:

1. **OnboardingPage.tsx (Line 71-76):**
   ```typescript
   const { data, error } = await supabase
     .from("feature_catalog")  // ❌ Different table
     .select("*")
     .eq("is_active", true)
     .order("category");
   ```

2. **ModuleSelectionPage.tsx (Line 44-49):**
   ```typescript
   const { data, error } = await supabase
     .from("module_catalog")  // ❌ Different table
     .select("*")
     .eq("is_active", true)
     .order("category")
     .order("display_order");
   ```

3. **ActivationPage.tsx (Line 21-25):**
   ```typescript
   const { data, error } = await supabase
     .from("feature_catalog")  // ❌ Different table
     .select("*")
     .eq("is_active", true)
     .order("category");
   ```

**Impact:** Inconsistent module data across onboarding flow

---

### 🟡 Issue #7: No Email Confirmation Enforcement

**Severity:** MEDIUM  
**Location:** `src/pages/auth/OnboardingPage.tsx`

**Problem:**
Users can complete onboarding without confirming email.

**Current Behavior:**
```typescript
// Line 82-89 - Checks user but doesn't enforce confirmation
useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    // Don't auto-fill or skip steps - let user go through full onboarding
  };
  checkUser();
}, []);
```

**Should Be:**
```typescript
useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && !user.email_confirmed_at) {
      setError("Please confirm your email before proceeding.");
      navigate("/auth/confirm-email");
      return;
    }
    setUser(user);
  };
  checkUser();
}, []);
```

**Impact:** Security risk, potential for fake accounts

---

### 🟡 Issue #8: Setup Wizard Not Integrated

**Severity:** MEDIUM  
**Location:** Multiple files

**Problem:**
The 7-step setup wizard exists but is not integrated into the onboarding flow.

**Setup Wizard Routes:**
```typescript
<Route path="/dashboard/setup/wizard" element={<SetupWizard />} />
```

**Current Flow:**
- ActivationPage redirects to `/dashboard/setup` (not `/dashboard/setup/wizard`)
- SetupWizard is standalone, not part of onboarding
- No state transition after wizard completion

**Expected Flow:**
```
ActivationPage → /dashboard/setup/wizard → Complete → /dashboard
```

**Impact:** Users must manually navigate to setup wizard

---

### 🟢 Issue #9: No Progress Persistence in KYC

**Severity:** LOW  
**Location:** `src/pages/onboarding/KYCOnboardingPage.tsx`

**Problem:**
KYC progress is saved to database but not to sessionStorage.

**Current:**
```typescript
// Line 63-93 - Loads from database only
const loadProgress = async () => {
  const { data } = await supabase
    .from("kyc_sections")
    .select("section_name, is_completed, data")
    .eq("school_id", schoolId);
  // ...
};
```

**Should Also:**
- Save to sessionStorage for offline access
- Restore from sessionStorage first, then sync with database

**Impact:** Data loss on page refresh if database save fails

---

### 🟢 Issue #10: No Duplicate Email Check

**Severity:** LOW  
**Location:** `src/pages/auth/OnboardingPage.tsx`

**Problem:**
Same email can create multiple schools.

**Current:**
```typescript
// Line 109 - No check for existing email
const authResult = await signUp(email, getValues("password"), getValues("fullName"));
```

**Should Be:**
```typescript
// Check if email already exists
const { data: existingUser } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", email)
  .single();

if (existingUser) {
  setError("Email already registered. Please sign in instead.");
  return;
}
```

**Impact:** Data integrity issues, potential account confusion

---

## 3. Recommended Implementation

### 3.1 Unified Onboarding Flow

```
┌─────────────────────────────────────────────────────────────┐
│ NEW UNIFIED ONBOARDING FLOW                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: Account Creation (OnboardingPage)                 │
│  ├─ Step 1: Account Details                                 │
│  │  ├─ Full name, email, password                           │
│  │  ├─ Email confirmation check (ENFORCE)                   │
│  │  ├─ Rate limiting                                        │
│  │  └─ Terms acceptance (ADD)                               │
│  │                                                          │
│  ├─ Step 2: School Details                                  │
│  │  ├─ School name, type, level                             │
│  │  ├─ Subdomain (validated)                                │
│  │  └─ Year established                                     │
│  │                                                          │
│  ├─ Step 3: Module Selection                                │
│  │  ├─ Browse modules from feature_catalog                  │
│  │  ├─ Select desired modules                               │
│  │  └─ Real-time pricing                                    │
│  │                                                          │
│  └─ Step 4: Review & Submit                                 │
│     ├─ Review all data                                      │
│     ├─ Terms acceptance (required)                          │
│     ├─ Submit → School created in 'preview' state           │
│     └─ Redirect to /onboarding/kyc                          │
│                                                             │
│  Phase 2: KYC Verification (KYCOnboardingPage)              │
│  ├─ 8 sections with progress tracking                       │
│  ├─ Document uploads                                        │
│  ├─ Save to kyc_sections table                              │
│  ├─ Submit → school state: kyc_pending                      │
│  └─ Redirect to /dashboard (banner shows "KYC under review") │
│                                                             │
│  Phase 3: Module Selection (ModuleSelectionPage)            │
│  ├─ Available after KYC approval                            │
│  ├─ Select modules from module_catalog                      │
│  ├─ Billing frequency selection                             │
│  ├─ Save to school_module_selections                        │
│  └─ Redirect to /onboarding/payment                         │
│                                                             │
│  Phase 4: Payment (PaymentPage)                             │
│  ├─ Payment method selection                                │
│  ├─ Reference entry                                         │
│  ├─ Proof upload                                            │
│  ├─ Submit → school state: payment_pending                  │
│  └─ Redirect to /dashboard (banner shows "Awaiting approval")│
│                                                             │
│  Phase 5: Activation (ActivationPage)                       │
│  ├─ Admin approves payment → school state: active           │
│  ├─ User selects modules to activate                        │
│  ├─ Feature flags created                                   │
│  └─ Redirect to /dashboard/setup/wizard                     │
│                                                             │
│  Phase 6: Setup Wizard (SetupWizard)                        │
│  ├─ Step 1: School Profile                                  │
│  ├─ Step 2: Grades & Classes                                │
│  ├─ Step 3: Fee Structure                                   │
│  ├─ Step 4: Staff Types                                     │
│  ├─ Step 5: Staff Members                                   │
│  ├─ Step 6: Pupils                                          │
│  ├─ Step 7: Review & Complete                               │
│  └─ Complete → Redirect to /dashboard                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Required Code Changes

#### Change 1: Fix App.tsx Routes

**File:** `src/App.tsx`

```typescript
// BEFORE (Line 132)
<Route path="/onboarding" element={<AccountCreationPage />} />

// AFTER
<Route path="/onboarding" element={<OnboardingPage />} />
```

#### Change 2: Fix KYCOnboardingPage Redirect

**File:** `src/pages/onboarding/KYCOnboardingPage.tsx`

```typescript
// BEFORE (Line 121)
navigate("/dashboard/pending");

// AFTER
navigate("/dashboard");
```

#### Change 3: Fix PaymentPage Redirect

**File:** `src/pages/onboarding/PaymentPage.tsx`

```typescript
// BEFORE (Line 86)
navigate("/dashboard");

// AFTER
navigate("/dashboard/setup/wizard");
```

#### Change 4: Add Terms Acceptance to OnboardingPage

**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// ADD to imports
import { TermsCheckbox } from "@/components/auth/TermsCheckbox";

// ADD to component state
const [termsAccepted, setTermsAccepted] = useState(false);

// ADD to Step 4 (Review)
<div className="rounded-lg bg-muted/50 p-4">
  <TermsCheckbox onAccept={setTermsAccepted} />
</div>

// UPDATE Button (Line 495)
<Button 
  type="submit" 
  variant="hero" 
  disabled={loading || !termsAccepted}
>
  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</> : "Complete Registration"}
</Button>
```

#### Change 5: Enforce Email Confirmation

**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// BEFORE (Line 82-89)
useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    // Don't auto-fill or skip steps - let user go through full onboarding
  };
  checkUser();
}, []);

// AFTER
useEffect(() => {
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && !user.email_confirmed_at) {
      setError("Please confirm your email before proceeding. Check your inbox.");
      setStep(1);
      return;
    }
    
    setUser(user);
  };
  checkUser();
}, []);
```

#### Change 6: Standardize Module Catalog

**File:** `src/pages/onboarding/ModuleSelectionPage.tsx`

```typescript
// BEFORE (Line 44)
.from("module_catalog")

// AFTER
.from("feature_catalog")
```

**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// BEFORE (Line 71)
.from("feature_catalog")

// AFTER - Keep as is, this is correct
```

**File:** `src/pages/auth/ActivationPage.tsx`

```typescript
// BEFORE (Line 21)
.from("feature_catalog")

// AFTER - Keep as is, this is correct
```

#### Change 7: Add Missing School States

**File:** `src/hooks/useSchoolStatus.ts`

```typescript
// BEFORE
export type SchoolState = 'no_school' | 'setup_complete' | 'kyc_pending' | 'kyc_approved' | 'active';

// AFTER
export type SchoolState = 'no_school' | 'preview' | 'setup_complete' | 'kyc_pending' | 'kyc_approved' | 'payment_pending' | 'active';
```

#### Change 8: Fix SetupBanner Route

**File:** `src/components/dashboard/SetupBanner.tsx`

```typescript
// BEFORE (Line 17)
link: "/onboarding/school-setup",

// AFTER
link: "/onboarding",
```

#### Change 9: Update DashboardRouter

**File:** `src/components/auth/DashboardRouter.tsx`

```typescript
// BEFORE (Lines 78-98)
if (!isParent && !platformAdmin && user) {
  setSchoolState(schoolState);

  if (schoolState === 'no_school') {
    setCheckingOnboarding(false);
    return;
  }

  if (schoolState === 'active') {
    setCheckingOnboarding(false);
    return;
  }

  // For other states, let them through
  setCheckingOnboarding(false);
  return;
}

// AFTER
if (!isParent && !platformAdmin && user) {
  setSchoolState(schoolState);

  // If no school, redirect to onboarding
  if (schoolState === 'no_school') {
    setCheckingOnboarding(false);
    navigate("/onboarding", { replace: true });
    return;
  }

  // If school is active, let them through
  if (schoolState === 'active') {
    setCheckingOnboarding(false);
    return;
  }

  // For incomplete states, let them through (banner will guide)
  setCheckingOnboarding(false);
  return;
}
```

#### Change 10: Add Duplicate Email Check

**File:** `src/pages/auth/OnboardingPage.tsx`

```typescript
// BEFORE (Line 109)
const authResult = await signUp(email, getValues("password"), getValues("fullName"));

// AFTER
// Check for duplicate email
const { data: existingProfile } = await supabase
  .from("profiles")
  .select("id")
  .eq("email", email.toLowerCase())
  .maybeSingle();

if (existingProfile) {
  setError("Email already registered. Please sign in instead.");
  setLoading(false);
  return;
}

const authResult = await signUp(email, getValues("password"), getValues("fullName"));
```

---

## 4. Database Changes Required

### 4.1 Add Missing School States

**File:** `supabase/migrations/20260123_billing_subscription_control.sql` (or new migration)

```sql
-- Update school state CHECK constraint to include all states
ALTER TABLE schools DROP CONSTRAINT IF EXISTS schools_state_check;

ALTER TABLE schools ADD CONSTRAINT schools_state_check 
  CHECK (state IN (
    'no_school',
    'preview', 
    'setup_complete',
    'kyc_pending',
    'kyc_approved',
    'payment_pending',
    'active',
    'suspended'
  ));

-- Update state transition function
CREATE OR REPLACE FUNCTION update_school_state(
  p_school_id UUID,
  p_new_state TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_state TEXT;
  v_result JSONB;
BEGIN
  -- Get current state
  SELECT state INTO v_old_state FROM schools WHERE id = p_school_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'School not found');
  END IF;
  
  -- Validate state transition
  IF NOT is_valid_state_transition(v_old_state, p_new_state) THEN
    RETURN jsonb_build_object(
      'success', 
      false, 
      'error', 
      format('Invalid state transition from %s to %s', v_old_state, p_new_state)
    );
  END IF;
  
  -- Update state
  UPDATE schools 
  SET 
    state = p_new_state,
    updated_at = NOW()
  WHERE id = p_school_id;
  
  -- Log state change
  INSERT INTO audit_logs (
    school_id,
    user_id,
    action,
    table_name,
    old_data,
    new_data
  ) VALUES (
    p_school_id,
    auth.uid(),
    'state_change',
    'schools',
    jsonb_build_object('state', v_old_state),
    jsonb_build_object('state', p_new_state)
  );
  
  RETURN jsonb_build_object(
    'success', 
    true, 
    'old_state', 
    v_old_state, 
    'new_state', 
    p_new_state
  );
END;
$$;

-- State transition validation function
CREATE OR REPLACE FUNCTION is_valid_state_transition(
  p_old_state TEXT,
  p_new_state TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Define valid transitions
  CASE p_old_state
    WHEN 'no_school' THEN
      RETURN p_new_state IN ('preview');
    WHEN 'preview' THEN
      RETURN p_new_state IN ('kyc_pending', 'active');
    WHEN 'kyc_pending' THEN
      RETURN p_new_state IN ('kyc_approved', 'rejected');
    WHEN 'kyc_approved' THEN
      RETURN p_new_state IN ('payment_pending', 'active');
    WHEN 'payment_pending' THEN
      RETURN p_new_state IN ('active', 'payment_rejected');
    WHEN 'active' THEN
      RETURN p_new_state IN ('suspended', 'inactive');
    WHEN 'suspended' THEN
      RETURN p_new_state IN ('active');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;
```

### 4.2 Add Audit Logging for Onboarding

**File:** New migration or existing security hardening migration

```sql
-- Add audit logging for onboarding events
CREATE OR REPLACE FUNCTION log_onboarding_event(
  p_school_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    school_id,
    user_id,
    action,
    table_name,
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    p_school_id,
    auth.uid(),
    p_event_type,
    'onboarding',
    p_event_data,
    current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$$;
```

---

## 5. Testing Checklist

### 5.1 Critical Path Testing

- [ ] **Test 1:** New user signs up → completes onboarding → redirected to KYC
- [ ] **Test 2:** User completes KYC → redirected to module selection
- [ ] **Test 3:** User selects modules → redirected to payment
- [ ] **Test 4:** User submits payment → redirected to setup wizard
- [ ] **Test 5:** User completes setup wizard → redirected to dashboard
- [ ] **Test 6:** Admin approves payment → school state changes to active
- [ ] **Test 7:** User with incomplete onboarding sees SetupBanner
- [ ] **Test 8:** User with active school sees no SetupBanner
- [ ] **Test 9:** Email confirmation enforced before onboarding
- [ ] **Test 10:** Duplicate email rejected

### 5.2 Route Testing

- [ ] `/onboarding` → OnboardingPage (not 404)
- [ ] `/onboarding/kyc` → KYCOnboardingPage (not 404)
- [ ] `/onboarding/modules` → ModuleSelectionPage (not 404)
- [ ] `/onboarding/payment` → PaymentPage (not 404)
- [ ] `/onboarding/activate` → ActivationPage (not 404)
- [ ] `/dashboard/pending` → Should redirect to dashboard or be removed
- [ ] `/dashboard/setup/wizard` → SetupWizard (not 404)

### 5.3 State Transition Testing

- [ ] `no_school` → `preview` (on school creation)
- [ ] `preview` → `kyc_pending` (on KYC submission)
- [ ] `kyc_pending` → `kyc_approved` (on admin approval)
- [ ] `kyc_approved` → `payment_pending` (on payment submission)
- [ ] `payment_pending` → `active` (on admin approval)
- [ ] `active` → `suspended` (on admin action)

---

## 6. Implementation Priority

### Phase 1: Critical Fixes (Before Production)

**Effort:** 8 hours  
**Impact:** HIGH - Fixes broken onboarding flow

1. ✅ Fix App.tsx routes (30 min)
2. ✅ Fix KYCOnboardingPage redirect (15 min)
3. ✅ Fix PaymentPage redirect (15 min)
4. ✅ Fix SetupBanner route (15 min)
5. ✅ Add terms acceptance to OnboardingPage (1 hour)
6. ✅ Enforce email confirmation (1 hour)
7. ✅ Add duplicate email check (1 hour)
8. ✅ Update school state type definition (30 min)
9. ✅ Update DashboardRouter redirects (1 hour)
10. ✅ Standardize module catalog table (1 hour)
11. ✅ Test complete flow end-to-end (2 hours)

### Phase 2: Enhancements (Week 1)

**Effort:** 12 hours  
**Impact:** MEDIUM - Improves UX and data integrity

1. ✅ Add progress persistence to KYC (2 hours)
2. ✅ Add audit logging for onboarding (2 hours)
3. ✅ Add onboarding analytics (4 hours)
4. ✅ Improve error messages (2 hours)
5. ✅ Add CAPTCHA protection (2 hours)

### Phase 3: Polish (Month 1)

**Effort:** 20 hours  
**Impact:** LOW - Nice to have features

1. ✅ Add welcome email (3 hours)
2. ✅ Add help text and tooltips (3 hours)
3. ✅ Add auto-save to setup wizard (3 hours)
4. ✅ Implement CSV import (8 hours)
5. ✅ Add undo/redo in wizard (3 hours)

---

## 7. File Inventory

### Core Onboarding Files

**Authentication & Onboarding:**
- `src/pages/auth/OnboardingPage.tsx` - 5-step wizard (NEEDS FIXES)
- `src/pages/auth/AccountCreationPage.tsx` - Wrapper for OnboardingPage
- `src/pages/auth/ActivationPage.tsx` - School activation
- `src/pages/onboarding/KYCOnboardingPage.tsx` - KYC verification (NEEDS FIXES)
- `src/pages/onboarding/ModuleSelectionPage.tsx` - Module selection (NEEDS FIXES)
- `src/pages/onboarding/PaymentPage.tsx` - Payment submission (NEEDS FIXES)

**Setup Wizard:**
- `src/pages/school/SetupWizard/index.tsx` - Main wizard
- `src/pages/school/SetupWizard/Step1Profile.tsx` through `Step7Review.tsx`
- `src/hooks/useSetupWizard.ts` - Wizard state management
- `src/lib/services/schoolSetupService.ts` - Save/load setup data

**Routing & State:**
- `src/App.tsx` - Route configuration (NEEDS FIXES)
- `src/components/auth/DashboardRouter.tsx` - Role-based routing (NEEDS FIXES)
- `src/hooks/useSchoolStatus.ts` - School state management (NEEDS UPDATES)
- `src/components/dashboard/SetupBanner.tsx` - Onboarding guidance (NEEDS FIXES)

**Services:**
- `src/lib/services/users.ts` - Auth service functions
- `src/lib/services/kycService.ts` - KYC service
- `src/lib/services/billingService.ts` - Billing logic
- `src/lib/services/featureGuardService.ts` - Feature access

**Components:**
- `src/components/modules/ModuleSelector.tsx` - Module selection
- `src/components/auth/TermsCheckbox.tsx` - Terms acceptance
- `src/components/FeatureGate.tsx` - Feature access control

---

## 8. Conclusion

### Current State

The onboarding workflow is **BROKEN** and requires immediate fixes before production deployment. Multiple implementation paths exist that are not properly integrated, leading to:

- ❌ 404 errors on multiple routes
- ❌ Incorrect redirects after onboarding steps
- ❌ Missing terms acceptance
- ❌ No email confirmation enforcement
- ❌ Inconsistent module catalog usage
- ❌ Incomplete school state machine

### Recommendation

**DO NOT DEPLOY TO PRODUCTION** until Phase 1 critical fixes are implemented (8 hours of work).

### Next Steps

1. **Immediate (Today):**
   - Fix all routing issues
   - Fix redirects
   - Add terms acceptance
   - Enforce email confirmation
   - Test complete flow

2. **This Week:**
   - Add progress persistence
   - Add audit logging
   - Improve error messages
   - Add CAPTCHA

3. **Next Sprint:**
   - Add analytics
   - Add help text
   - Implement CSV import
   - Add welcome email

---

**Audit Completed By:** AI Assistant  
**Review Status:** Pending human review  
**Next Review:** After critical fixes implemented  
**Recommendation:** Fix critical issues before production deployment