# 🏥 School Pulse — Full Codebase Audit Report

**Date:** 2026-07-09  
**Auditor:** AI Code Audit  
**Codebase Version:** 1.0.0 (Vite + React 18 + TypeScript + Supabase + Tailwind/shadcn)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| **Overall Completion** | **~45%** of MVP |
| **Total Source Files** | ~110 (excluding `node_modules`, UI library) |
| **Services** | 16 files |
| **Pages** | ~30 components |
| **UI Components (shadcn)** | 49 files (many unused) |
| **Migrations** | 12 SQL files |
| **Test Coverage** | Effectively **0%** (1 placeholder test) |
| **Health Grade** | **C+** — Solid foundation, significant duplication, many features are service-only with no UI |

### Key Blockers

1. **Massive duplication** in finance/student/staff services (2–3 versions of the same CRUD).
2. **Setup Wizard** has a `TODO: Save all setup data to database` — the final save never fires.
3. **featureGuardService.ts** (singleton class) is **never imported anywhere** — dead code.
4. **rateLimit.ts** is **only imported in OnboardingPage** — the formal `RATE_LIMITS` constants are never used.
5. **feeService.ts** (533 lines) and **finance.ts** (433 lines) are **parallel implementations** of the same fee management.
6. **Login.tsx** (old login) is a dead file — replaced by `LoginPage.tsx`.
7. **49 shadcn UI components installed**, at least **8 are never imported** anywhere in the app.
8. **No automated tests** — the only test file is a placeholder.

---

## 2. Feature Inventory Table

### 2.1 Authentication & Onboarding

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Email/Password Sign Up | ✅ Done | `users.ts:signUp()`, `OnboardingPage.tsx` | ✅ Critical |
| Email/Password Sign In | ✅ Done | `users.ts:signIn()`, `LoginPage.tsx` | ✅ Critical |
| OTP Sign In | ✅ Done | `users.ts:signInWithOtp()`, `LoginPage.tsx` | ✅ Critical |
| Email Confirmation Banner | ✅ Done | `EmailConfirmationBanner.tsx`, `emailService.ts` | ✅ Critical |
| Forgot Password | ✅ Done | `ForgotPasswordPage.tsx`, `users.ts:sendPasswordReset()` | ✅ Critical |
| Onboarding Wizard (Signup + School Creation) | ✅ Done | `OnboardingPage.tsx` (4 steps), `users.ts:onboardSchool()` RPC | ✅ Critical |
| Module Selection at Onboarding | ✅ Done | `ModuleSelector.tsx`, passed to `create_school_onboarding` RPC | ✅ Critical |
| Terms of Service / Privacy | ✅ Done | `TermsCheckbox.tsx`, `TermsPage.tsx`, `PrivacyPage.tsx` | ✅ Critical |
| Auth Guard (RequireAuth) | ✅ Done | `RequireAuth.tsx` with `requirePlatformAdmin` prop | ✅ Critical |
| Session persistence (Zustand + localStorage) | ✅ Done | `appStore.ts` with `persist` middleware | ✅ Critical |
| Multi-tenant subdomain resolution | ✅ Done | `tenant.ts:getSubdomain()`, `TenantSwitchPrompt.tsx` | ✅ Critical |
| Activation Page (payment flow) | ⚠️ Partial | `ActivationPage.tsx` — UI exists, payment verification not wired end-to-end | ✅ Critical |
| Request deduplication | ✅ Done | `users.ts:isDuplicate()` — in-memory per-action dedup | ⚠️ Nice-to-have |
| Disposable email check | ✅ Done | `emailService.ts:isDisposableEmail()` — basic 5-domain list | ⚠️ Nice-to-have |

### 2.2 Feature Management / Gating

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Feature catalog (DB) | ✅ Done | `feature_catalog` table, `schools.ts:fetchFeatureCatalog()` | ✅ Critical |
| Feature flags per school | ✅ Done | `school_feature_flags` table, `schools.ts:fetchSchoolFeatureFlags()` | ✅ Critical |
| useFeatureAccess hook | ✅ Done | `useFeatureAccess.ts` — checks `accessState` + `featureFlags` | ✅ Critical |
| FeatureGate component | ✅ Done | `FeatureGate.tsx` — lock overlay + modal | ✅ Critical |
| Feature pricing table | ✅ Done | `feature_pricing` table in DB, read in `fetchFeatureCatalog()` | ✅ Critical |
| FeatureGuardService (class) | ❌ Dead Code | `featureGuardService.ts` — singleton, **never imported anywhere** | ❌ Remove |
| PreviewBanner | ✅ Done | `PreviewBanner.tsx` — shows when school is in preview mode | ✅ Critical |

