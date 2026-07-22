# Module Selection & Feature Activation Workflow Audit

**Date:** 2026-07-07  
**Scope:** Post-account creation module selection, feature activation, and configuration  
**Status:** Critical Workflow Gap Identified

---

## Executive Summary

The module selection workflow has a **critical missing piece**: there is **no mechanism for users to select which modules they want** after creating an account. The system creates schools with a trial subscription but provides **no way to choose or activate specific features**.

**Risk Level:** 🔴 HIGH  
**Impact:** Users cannot customize their experience, leading to confusion and potential churn  
**Recommendation:** Implement module selection flow before or during onboarding

---

## 1. Current Workflow Analysis

### 1.1 What Happens Now

```
User Registration (OnboardingPage.tsx)
    ↓
1. Email verification (OTP)
2. School details (name, subdomain)
3. Review & submit
    ↓
Database: create_school_onboarding RPC
    - Creates school (state = 'draft')
    - Assigns SCHOOL_OWNER role
    - Creates trial subscription (14 days)
    - NO feature flags created
    ↓
User redirected to /dashboard
    ↓
User sees SetupHub with 5 modules
    - All modules show "Not Started"
    - No indication which are "activated"
    - User must configure ALL modules
    ↓
FeatureGate blocks access to features
    - Shows "Feature Not Activated" modal
    - Links to /onboarding/activate (DOESN'T EXIST)
```

### 1.2 Key Files Analyzed

**Frontend:**
- `src/pages/auth/OnboardingPage.tsx` - School creation (no module selection)
- `src/pages/dashboard/SetupHub.tsx` - Module configuration hub
- `src/components/FeatureGate.tsx` - Feature access control
- `src/hooks/useFeatureAccess.ts` - Feature gating logic
- `src/store/setupStore.ts` - Module setup state management

**Backend:**
- `supabase/migrations/20240010_update_onboarding_rpc.sql` - Onboarding RPC
- `supabase/migrations/20240001_platform_foundation.sql` - Feature catalog schema
- `src/lib/services/schools.ts` - Feature flag services

**Admin:**
- `src/pages/admin/FeaturesPage.tsx` - Admin feature catalog management
- `src/pages/admin/PricingPage.tsx` - Pricing display
- `src/pages/admin/ActivationQueuePage.tsx` - School activation queue

---

## 2. Critical Issues

### 🔴 2.1 No Module Selection During Onboarding
**Severity:** CRITICAL  
**Location:** `src/pages/auth/OnboardingPage.tsx:1-346`

**Issue:** Users cannot select which modules they want during school creation.

```typescript
// OnboardingPage.tsx - Step 4 only shows:
<div className="rounded-lg bg-primary/5 p-4 border border-primary/10 text-sm">
  <p className="text-primary font-medium mb-1">Plan: 14-Day Free Trial</p>
  <p className="text-muted-foreground">Get full access to all modules. No credit card required.</p>
</div>
// No module selection UI!
```

**Impact:**
- Users don't know what modules are available
- No way to customize pricing
- All users get "all modules" but can't use any until configured
- Confusion about what they're signing up for

**Current Behavior:**
1. School is created with NO feature flags
2. All features are locked (no `school_feature_flags` records)
3. User sees SetupHub with 5 modules, all "Not Started"
4. User tries to use a feature → FeatureGate blocks them
5. Modal says "Request Activation" → links to `/onboarding/activate` (404!)

**Expected Behavior:**
1. User selects modules during onboarding
2. System creates `school_feature_flags` for selected modules
3. User can immediately use selected modules
4. Other modules remain locked until activated

---

### 🔴 2.2 Missing Activation Page
**Severity:** CRITICAL  
**Location:** Referenced in 3 places but doesn't exist

**References to non-existent page:**
```typescript
// FeatureGate.tsx:82
navigate("/onboarding/activate");

// PreviewBanner.tsx:16
ctaPath: "/onboarding/activate";

// App.tsx - NO ROUTE DEFINED for /onboarding/activate
```