### 2.3 Student CRUD

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| List students | ✅ Done | `pages/school/Students/index.tsx`, `studentService.ts:getStudents()` | ✅ Critical |
| Add student | ✅ Done | `pages/school/Students/AddStudent.tsx` | ✅ Critical |
| Edit student | ✅ Done | `pages/school/Students/EditStudent.tsx` | ✅ Critical |
| View student profile | ✅ Done | `pages/school/Students/StudentProfile.tsx` | ✅ Critical |
| Delete student (soft) | ✅ Done | `studentService.ts:deleteStudent()` | ✅ Critical |
| Search students | ✅ Done | `studentService.ts:searchStudents()` | ✅ Critical |
| Import students (CSV) | ⚠️ Service Only | `studentService.ts:importStudents()` — service exists, no UI | ⚠️ Nice-to-have |
| Guardian CRUD | ⚠️ Partial | `studentService.ts:createGuardian()`, `updateGuardian()` — no dedicated UI | ✅ Critical |

### 2.4 Staff CRUD

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| List staff | ✅ Done | `pages/school/Staff/index.tsx`, `staffService.ts:getStaff()` | ✅ Critical |
| Add staff | ✅ Done | `pages/school/Staff/AddStaff.tsx` | ✅ Critical |
| Edit staff | ✅ Done | `pages/school/Staff/EditStaff.tsx` | ✅ Critical |
| View staff profile | ✅ Done | `pages/school/Staff/StaffProfile.tsx` | ✅ Critical |
| Delete staff (soft) | ✅ Done | `staffService.ts:deleteStaff()` | ✅ Critical |
| Staff types CRUD | ✅ Done | `staffService.ts:getStaffTypes()`, `createStaffType()`, etc. | ✅ Critical |

### 2.5 Teachers

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| List teachers | ⚠️ Partial | `TeachersPage.tsx` (dashboard), `teachers.ts:fetchTeachers()` — read-only list | ✅ Critical |
| Teacher CRUD | ⚠️ Service Only | `teachers.ts:createTeacher()` — service only, no add/edit UI | ✅ Critical |
| Teacher ↔ Staff unification | ❌ Not Done | Teachers and Staff are **separate tables** with no link | ⚠️ Needs design decision |

### 2.6 Attendance

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Mark class attendance | ✅ Done | `AttendancePage.tsx`, `attendance.ts:submitBulkAttendance()` | ✅ Critical |
| Attendance management (by class) | ✅ Done | `pages/school/Attendance/index.tsx` | ✅ Critical |
| Attendance reports | ✅ Done | `pages/school/Attendance/AttendanceReport.tsx` | ✅ Critical |
| Daily summary | ✅ Done | `attendance.ts:fetchDailyAttendanceSummary()` | ✅ Critical |
| Student attendance history | ✅ Done | `attendance.ts:fetchStudentAttendance()` | ✅ Critical |
| Dashboard attendance widget | ✅ Done | `AttendanceWidget.tsx` | ✅ Critical |
| Attendance setup | ⚠️ Partial | `AttendanceSetup.tsx` — persists to `setupStore` only, not to DB | ⚠️ Nice-to-have |

### 2.7 Exams

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| List exams | ✅ Done | `ExamsPage.tsx`, `exams.ts:fetchExams()` | ✅ Critical |
| Create exam | ⚠️ Service Only | `exams.ts:createExam()` — no create UI on ExamsPage | ✅ Critical |
| Enter exam results | ⚠️ Service Only | `exams.ts:upsertExamResult()` — no UI | ✅ Critical |
| View exam results | ✅ Done | `exams.ts:fetchExamResults()`, displayed in ExamsPage | ✅ Critical |
| Exams setup | ⚠️ Partial | `ExamsSetup.tsx` — local state only, no DB persistence | ⚠️ Nice-to-have |
| Report cards | ❌ Not Started | Mentioned in ExamsSetup template selector, no implementation | ⚠️ Nice-to-have |

### 2.8 Fee Management

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Fee categories CRUD | ✅ Done | `FeeTypes.tsx`, `finance.ts` and `feeService.ts` (duplicated!) | ✅ Critical |
| Fee structures (grade/term) | ✅ Done | `FeeStructure.tsx`, `finance.ts:getFeeStructures()` | ✅ Critical |
| Student bills | ✅ Done | `StudentFees.tsx`, `finance.ts:getStudentBills()` | ✅ Critical |
| Assign fees (bulk) | ✅ Done | `AssignFees.tsx`, `feeService.ts:generateStudentBills()` | ✅ Critical |
| Record payments | ✅ Done | `RecordPayment.tsx`, `finance.ts:recordPayment()` | ✅ Critical |
| Fee summary/reports | ✅ Done | `finance.ts:getOutstandingFees()`, `getFeeReport()` | ✅ Critical |
| Finance dashboard page | ✅ Done | `FinancePage.tsx` — summary + invoice list | ✅ Critical |
| Finance setup | ⚠️ Partial | `FinanceSetup.tsx` — local state, not fully DB-connected | ⚠️ Nice-to-have |

### 2.9 Billing / Subscriptions (Platform-level)

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Payment calculation | ✅ Done | `billingService.ts:calculatePayment()` | ✅ Critical |
| Submit payment verification (with file upload) | ✅ Done | `billingService.ts:submitPaymentVerification()` | ✅ Critical |
| Admin: Process payment verification | ✅ Done | `billingService.ts:processPaymentVerification()` | ✅ Critical |
| Invoice generation | ✅ Done | `billingService.ts:createInvoice()` | ✅ Critical |
| Get school invoices | ✅ Done | `billingService.ts:getSchoolInvoices()` | ✅ Critical |
| Admin pricing management | ⚠️ Partial | `PricingPage.tsx` — read-only display of `feature_pricing` | ⚠️ Nice-to-have |
| Billing migration | ✅ Done | `20260112_billing_system.sql` | ✅ Critical |

### 2.10 Admin Portal (Super Admin)

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Admin Dashboard | ✅ Done | `AdminDashboard.tsx`, `schools.ts:fetchAdminStats()` | ✅ Critical |
| Schools List | ✅ Done | `SchoolsPage.tsx`, `schools.ts:fetchAllSchools()` | ✅ Critical |
| School state management | ✅ Done | `schools.ts:updateSchoolState()` | ✅ Critical |
| Features/catalog management | ✅ Done | `FeaturesPage.tsx`, `schools.ts:fetchFeatureCatalog()` | ✅ Critical |
| Activation Queue | ✅ Done | `ActivationQueuePage.tsx` | ✅ Critical |
| Promote to super admin | ✅ Done | `users.ts:promoteToSuperAdmin()` | ✅ Critical |
| Audit logs | ✅ Done | `schools.ts:fetchRecentAuditLogs()` | ✅ Critical |

### 2.11 Setup Wizard (Post-Onboarding)

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| 7-step wizard UI | ✅ Done | `pages/school/SetupWizard/` — Step1 through Step7 | ✅ Critical |
| School profile (Step 1) | ✅ Done | `Step1Profile.tsx` | ✅ Critical |
| Grades & Classes (Step 2) | ✅ Done | `Step2Grades.tsx` | ✅ Critical |
| Fee Types (Step 3) | ✅ Done | `Step3Fees.tsx` | ✅ Critical |
| Staff Types (Step 4) | ✅ Done | `Step4StaffTypes.tsx` | ✅ Critical |
| Staff Members (Step 5) | ✅ Done | `Step5Staff.tsx` | ✅ Critical |
| Pupils (Step 6) | ✅ Done | `Step6Pupils.tsx` | ✅ Critical |
| Review & Submit (Step 7) | ⚠️ **BROKEN** | `Step7Review.tsx` renders data, but `index.tsx:45` has `console.log("Setup complete:", data)` with **`TODO: Save all setup data to database`** — **final save never executes** | 🔴 BLOCKER |
| Setup Hub (module config) | ✅ Done | `SetupHub.tsx` — links to per-module setup pages | ✅ Critical |
| Module setup pages (5 pages) | ⚠️ Partial | `FinanceSetup.tsx`, `ExamsSetup.tsx`, `AttendanceSetup.tsx`, `ParentPortalSetup.tsx`, `CommunicationSetup.tsx` — all save to local `setupStore` only, not persisted to DB | ⚠️ Nice-to-have |