**Impact:**
- Users clicking "Request Activation" get 404 errors
- No way to request feature activation
- No way to upgrade plan or select modules
- Broken user experience

**Current Routes:**
```typescript
// App.tsx
<Route path="/onboarding" element={<OnboardingPage />} />
// Missing: <Route path="/onboarding/activate" element={<ActivationPage />} />
```

---

### 🔴 2.3 No Feature Flag Creation on School Creation
**Severity:** HIGH  
**Location:** `supabase/migrations/20240010_update_onboarding_rpc.sql:7-72`

**Issue:** The `create_school_onboarding` RPC doesn't create any feature flags.

```sql
CREATE OR REPLACE FUNCTION public.create_school_onboarding(
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
  v_full_name TEXT;
BEGIN
  -- 1. Check if authenticated
  -- 2. Check if subdomain is taken
  -- 3. Create school (state='draft')
  -- 4. Get SCHOOL_OWNER role
  -- 5. Assign user as school owner
  -- 6. Create trial subscription
  -- 7. Sync full name
  -- 8. Return result
  
  -- MISSING: Create school_feature_flags for trial modules
  -- MISSING: Set default enabled modules
END;
$$;
```

**Impact:**
- New schools have NO feature flags
- All features are locked by default
- Users must manually configure each module
- No "out-of-the-box" experience

**Expected Behavior:**
```sql
-- After creating school, add default feature flags:
INSERT INTO school_feature_flags (school_id, feature_id, status)
SELECT v_school_id, id, 'active'
FROM feature_catalog
WHERE key IN ('students', 'teachers', 'attendance') -- Free modules
  AND is_active = true;

-- Or create all as 'inactive' and let user activate:
INSERT INTO school_feature_flags (school_id, feature_id, status)
SELECT v_school_id, id, 'inactive'
FROM feature_catalog
WHERE is_active = true;
```

---

### 🟡 2.4 FeatureGate Shows Wrong Message
**Severity:** MEDIUM  
**Location:** `src/hooks/useFeatureAccess.ts:77-83`

**Issue:** Locked features show generic message, not context-aware.

```typescript
return {
  enabled: false,
  locked: true,
  mode: "inactive",
  lockReason:
    "This feature is not activated for your school. Contact your admin or upgrade your plan.",
};
```

**Impact:**
- Message doesn't distinguish between:
  - School in preview mode (needs activation)
  - School active but feature not selected
  - Feature disabled by admin
  - Payment pending
- Users don't know what action to take

**Current Scenarios:**
1. **Preview mode school:** Should say "Request activation from admin"
2. **Active school, no feature flags:** Should say "Select this module in Setup"
3. **Active school, feature inactive:** Should say "Upgrade plan to activate"
4. **Payment pending:** Should say "Payment verification in progress"

**Expected Behavior:**
```typescript
if (accessState === "preview") {
  return {
    lockReason: "Your school is in preview mode. Request activation to unlock features.",
    action: "request_activation"
  };
}

if (accessState === "active" && flagStatus === "inactive") {
  return {
    lockReason: "This module is not selected. Add it in Module Setup.",
    action: "go_to_setup"
  };
}
```

---

### 🟡 2.5 SetupHub Assumes All Modules Are Available
**Severity:** MEDIUM  
**Location:** `src/pages/dashboard/SetupHub.tsx:10-16`

**Issue:** SetupHub shows all 5 modules regardless of school's plan or feature flags.

```typescript
const modules: { key: ModuleKey; name: string; description: string; icon: typeof CreditCard; steps: number }[] = [
  { key: "finance", name: "Finance", description: "Fee structures, billing rules, bursar setup", icon: CreditCard, steps: 4 },
  { key: "exams", name: "Exams", description: "Grading systems, exam types, report cards", icon: BookOpen, steps: 4 },
  { key: "attendance", name: "Attendance", description: "Modes, absence rules, parent triggers", icon: ClipboardCheck, steps: 3 },
  { key: "parent", name: "Parent Portal", description: "Linking, visibility, notifications", icon: Users2, steps: 3 },
  { key: "communication", name: "Communication", description: "SMS/Email channels, templates, alerts", icon: MessageSquare, steps: 3 },
];
```