### 2.12 Not Started Features

| Feature | Status | Required? |
|---|---|---|
| **Parent Portal** | ❌ Not Started (setup page exists, no portal) | ✅ Critical |
| **Communication (SMS/Email)** | ❌ Not Started (setup page exists, no messaging) | ✅ Critical |
| **Timetable** | ❌ Not Started | ⚠️ Nice-to-have |
| **Analytics Dashboard** | ❌ Not Started | ⚠️ Nice-to-have |
| **Report Cards** | ❌ Not Started | ⚠️ Nice-to-have |
| **Notifications System** | ❌ Not Started | ⚠️ Nice-to-have |
| **User Management (per school)** | ⚠️ Service Only | `users.ts:fetchSchoolUsers()` exists, no UI | ✅ Critical |

### 2.13 Landing Page & Marketing

| Feature | Status | Evidence | Required? |
|---|---|---|---|
| Landing page (Hero + Features) | ✅ Done | `Index.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `Footer.tsx` | ✅ Critical |
| Landing stats (live from DB) | ✅ Done | `schools.ts:fetchLandingStats()` | ⚠️ Nice-to-have |

---

## 3. Overengineering Findings

### 3.1 🔴 FeatureGuardService — Unused Singleton Class

**Files:** `src/lib/services/featureGuardService.ts` (232 lines)

**Problem:** Full singleton class pattern (`FeatureGuardService.getInstance()`) with methods like `checkFeatureAccess()`, `checkSystemAccess()`, `hasTrialAccess()`. This is **never imported by any component, page, or hook**. The actual feature gating is handled by `useFeatureAccess.ts` hook + `FeatureGate.tsx` component, which read from the Zustand store directly.

**Recommendation:** ❌ **DELETE** entirely. The hook-based approach (`useFeatureAccess`) is simpler and already working.

---

### 3.2 🟡 Dual Rate Limiting Systems

**Files:** `src/lib/services/rateLimit.ts` (174 lines) + `src/lib/services/users.ts` (inline `isDuplicate()`)

**Problem:** Two independent rate-limiting mechanisms:
1. `rateLimit.ts` — Full-featured system with configurable windows, Response helpers for Edge Functions, status tracking. **Only imported in `OnboardingPage.tsx`** for one check. The `RATE_LIMITS` configs, `createRateLimitResponse()`, `getClientIP()` are all unused.
2. `users.ts:isDuplicate()` — Simple inline dedup map used for `signUp`, `signIn`, `signInWithOtp`, `sendPasswordReset`, `onboardSchool`.

**Recommendation:** Keep the simpler `isDuplicate()` approach in `users.ts`. **Simplify `rateLimit.ts`** to just the parts OnboardingPage uses, or inline them. Remove the server-side helpers (`createRateLimitResponse`, `getClientIP`) — those belong in Edge Functions, not frontend code.

---

### 3.3 🔴 Triple Finance Service Duplication

**Files:**
- `src/lib/services/feeService.ts` (533 lines) — Full fee CRUD with categories, structures, bills, payments, reports
- `src/lib/services/finance.ts` (433 lines) — **Nearly identical** fee CRUD + invoices + reports
- `src/lib/services/billingService.ts` (308 lines) — Platform billing (onboarding fees, module subscriptions)

**Problem:** `feeService.ts` and `finance.ts` both implement:
- `getFeeCategories()` / `createFeeCategory()` / etc.
- `getFeeStructures()` / `createFeeStructure()` / etc.
- `getStudentBills()` / `createStudentBill()` / etc.
- `getPayments()` / `createPayment()` / etc.

The Fees pages (`pages/school/Fees/*`) import from `finance.ts`. The `FinancePage.tsx` dashboard also imports from `finance.ts`. **`feeService.ts` is never imported by any page.** Meanwhile, `billingService.ts` handles a different concern (platform billing) but confusingly lives alongside fee services.

**Recommendation:**
1. ❌ **DELETE `feeService.ts`** entirely — it's the unused duplicate.
2. ✅ Keep `finance.ts` as the canonical fee/payment service.
3. ✅ Keep `billingService.ts` — but rename to make the domain boundary clear (e.g., `platformBillingService.ts`).

---

### 3.4 🟡 Duplicate Student Services

**Files:**
- `src/lib/services/studentService.ts` (262 lines) — Full CRUD with `Student` interface (first_name/last_name split), Guardian CRUD, CSV import, search
- `src/lib/services/students.ts` (67 lines) — Simpler CRUD with `Student` from types (full_name single field)

**Problem:** Two competing student service files with **different data models**:
- `studentService.ts` uses `first_name` + `last_name` (not matching the DB `full_name` column)
- `students.ts` uses `full_name` (matching the actual DB schema)

The student pages (`pages/school/Students/*`) appear to import from `studentService.ts` and work with split names. The dashboard `StudentsPage.tsx` imports from `students.ts`.

**Recommendation:**
1. **Consolidate** into one service aligned with the actual DB schema (`full_name`).
2. **DELETE** the weaker duplicate (`students.ts` or `studentService.ts`) once reconciled.

---

### 3.5 🟡 Dual Toast Systems

**Files:**
- `src/hooks/use-toast.ts` (full toast state management, 105 lines)
- `src/components/ui/use-toast.ts` (re-export: `export { useToast, toast } from "@/hooks/use-toast"`)
- `sonner` library also installed and `<Sonner />` rendered in App.tsx
- `<Toaster />` (shadcn toast) also rendered in App.tsx

**Problem:** Both shadcn's `Toaster` AND `Sonner` are mounted simultaneously. Some components may use `toast()` from the hook, others may use `sonner`'s `toast()`.

**Recommendation:** Pick **one** toast system (Sonner is simpler). Remove the other.

---

### 3.6 🟡 Setup Wizard: Hook + Store + Service Triple Layer

**Files:**
- `src/hooks/useSetupWizard.ts` — Local React state for wizard data (168 lines)
- `src/store/setupStore.ts` — Zustand store for module setup (61 lines)  
- `src/lib/services/schoolSetupService.ts` — Supabase CRUD for setup data (416 lines)

**Problem:** Three layers for setup data management. The wizard hook manages all step data in local state. The setup store manages module-level config. The service has DB operations. They're **not connected** — the wizard's `completeSetup()` triggers a `console.log` TODO, never calling the service's `saveCompleteSetup()`.

**Recommendation:** Wire `saveCompleteSetup()` into the wizard's final step. Consider whether both the hook and store are needed — consolidate.

---

## 4. Hacks & Dead Code

### 4.1 Dead Files

| File | Issue | Action |
|---|---|---|
| `src/pages/Login.tsx` | Old login page, replaced by `src/pages/auth/LoginPage.tsx`. Still imported in App.tsx route but `LoginPage` is the real one used. **Not routed to.** | ❌ **DELETE** |
| `src/lib/services/featureGuardService.ts` | Never imported anywhere. Fully replaced by `useFeatureAccess` hook. | ❌ **DELETE** |
| `src/lib/services/feeService.ts` | 533-line duplicate of `finance.ts`. Never imported by any page. | ❌ **DELETE** |
| `src/test/example.test.ts` | Placeholder test (143 bytes). Provides zero value. | ❌ **DELETE** or replace with real tests |

### 4.2 Console.log Statements in Production Code

| File | Line | Content | Action |
|---|---|---|---|
| `billingService.ts` | L264 | `console.log(\`Payment verified for school ${verification.school_id}\`)` | Replace with proper audit log or remove |
| `emailService.ts` | L34 | `console.log('Email already confirmed:', email)` | Remove or use structured logging |
| `SetupWizard/index.tsx` | L45 | `console.log("Setup complete:", data)` | Wire to `saveCompleteSetup()` |
| `NotFound.tsx` | L8 | `console.error("404 Error: ...")` | Acceptable for debugging, but consider analytics |

### 4.3 Open TODOs

| File | Line | TODO | Priority |
|---|---|---|---|
| `SetupWizard/index.tsx` | L44 | `TODO: Save all setup data to database` | 🔴 **BLOCKER** — setup wizard is non-functional |
| `billingService.ts` | L263 | `TODO: implement email service` | 🟡 Medium — needs email integration for payment notifications |

### 4.4 `as any` / Loose Typing

| Pattern | Count | Key Files |
|---|---|---|
| `as any` type assertion | 13 instances | `users.ts` (supabase RPC calls), `studentService.ts` (guardian ops), `feeService.ts` (data mapping) |
| `: any` in parameters/returns | 42+ instances | `schoolSetupService.ts` (SetupData interface), all SetupWizard steps, fee/student forms |
| `(supabase as any)` | 5 instances | `users.ts`, `ActivationPage.tsx` — used to bypass TypeScript on untyped RPCs |

**Root Cause:** The Supabase client is not generated from the DB schema (no `supabase gen types`), so custom RPCs and some table operations lack type safety.

**Recommendation:** Run `supabase gen types typescript` to generate proper types, replacing the manual `types.ts`.

### 4.5 Dual Lock Files

| File | Size |
|---|---|
| `bun.lock` | 160 KB |
| `bun.lockb` | 245 KB |
| `package-lock.json` | 283 KB |

**Problem:** Three lock files from different package managers (bun and npm).

**Recommendation:** Pick one package manager. Delete the others' lock files.

---

## 5. Unnecessary Features

### 5.1 Unused shadcn/ui Components

These UI components are installed but **never imported** outside their own definition file:

| Component | File | Radix Dependency |
|---|---|---|
| Context Menu | `ui/context-menu.tsx` | `@radix-ui/react-context-menu` |
| Menubar | `ui/menubar.tsx` | `@radix-ui/react-menubar` |
| Hover Card | `ui/hover-card.tsx` | `@radix-ui/react-hover-card` |
| Resizable | `ui/resizable.tsx` | `react-resizable-panels` |
| Carousel | `ui/carousel.tsx` | `embla-carousel-react` |
| Navigation Menu | `ui/navigation-menu.tsx` | `@radix-ui/react-navigation-menu` |
| Input OTP | `ui/input-otp.tsx` | `input-otp` |
| Aspect Ratio | `ui/aspect-ratio.tsx` | `@radix-ui/react-aspect-ratio` |

**Recommendation:** ❌ Delete unused component files AND their corresponding Radix/npm dependencies from `package.json`. This will reduce bundle size and dependency count significantly.

**Removable npm dependencies:**
- `@radix-ui/react-context-menu`
- `@radix-ui/react-menubar`
- `@radix-ui/react-hover-card`
- `@radix-ui/react-navigation-menu`
- `@radix-ui/react-aspect-ratio`
- `react-resizable-panels`
- `embla-carousel-react`
- `input-otp`

### 5.2 Landing Page Stats (Live from DB)

**File:** `schools.ts:fetchLandingStats()`

**Problem:** Makes unauthenticated Supabase queries for school/student counts on the public landing page. This is a security/privacy concern (exposes aggregate data) and adds unnecessary DB load.

**Recommendation:** Replace with hardcoded marketing numbers or use a cached edge function.

### 5.3 `recharts` Library

**Status:** Installed in `package.json` and `chart.tsx` component exists, but actual chart rendering in the app is minimal (only `AttendanceWidget.tsx` and `DashboardOverview.tsx` appear to reference charting).

**Recommendation:** Keep for now — charts will be needed for analytics. But verify it's being tree-shaken properly.

---

## 6. Cleanup Action Plan (Prioritized)

### Priority 1: 🔴 CRITICAL — Fix Before Any Deployment

| # | Action | Files | Effort |
|---|---|---|---|
| 1 | **Wire Setup Wizard final save** — connect `saveCompleteSetup()` to Step 7 completion | `SetupWizard/index.tsx`, `schoolSetupService.ts` | 1 hour |
| 2 | **Delete `feeService.ts`** — unused duplicate of `finance.ts` | `src/lib/services/feeService.ts` | 5 min |
| 3 | **Delete `featureGuardService.ts`** — unused, replaced by hook | `src/lib/services/featureGuardService.ts` | 5 min |
| 4 | **Delete `Login.tsx`** — dead old login page | `src/pages/Login.tsx` | 5 min |
| 5 | **Remove all `console.log`** from production services | `billingService.ts`, `emailService.ts`, `SetupWizard/index.tsx` | 15 min |

### Priority 2: 🟡 HIGH — Reduce Technical Debt

| # | Action | Files | Effort |
|---|---|---|---|
| 6 | **Consolidate student services** — merge `students.ts` + `studentService.ts` into one aligned with DB schema | `students.ts`, `studentService.ts`, all student pages | 2 hours |
| 7 | **Remove unused shadcn components** — delete 8 unused UI components + deps | `components/ui/`, `package.json` | 30 min |
| 8 | **Pick one toast system** — remove Sonner or shadcn Toaster | `App.tsx`, various components | 1 hour |
| 9 | **Simplify rate limiting** — remove server-side helpers from frontend `rateLimit.ts` | `rateLimit.ts` | 30 min |
| 10 | **Fix `as any` casts** — generate proper Supabase types with `supabase gen types` | `types.ts`, all services | 2 hours |
| 11 | **Remove duplicate lock files** — pick bun or npm, delete the other | Root directory | 5 min |
| 12 | **Rename `billingService.ts`** to `platformBillingService.ts` for clarity | `billingService.ts` | 15 min |

### Priority 3: 🟢 NICE-TO-HAVE — Improve Quality

| # | Action | Files | Effort |
|---|---|---|---|
| 13 | **Add proper error boundaries** — React error boundary for each route section | New component | 1 hour |
| 14 | **Replace `any` types in SetupWizard** — properly type all step data | `SetupWizard/*.tsx`, `schoolSetupService.ts` | 2 hours |
| 15 | **Connect module setup pages to DB** — currently save to Zustand only | `setup/*.tsx`, `setupStore.ts` | 4 hours |
| 16 | **Add unit tests** — at minimum for services and hooks | `src/test/` | 8+ hours |
| 17 | **Consolidate audit report files** — 5 markdown files in root | Root `.md` files | 15 min |
| 18 | **Remove `dist/` from repo** — should be in `.gitignore` | Root `dist/`, `.gitignore` | 5 min |

---

## 7. Remaining Work Roadmap (MVP)

### Tier 1: Must-Have for MVP (Priority Order)

| # | Feature | Estimated Effort | Dependencies | Status |
|---|---|---|---|---|
| 1 | **Fix Setup Wizard Save** | 1 day | `schoolSetupService.ts` exists | 🔴 Blocker |
| 2 | **Exam Management UI** — Create/edit exams, enter results, basic report cards | 3–4 days | `exams.ts` service exists, needs UI for CRUD | ⚠️ Service-only |
| 3 | **Parent Portal** — Parent login, view child's attendance/grades/fees | 5–7 days | Needs new pages, `parent_links` table exists in schema | ❌ Not started |
| 4 | **Communication** — Bulk SMS/email, announcements, templates | 5–7 days | Needs SMS provider integration (e.g., Twilio/Africa's Talking) | ❌ Not started |
| 5 | **User Management UI** — Add/edit/deactivate school users, assign roles | 2–3 days | `users.ts:fetchSchoolUsers()` exists, needs CRUD UI | ⚠️ Service-only |
| 6 | **Student Import UI** — CSV upload with preview/validation | 1–2 days | `studentService.ts:importStudents()` exists | ⚠️ Service-only |
| 7 | **Settings Page** — School profile editing, academic year config, terms setup | 2–3 days | `SettingsPage.tsx` exists but is a placeholder | ⚠️ Placeholder |

### Tier 2: Important but Not Blocking

| # | Feature | Estimated Effort | Dependencies |
|---|---|---|---|
| 8 | **Timetable** — Weekly class schedules | 4–5 days | Needs new DB tables (`timetable_slots`), teacher/class associations |
| 9 | **Analytics Dashboard** — Charts for attendance trends, fee collection, enrollment | 3–4 days | Data queries exist across services, needs aggregation + visualization |
| 10 | **Notification System** — In-app notifications, email alerts | 3–4 days | Needs notification table, real-time subscriptions |

### Tier 3: Nice-to-Have (Post-MVP)

| # | Feature | Estimated Effort |
|---|---|---|
| 11 | **Report Cards PDF generation** | 3–4 days |
| 12 | **Mobile app wrapper** (PWA or React Native) | 5–10 days |
| 13 | **Multi-language support** (i18n) | 3–5 days |
| 14 | **Advanced analytics** (predictive, AI) | 5–10 days |

### Total Estimated MVP Remaining Work: **~25–35 days**

---

## 8. Extra Checks

### 8.1 Multi-Tenant Isolation

| Check | Result |
|---|---|
| Student queries include `school_id` | ✅ All services filter by `schoolId` parameter |
| Attendance queries include `school_id` | ✅ `attendance.ts` — all functions take `schoolId` |
| Finance queries include `school_id` | ✅ `finance.ts` — all functions take `schoolId` |
| Staff queries include `school_id` | ✅ `staffService.ts` — all functions take `schoolId` |
| RLS policies exist | ✅ `20240003_rls_policies.sql` + `20240008_standardize_rls.sql` |
| `getStudent()` missing school_id check | ⚠️ **`studentService.ts:getStudent(id)`** fetches by `id` only — no `school_id` filter. Relies on RLS but violates defense-in-depth. |
| `getStaffMember(id)` missing school_id check | ⚠️ Same issue — fetches by `id` only. |

**Recommendation:** Add `school_id` checks to all single-record fetch functions as defense-in-depth alongside RLS.

### 8.2 Security

| Check | Result |
|---|---|
| `.env.local` in `.gitignore` | ✅ Yes |
| Hardcoded secrets in source | ✅ None found |
| Supabase keys in `.env.example` | ✅ Placeholder values only |
| Input validation on forms | ⚠️ **Inconsistent** — OnboardingPage uses `rateLimit`, but most forms have no client-side validation beyond HTML `required` attributes. No Zod schemas used despite `zod` being installed. |
| SQL injection risk | ✅ Low — all queries use Supabase client (parameterized) |
| XSS risk | ✅ Low — React's JSX escaping handles this |

### 8.3 Performance

| Check | Result |
|---|---|
| Lazy loading routes | ❌ **Not implemented** — all pages are eagerly imported in `App.tsx` |
| Large bundle risk | ⚠️ `recharts` + 49 shadcn components + all services imported upfront |
| Missing DB indexes | ⚠️ Cannot verify from frontend, but `attendance(student_id, date)` UNIQUE constraint doubles as an index |
| N+1 query risk | ⚠️ `studentService.ts:importStudents()` inserts one-by-one in a loop |
| Unnecessary re-renders | ⚠️ `useAuth` hook updates multiple store fields in sequence — could cause cascading re-renders |

**Recommendation:** Implement `React.lazy()` for route-level code splitting. This is low-effort, high-impact.

### 8.4 Accessibility

| Check | Result |
|---|---|
| Form labels | ⚠️ Some forms use `<Label>` properly, others don't |
| ARIA attributes on interactive elements | ⚠️ `FeatureGate.tsx` has proper `aria-disabled`, `aria-label` — most other custom components lack ARIA |
| Keyboard navigation | ⚠️ shadcn components handle this well, but custom elements (e.g., dashboard cards) are not keyboard-accessible |
| Focus management | ⚠️ No focus trap management on modal dialogs beyond what shadcn provides |
| Color contrast | ⚠️ Not verified — depends on theme configuration |

---

## 9. Conclusion & Recommendations

### What's Working Well
- **Auth system is solid** — JWT-based with RPC onboarding, multi-tenant subdomain resolution, and feature flags.
- **Feature gating is well-designed** — `useFeatureAccess` hook + `FeatureGate` component is clean and composable.
- **Database schema is comprehensive** — 12 migrations covering platform foundation, academic schema, RLS, RBAC, billing.
- **Student and Staff CRUD are complete** — Full add/edit/view/delete with proper pages.
- **Attendance module is the most mature** — Marking, reporting, and dashboard integration all work.
- **Fee management service layer is thorough** — Just needs deduplication.
- **Admin portal is functional** — Dashboard, school management, feature control, activation queue.

### Immediate Action Items (This Week)
1. 🔴 **Fix Setup Wizard save** — this blocks all new school setup.
2. 🔴 **Delete the 4 dead files** — `featureGuardService.ts`, `feeService.ts`, `Login.tsx`, `example.test.ts`.
3. 🔴 **Remove console.log** from production services.
4. 🟡 **Consolidate student services** — one source of truth.
5. 🟡 **Prune unused UI components + npm deps** — reduce attack surface and bundle size.

### Architecture Notes for Future Development
- **Use `React.lazy()`** for all page-level imports in `App.tsx`.
- **Use `zod`** for form validation — it's already installed but unused.
- **Generate Supabase types** — eliminates `as any` casts and improves type safety.
- **Pick one toast library** — dual rendering wastes DOM and is confusing for developers.
- **Add integration tests** — at minimum for auth flow and CRUD operations.
- **Consider teachers/staff unification** — having separate `teachers` and `staff` tables with no link creates confusion. Design decision needed.

---

*End of Audit Report*