**Impact:**
- Users see modules they haven't selected/paid for
- No visual distinction between:
  - Free modules (included in trial)
  - Paid modules (require upgrade)
  - Unavailable modules (disabled by admin)
- Users waste time configuring modules they don't need

**Expected Behavior:**
```typescript
const availableModules = modules.filter(m => {
  const flag = featureFlags[m.key];
  const pricing = featurePricing[m.key];
  
  // Show if:
  // 1. Module is active (already selected)
  // 2. Module is available in trial (free or included)
  // 3. User is admin (can activate)
  
  return flag === 'active' || isTrialModule(m.key) || userRole === 'school_owner';
});
```

---

### 🟡 2.6 No Module Selection UI Exists
**Severity:** HIGH  
**Location:** Missing from codebase

**Issue:** There is NO UI for selecting/activating modules.

**What exists:**
- ✅ Admin can toggle features in `feature_catalog` (global on/off)
- ✅ Admin can activate schools (change state from 'preview' to 'active')
- ✅ Admin can view pricing in `PricingPage`
- ❌ Users CANNOT select modules for their school
- ❌ Users CANNOT upgrade plan
- ❌ Users CANNOT activate individual features

**What's missing:**
1. **Module Selection Page** - Let users pick modules during/after onboarding
2. **Plan Selection Page** - Let users choose subscription plan
3. **Feature Activation Page** - Let users activate individual features
4. **Upgrade Flow** - Let users upgrade from trial to paid

---

## 3. Database Schema Analysis

### 3.1 Current Schema

```sql
-- Feature catalog (global list of available features)
feature_catalog (
  id, key, name, description, 
  monthly_price, setup_fee, 
  is_active, category
)

-- School feature flags (which features a school has)
school_feature_flags (
  id, school_id, feature_id, 
  status, enabled_at
)

-- Subscriptions (billing)
subscriptions (
  id, school_id, plan_id,
  status, current_period_start, current_period_end
)

-- Feature pricing (separate from catalog)
feature_pricing (
  id, feature_id, monthly_price, 
  setup_price, currency, is_active
)
```

### 3.2 What's Missing

**No default feature flags on school creation:**
```sql
-- When school is created, NO school_feature_flags are created
-- This means all features are locked by default
```

**No plan selection:**
```sql
-- Subscriptions table has plan_id but it's nullable
-- No mechanism to select a plan during onboarding
```

**No module selection tracking:**
```sql
-- No table to track:
-- - Which modules user selected during onboarding
-- - When they selected them
-- - What pricing tier they chose
```

---

## 4. User Flow Gaps

### 4.1 Current Flow (Broken)

```
1. User signs up
   ↓
2. Creates school (14-day trial)
   ↓
3. Redirected to /dashboard
   ↓
4. Sees SetupHub with 5 modules
   ↓
5. Clicks "Finance" module
   ↓
6. FeatureGate shows "Feature Not Activated"
   ↓
7. Clicks "Request Activation"
   ↓
8. Navigates to /onboarding/activate
   ↓
9. 404 ERROR - Page doesn't exist
   ↓
10. User is stuck, cannot proceed
```

### 4.2 Expected Flow (Missing)

```
Option A: Module Selection During Onboarding
─────────────────────────────────────────────
1. User signs up
   ↓
2. Step 1: Email verification
   ↓
3. Step 2: OTP verification
   ↓
4. Step 3: School details
   ↓
5. Step 4: Select modules (NEW!)
   - Show available modules with pricing
   - Let user select which modules they want
   - Show total monthly cost
   - Explain trial period
   ↓
6. Step 5: Review & confirm
   ↓
7. Create school + feature flags for selected modules
   ↓
8. Redirect to SetupHub
   ↓
9. User can immediately use selected modules
   ↓
10. User can configure other modules later

Option B: Module Selection After Onboarding
─────────────────────────────────────────────
1. User signs up and creates school
   ↓
2. Redirected to /dashboard
   ↓
3. PreviewBanner shows "Preview Mode"
   ↓
4. User clicks "Request Activation"
   ↓
5. Shows module selection page (NEW!)
   - Show available modules
   - Let user select modules
   - Show pricing
   ↓
6. User selects modules and confirms
   ↓
7. System creates school_feature_flags
   ↓
8. School state changes to 'active' (or 'payment_pending')
   ↓
9. User can now use selected modules
```

---

## 5. Missing Components

### 5.1 Module Selection Page (During Onboarding)

**File:** `src/pages/auth/OnboardingPage.tsx` (add Step 5)

**Purpose:** Let users select which modules they want before creating school.

**UI Requirements:**
- Display all available modules from `feature_catalog`
- Show monthly price and setup fee for each
- Allow multi-select with checkboxes
- Show running total of selected modules
- Highlight free vs paid modules
- Show trial period details
- Link to full pricing page

**Data Flow:**
```typescript
// On submit:
1. Get selected module IDs
2. Create school (existing flow)
3. Create school_feature_flags for selected modules
4. Create subscription with selected modules
5. Redirect to SetupHub
```

---

### 5.2 Activation/Upgrade Page (Post-Onboarding)

**File:** `src/pages/auth/ActivationPage.tsx` (NEW FILE)

**Purpose:** Allow users to activate features after onboarding.

**UI Requirements:**
- Show current school status (preview/active)
- Show currently activated modules
- Show available modules with pricing
- Allow selecting additional modules
- Show upgrade options
- Payment integration (future)

**Routes:**
```typescript
// App.tsx
<Route path="/onboarding/activate" element={<ActivationPage />} />
```

---

### 5.3 Module Selection Component

**File:** `src/components/modules/ModuleSelector.tsx` (NEW FILE)

**Purpose:** Reusable module selection UI.

**Props:**
```typescript
{
  modules: FeatureCatalog[];
  selected: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  readonly?: boolean;
  showPricing?: boolean;
}
```

**Features:**
- Card-based layout
- Checkbox selection
- Price display
- Module descriptions
- Disabled state for unavailable modules

---

### 5.4 Plan Selection Component

**File:** `src/components/modules/PlanSelector.tsx` (NEW FILE)

**Purpose:** Let users choose subscription plan.

**Options:**
- Free Trial (14 days, limited modules)
- Starter Plan (K99/month, 3 modules)
- Growth Plan (custom modules)
- Enterprise Plan (all modules)

**UI:**
- Pricing cards
- Feature comparison
- CTA buttons

---

## 6. Database Changes Required

### 6.1 Add Default Feature Flags on School Creation

**File:** `supabase/migrations/20240011_default_feature_flags.sql` (NEW)

```sql
CREATE OR REPLACE FUNCTION public.create_school_onboarding(
  p_school_name TEXT,
  p_subdomain   TEXT,
  p_admin_id     UUID,
  p_selected_modules UUID[] DEFAULT NULL -- NEW PARAMETER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
  v_role_id   UUID;
  v_result    JSONB;
  v_full_name TEXT;
  v_module_id UUID;
BEGIN
  -- Existing code...
  
  -- 6. Create trial subscription (existing)
  INSERT INTO subscriptions (school_id, status, current_period_start, current_period_end)
  VALUES (v_school_id, 'trialing', NOW(), NOW() + INTERVAL '14 days');
  
  -- 7. Create feature flags for selected modules (NEW)
  IF p_selected_modules IS NOT NULL THEN
    -- User selected specific modules
    INSERT INTO school_feature_flags (school_id, feature_id, status)
    SELECT v_school_id, unnest(p_selected_modules), 'active'
    ON CONFLICT DO NOTHING;
  ELSE
    -- Default: activate free modules only
    INSERT INTO school_feature_flags (school_id, feature_id, status)
    SELECT v_school_id, fc.id, 'active'
    FROM feature_catalog fc
    WHERE fc.monthly_price = 0 
      AND fc.is_active = true
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Rest of existing code...
END;
$$;
```

### 6.2 Add Module Selection Tracking

**File:** `supabase/migrations/20240012_module_selection.sql` (NEW)

```sql
-- Track module selections during onboarding
CREATE TABLE IF NOT EXISTS module_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  selected_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(school_id, feature_id)
);

CREATE INDEX idx_module_selections_school_id ON module_selections(school_id);
```

---

## 7. Frontend Changes Required

### 7.1 Update OnboardingPage.tsx

**Add Step 5: Module Selection**

```typescript
// Add to OnboardingPage.tsx
const [selectedModules, setSelectedModules] = useState<string[]>([]);

// Fetch available modules
const { data: availableModules } = useQuery({
  queryKey: ['feature-catalog'],
  queryFn: fetchFeatureCatalog
});

// Add step 5 to wizard
const steps = [
  // ... existing steps 1-4
  {
    title: "Choose Modules",
    description: "Select the modules you need for your school",
    content: (
      <ModuleSelector
        modules={availableModules}
        selected={selectedModules}
        onSelectionChange={setSelectedModules}
        showPricing={true}
      />
    )
  }
];

// Update onSubmit to pass selected modules
const onSubmit = async (data: OnboardingValues) => {
  const result = await onboardSchool(
    data.schoolName, 
    data.subdomain, 
    user.id,
    selectedModules // NEW PARAMETER
  );
  // ... rest of flow
};
```

### 7.2 Create ActivationPage.tsx

```typescript
// src/pages/auth/ActivationPage.tsx
const ActivationPage = () => {
  const { data: school } = useQuery({
    queryKey: ['current-school'],
    queryFn: fetchCurrentSchool
  });
  
  const { data: availableModules } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: fetchFeatureCatalog
  });
  
  const { data: currentFlags } = useQuery({
    queryKey: ['school-feature-flags', school?.id],
    queryFn: () => fetchSchoolFeatureFlags(school.id)
  });
  
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  const activateMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      // Create school_feature_flags for selected modules
      await Promise.all(
        moduleIds.map(id => 
          upsertFeatureFlag(school.id, id, 'active')
        )
      );
      
      // Update school state to active
      await updateSchoolState(school.id, 'active');
    },
    onSuccess: () => {
      toast.success("Modules activated successfully");
      navigate('/dashboard');
    }
  });
  
  return (
    <div className="space-y-6">
      <div>
        <h1>Activate Your School</h1>
        <p>Select modules to activate for your school</p>
      </div>
      
      <ModuleSelector
        modules={availableModules}
        selected={selectedModules}
        onSelectionChange={setSelectedModules}
        showPricing={true}
      />
      
      <Button onClick={() => activateMutation.mutate(selectedModules)}>
        Activate Selected Modules
      </Button>
    </div>
  );
};
```

### 7.3 Update FeatureGate.tsx

```typescript
// Show context-aware messages
const getLockMessage = () => {
  if (mode === "preview") {
    return {
      title: "Preview Mode",
      message: "Your school is in preview mode. Activate to unlock features.",
      action: "Request Activation",
      path: "/onboarding/activate"
    };
  }
  
  if (mode === "inactive" && accessState === "active") {
    return {
      title: "Module Not Selected",
      message: "This module is not activated for your school. Add it in Module Setup.",
      action: "Go to Setup",
      path: "/dashboard/setup"
    };
  }
  
  if (mode === "payment_pending") {
    return {
      title: "Payment Pending",
      message: "We're verifying your payment. Access will unlock soon.",
      action: null,
      path: null
    };
  }
  
  return {
    title: "Feature Locked",
    message: "This feature is not available. Contact your admin.",
    action: "Upgrade Plan",
    path: "/school/settings"
  };
};
```

---

## 8. UX Improvements

### 8.1 Add Module Selection to Onboarding

**Current:** 4-step wizard  
**Proposed:** 5-step wizard

```
Step 1: Email
Step 2: OTP Verification
Step 3: School Details
Step 4: Select Modules (NEW)
Step 5: Review & Submit
```

**Benefits:**
- Users know exactly what they're getting
- Clear pricing transparency
- No confusion after signup
- Immediate access to selected modules

### 8.2 Improve SetupHub

**Current:** Shows all 5 modules  
**Proposed:** Show only available modules

```typescript
const visibleModules = modules.filter(m => {
  const flag = featureFlags[m.key];
  
  // Always show if:
  // 1. Module is active
  // 2. Module is free (included in trial)
  // 3. User is owner/admin (can configure)
  
  return flag === 'active' || 
         isFreeModule(m.key) || 
         ['school_owner', 'school_admin'].includes(userRole);
});
```

**Add badges:**
- "Free" for no-cost modules
- "KXX/mo" for paid modules
- "Active" for enabled modules
- "Locked" for unavailable modules

### 8.3 Add Plan Selection

**Show pricing tiers:**
```
Free Trial
- 14 days
- 3 modules (students, teachers, attendance)
- Limited support

Starter - K99/mo
- Up to 300 students
- 3 modules
- Email support

Growth - Custom
- Unlimited students
- Any 5 modules
- Priority support

Enterprise - Custom
- All modules
- Unlimited everything
- Dedicated support
```

---

## 9. Security Considerations

### 9.1 Prevent Feature Flag Bypass

**Current:** RLS policies only allow platform admins to write feature flags

```sql
CREATE POLICY "school_feature_flags_write" ON school_feature_flags 
  FOR ALL USING (is_platform_admin());
```

**Issue:** Regular users cannot activate features, which is correct, but there's no mechanism to request activation.

**Solution:**
1. Add `activate_feature` RPC that validates:
   - User is school admin/owner
   - Feature is available in catalog
   - School is in valid state
2. Log all activation requests
3. Require payment for paid features (future)

### 9.2 Prevent Trial Abuse

**Current:** 14-day trial with no module limits

**Issues:**
- Users can create unlimited schools
- No email domain verification
- No phone verification
- No payment method required

**Solutions:**
1. Add email domain verification for schools
2. Limit to 1 trial per email domain
3. Add phone verification for trial signup
4. Require payment method before trial ends
5. Add CAPTCHA to prevent bot signups

---

## 10. Recommendations Priority Matrix

### Immediate (Before Production)
1. ✅ **Create /onboarding/activate page** - Fix broken link
2. ✅ **Add module selection to onboarding** - Let users choose modules
3. ✅ **Create default feature flags on school creation** - Enable basic modules
4. ✅ **Update FeatureGate messages** - Context-aware lock reasons
5. ✅ **Add module selection tracking** - Audit trail

### High Priority (Within 1 Week)
6. ✅ **Implement plan selection** - Starter/Growth/Enterprise tiers
7. ✅ **Add payment integration** - For paid modules
8. ✅ **Update SetupHub to show only available modules** - Reduce confusion
9. ✅ **Add module pricing display** - Transparency
10. ✅ **Add upgrade flow** - From trial to paid

### Medium Priority (Within 1 Month)
11. ✅ **Add module recommendations** - Based on school type/size
12. ✅ **Add module bundles** - Pre-configured packages
13. ✅ **Add usage-based pricing** - Pay per student
14. ✅ **Add module trial periods** - Try before buying
15. ✅ **Add module dependencies** - Some modules require others

### Low Priority (Nice to Have)
16. ✅ **Add module marketplace** - Third-party integrations
17. ✅ **Add module reviews/ratings** - Social proof
18. ✅ **Add module recommendations** - AI-powered suggestions
19. ✅ **Add module usage analytics** - Track adoption
20. ✅ **Add module A/B testing** - Test different configurations

---

## 11. Code Examples

### 11.1 Module Selector Component

```typescript
// src/components/modules/ModuleSelector.tsx
type ModuleSelectorProps = {
  modules: FeatureCatalog[];
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  readonly?: boolean;
  showPricing?: boolean;
};

export const ModuleSelector = ({ 
  modules, 
  selected, 
  onSelectionChange, 
  readonly = false,
  showPricing = true 
}: ModuleSelectorProps) => {
  const toggleModule = (id: string) => {
    if (readonly) return;
    
    if (selected.includes(id)) {
      onSelectionChange(selected.filter(s => s !== id));
    } else {
      onSelectionChange([...selected, id]);
    }
  };
  
  const totalMonthly = modules
    .filter(m => selected.includes(m.id))
    .reduce((sum, m) => sum + Number(m.monthly_price), 0);
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map(module => {
          const isSelected = selected.includes(module.id);
          const isFree = module.monthly_price === 0;
          
          return (
            <Card
              key={module.id}
              className={cn(
                "cursor-pointer transition-all",
                isSelected && "border-primary bg-primary/5",
                readonly && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => toggleModule(module.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={isSelected} 
                    readOnly={readonly}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{module.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {module.description}
                    </p>
                    {showPricing && (
                      <div className="mt-2 text-xs">
                        {isFree ? (
                          <span className="text-success font-medium">Free</span>
                        ) : (
                          <span className="font-medium">
                            K{module.monthly_price}/mo
                            {module.setup_fee > 0 && (
                              <span className="text-muted-foreground">
                                {' '}+ K{module.setup_fee} setup
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {showPricing && selected.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total (monthly)</p>
                <p className="text-2xl font-bold">
                  K{totalMonthly.toLocaleString()}
                  {totalMonthly === 0 && '/mo'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {selected.length} module{selected.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
```

### 11.2 Updated Onboarding RPC

```typescript
// src/lib/services/users.ts
export async function onboardSchool(
  schoolName: string, 
  subdomain: string, 
  adminId: string,
  selectedModuleIds?: string[] // NEW PARAMETER
) {
  if (isDuplicate(`onboard:${subdomain}`)) {
    throw new Error("An onboarding request for this subdomain is already in progress. Please wait.");
  }

  const { data, error } = await supabase.rpc("create_school_onboarding", {
    p_school_name: schoolName,
    p_subdomain: subdomain,
    p_admin_id: adminId,
    p_selected_modules: selectedModuleIds || null, // NEW
  });
  if (error) throw error;
  return data;
}
```

### 11.3 Activation Page

```typescript
// src/pages/auth/ActivationPage.tsx
const ActivationPage = () => {
  const navigate = useNavigate();
  const { data: school } = useQuery({
    queryKey: ['current-school'],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('*')
        .eq('id', useAppStore.getState().currentSchool?.id)
        .single();
      return data;
    }
  });
  
  const { data: allModules } = useQuery({
    queryKey: ['feature-catalog'],
    queryFn: fetchFeatureCatalog
  });
  
  const { data: activeFlags } = useQuery({
    queryKey: ['school-feature-flags', school?.id],
    queryFn: () => fetchSchoolFeatureFlags(school.id)
  });
  
  const [selected, setSelected] = useState<string[]>([]);
  
  const activeModuleIds = activeFlags
    ?.filter(f => f.status === 'active')
    .map(f => f.feature_catalog?.id)
    .filter(Boolean) || [];
  
  const activateMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      // Create feature flags
      await Promise.all(
        moduleIds.map(id =>
          upsertFeatureFlag(school.id, id, 'active')
        )
      );
      
      // Update school state
      await updateSchoolState(school.id, 'active');
      
      // Refresh session
      await supabase.auth.refreshSession();
    },
    onSuccess: () => {
      toast.success("School activated successfully!");
      navigate('/dashboard/setup');
    }
  });
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Activate Your School</h1>
          <p className="text-muted-foreground mt-2">
            Select the modules you need to get started
          </p>
        </div>
        
        {school?.state === 'preview' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your school is in preview mode. Select modules to activate your account.
            </AlertDescription>
          </Alert>
        )}
        
        <ModuleSelector
          modules={allModules || []}
          selected={selected}
          onSelectionChange={setSelected}
          showPricing={true}
        />
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => activateMutation.mutate(selected)}
            disabled={selected.length === 0 || activateMutation.isPending}
            className="flex-1"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Activate {selected.length} Module{selected.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 12. Testing Checklist

### Functional Testing
- [ ] User can select modules during onboarding
- [ ] Selected modules are created as active feature flags
- [ ] User can access selected modules immediately after onboarding
- [ ] User can activate additional modules later
- [ ] FeatureGate shows correct message for each state
- [ ] /onboarding/activate page exists and works
- [ ] Module selection persists across page refreshes
- [ ] Trial period is correctly set (14 days)
- [ ] Subscription is created with correct status

### UX Testing
- [ ] Module selection UI is intuitive
- [ ] Pricing is clearly displayed
- [ ] Total cost is calculated correctly
- [ ] Free vs paid modules are clearly distinguished
- [ ] Users understand what they're selecting
- [ ] Error messages are clear and actionable
- [ ] Loading states are shown during activation
- [ ] Success confirmation is shown after activation

### Security Testing
- [ ] Users cannot activate modules they didn't select
- [ ] Users cannot bypass feature gates
- [ ] Only admins can modify feature flags
- [ ] Trial abuse is prevented (rate limiting)
- [ ] Feature flag changes are logged
- [ ] RLS policies are enforced

### Integration Testing
- [ ] Onboarding → Module Selection → Dashboard flow works
- [ ] Feature flags are correctly loaded on login
- [ ] JWT claims are updated after activation
- [ ] SetupHub shows only available modules
- [ ] FeatureGate blocks access correctly
- [ ] Admin can view activation requests

---

## 13. Migration Path

### Phase 1: Fix Broken Flow (Week 1)
1. Create `/onboarding/activate` page
2. Update FeatureGate messages
3. Add default feature flags on school creation
4. Test end-to-end flow

### Phase 2: Add Module Selection (Week 2)
1. Add module selection step to onboarding
2. Update onboarding RPC to accept selected modules
3. Create feature flags for selected modules
4. Test with real users

### Phase 3: Improve UX (Week 3)
1. Update SetupHub to show only available modules
2. Add plan selection
3. Add upgrade flow
4. Add payment integration

### Phase 4: Add Advanced Features (Week 4+)
1. Module recommendations
2. Module bundles
3. Usage-based pricing
4. Module marketplace

---

## 14. Conclusion

The module selection workflow is **critically broken** with a missing activation page and no mechanism for users to select modules. This creates a **dead-end user experience** where users cannot access any features after signup.

**Immediate Actions Required:**
1. Create `/onboarding/activate` page (fix 404)
2. Add module selection to onboarding flow
3. Create default feature flags on school creation
4. Update FeatureGate to show context-aware messages

**Estimated Effort:**
- Phase 1 (fix broken flow): 2-3 days
- Phase 2 (add module selection): 3-5 days
- Phase 3 (improve UX): 1 week
- Phase 4 (advanced features): 2-4 weeks

**Risk if Not Fixed:**
- Users cannot use the platform after signup
- High churn rate
- Poor first impression
- Support tickets flooding in
- Negative reviews

---

**Audit Completed By:** AI Assistant  
**Review Status:** Pending human review  
**Next Review:** After critical fixes implemented