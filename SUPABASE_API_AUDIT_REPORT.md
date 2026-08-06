# Supabase API Call Types Audit Report

**Date:** 2026-08-02
**Project:** School Pulse Zambia
**Purpose:** Comprehensive audit of all Supabase workflows and API call types

---

## Executive Summary

This audit identifies **13 main service files** and **20+ edge function endpoints** that make API calls to Supabase. The application uses a mix of:
- **Direct table operations** (SELECT, INSERT, UPDATE, DELETE)
- **RPC (Remote Procedure Calls)** for complex business logic
- **Edge Functions** for server-side operations
- **Storage operations** for file uploads
- **Auth operations** for authentication

---

## 1. Service Files Analysis

### 1.1 Student Service (`src/lib/services/studentService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Students with classes/grades relationships
- ✅ **INSERT** - Create students, guardians, student_guardians links
- ✅ **UPDATE** - Update student/guardian records
- ✅ **DELETE (soft)** - Mark students as inactive
- ✅ **Storage Upload** - Student photos to `student-images` bucket
- ✅ **Complex queries** - Search with OR conditions, pagination with range

**Tables Accessed:**
- `students`
- `guardians`
- `student_guardians`
- `student_transfers`
- `student_import_logs`
- Storage: `student-images`

**RPC Calls:**
- None

**Potential Issues:**
- ⚠️ Uses `supabase as any` cast extensively (bypasses TypeScript checking)
- ⚠️ No RPC calls for complex operations (transfers, imports done in application layer)

---

### 1.2 Staff Service (`src/lib/services/staffService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Staff profiles with user accounts, teacher workload
- ✅ **INSERT** - Staff profiles, teacher assignments, invitations
- ✅ **UPDATE** - Staff profiles, assignments, invitations
- ✅ **DELETE** - Hard delete staff profiles and assignments
- ✅ **Complex queries** - Available teachers with exclusion logic

**Tables Accessed:**
- `staff_profiles`
- `teacher_assignments`
- `staff_invitations`
- `school_teacher_settings`
- `teacher_progression`

**RPC Calls:**
- `generate_teacher_invitation_token`
- `validate_teacher_invitation_token`
- `accept_teacher_invitation`
- `get_teacher_invitation_stats`
- `get_pending_teachers`
- `create_teacher_assignment`
- `get_teacher_assigned_students`
- `get_teacher_workload`

**Potential Issues:**
- ⚠️ Heavy reliance on RPC functions (8 total)
- ⚠️ RPC functions may not have TypeScript types (uses `as any`)

---

### 1.3 Attendance Service (`src/lib/services/attendanceService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Attendance records with sessions/classes
- ✅ **INSERT** - Attendance sessions, records
- ✅ **UPDATE** - Attendance sessions, records
- ✅ **DELETE** - Attendance sessions
- ✅ **Bulk INSERT** - Bulk create attendance records
- ✅ **Complex filters** - Date ranges, class/teacher filters

**Tables Accessed:**
- `attendance_settings`
- `attendance_sessions`
- `attendance_records`
- `attendance_summary`

**RPC Calls:**
- `get_class_attendance`
- `get_class_attendance_stats`
- `get_student_attendance_summary`

**Potential Issues:**
- ⚠️ RPC calls for statistics (could be views instead)
- ✅ Good use of bulk operations for attendance records

---

### 1.4 Exam Service (`src/lib/services/examService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Exams with subjects, classes, teachers
- ✅ **INSERT** - Exams, exam subjects, student results
- ✅ **UPDATE** - Exams, subjects, results
- ✅ **DELETE** - Exams, subjects
- ✅ **Bulk INSERT** - Bulk create student results
- ✅ **UPSERT** - Student exam results with conflict resolution

**Tables Accessed:**
- `grading_systems`
- `grade_rules`
- `exams`
- `exam_subjects`
- `student_results`
- `student_exam_results`
- `report_cards`

**RPC Calls:**
- `calculate_grade`
- `calculate_class_positions`

**Potential Issues:**
- ⚠️ Complex calculation logic in application layer (`calculateExamResults`)
- ⚠️ Multiple sequential queries for calculations (could be optimized)

---

### 1.5 Billing Service (`src/lib/services/billingService.ts`)
**API Call Types:**
- ✅ **SELECT** - Payment verifications, invoices
- ✅ **INSERT** - Invoices, payment verifications
- ✅ **UPDATE** - Payment verifications, school billing status
- ✅ **Storage Upload** - Payment proof files
- ✅ **UPSERT** - School feature flags
- ✅ **Complex transactions** - Multiple operations in `processPaymentVerification`

**Tables Accessed:**
- `invoices`
- `payment_verifications`
- `schools`
- `school_feature_flags`
- `feature_access_logs`

**RPC Calls:**
- None

**Potential Issues:**
- ⚠️ No RPC for payment processing (done in application layer)
- ⚠️ Complex multi-table updates without transaction wrapper
- ⚠️ Comment says "TODO: implement email service" (line 264)

---

### 1.6 Admin Service (`src/lib/services/adminService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Users from `profiles_view`, payments from `payments_simple`
- ✅ **INSERT** - Platform admins, subscription plans
- ✅ **UPDATE** - Schools, users, subscription plans
- ✅ **DELETE** - Schools, users, subscription plans
- ✅ **Complex queries** - System logs with filters

**Tables Accessed:**
- `schools`
- `profiles`
- `school_members`
- `profiles_view` (VIEW)
- `payments_simple` (VIEW)
- `audit_logs`
- `blocked_users_log`
- `roles`
- `subscription_plans`

**RPC Calls:**
- `create_school_with_admin`
- `create_platform_admin`
- `delete_user`
- `approve_payment`
- `reject_payment`
- `get_system_health`

**Potential Issues:**
- ⚠️ Uses `profiles_view` and `payments_simple` views (good for avoiding JOIN issues)
- ⚠️ RPC calls for critical operations (school creation, payment approval)

---

### 1.7 Academic Service (`src/lib/services/academicService.ts`)
**API Call Types:**
- ✅ **SELECT** - Academic years, terms, grades, classes, subjects
- ✅ **SELECT with JOINs** - Class subjects with subjects/profiles
- ✅ **INSERT** - Academic years, terms, grades, classes, subjects, class subjects
- ✅ **UPDATE** - All academic entities
- ✅ **DELETE (soft)** - Grades, classes, subjects, class subjects
- ✅ **Bulk operations** - Bulk import grades/subjects

**Tables Accessed:**
- `academic_years`
- `terms`
- `grades`
- `classes`
- `subjects`
- `class_subjects`

**RPC Calls:**
- None

**Potential Issues:**
- ✅ Well-structured CRUD operations
- ✅ Good use of soft deletes

---

### 1.8 Finance Service (`src/lib/services/financeService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Invoices with student details
- ✅ **INSERT** - Fee structures, invoices, payments, allocations, audit logs
- ✅ **UPDATE** - All financial entities
- ✅ **DELETE (soft)** - Fee structures (archived)
- ✅ **Bulk INSERT** - Payment allocations
- ✅ **Complex queries** - Financial transactions with filters

**Tables Accessed:**
- `school_fee_structures`
- `student_invoices`
- `student_payments`
- `payment_allocations`
- `financial_transactions`
- `approval_workflows`
- `notifications`
- `audit_logs`

**RPC Calls:**
- `approve_student_payment`
- `reject_student_payment`
- `get_financial_summary`
- `create_audit_log`
- `generate_invoice_number`
- `get_payment_report`
- `get_invoice_report`

**Potential Issues:**
- ⚠️ Heavy use of RPC for financial operations (7 RPC calls)
- ⚠️ Complex approval workflows

---

### 1.9 KYC Service (`src/lib/services/kycService.ts`)
**API Call Types:**
- ✅ **SELECT with complex JOINs** - KYC submissions with nested profiles
- ✅ **INSERT** - KYC sections, verification logs, setup fee requests
- ✅ **UPDATE** - Schools KYC status, section verification
- ✅ **Storage operations** - Document uploads
- ✅ **Parallel queries** - Multiple section fetches in parallel

**Tables Accessed:**
- `schools`
- `kyc_sections`
- `school_registrations`
- `business_registrations`
- `school_ownership`
- `school_heads`
- `school_addresses`
- `school_statistics`
- `school_facilities`
- `kyc_verification_log`
- `setup_fee_requests`
- Storage: `kyc-documents`

**RPC Calls:**
- `get_kyc_status`
- `get_kyc_progress`
- `check_kyc_required`

**Potential Issues:**
- ⚠️ Complex nested JOINs in `getSubmissions` (could cause 406 errors)
- ⚠️ Multiple parallel queries for KYC details (N+1 problem)

---

### 1.10 Subscription Service (`src/lib/services/subscriptionService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Subscriptions with school names
- ✅ **INSERT** - Payments, subscription alerts
- ✅ **UPDATE** - Subscriptions, alerts, feature flags
- ✅ **UPSERT** - Tenant subscriptions
- ✅ **Complex queries** - Subscription stats

**Tables Accessed:**
- `subscription_plans`
- `features`
- `school_subscriptions`
- `school_modules`
- `school_payments`
- `subscription_alerts`

**RPC Calls:**
- `check_tenant_feature_access`
- `enable_tenant_feature`
- `disable_tenant_feature`
- `approve_subscription_payment`
- `reject_subscription_payment`
- `get_subscription_stats`

**Potential Issues:**
- ⚠️ Heavy RPC usage (6 calls)
- ⚠️ Feature access checks on every request

---

### 1.11 Parent Service (`src/lib/services/parentService.ts`)
**API Call Types:**
- ✅ **SELECT with JOINs** - Students with classes/grades/guardians
- ✅ **INSERT** - Parent profiles, guardian links, notifications, invitations
- ✅ **UPDATE** - Parent profiles, notification preferences
- ✅ **DELETE** - Unlink children
- ✅ **Complex queries** - Announcements with filters, notifications with pagination

**Tables Accessed:**
- `parent_profiles`
- `students`
- `student_guardians`
- `guardians`
- `attendance_records`
- `student_exam_results`
- `student_results`
- `student_bills`
- `announcements`
- `announcement_reads`
- `notifications`
- `notification_templates`
- `parent_invitations`

**RPC Calls:**
- `get_parent_children`
- `get_parent_attendance_summary`
- `get_parent_fee_summary`
- `get_parent_latest_results`
- `get_parent_unread_count`
- `generate_invitation_token`

**Potential Issues:**
- ⚠️ Multiple RPC calls for dashboard data (6 calls)
- ⚠️ Dashboard makes 3 sequential RPC calls per child (N+1 problem)

---

### 1.12 Analytics Service (`src/lib/services/analyticsService.ts`)
**API Call Types:**
- ✅ **SELECT from VIEWs** - Enrollment summary, attendance summary, academic performance, finance summary
- ✅ **INSERT** - Reports, dashboard widgets, alerts
- ✅ **UPDATE** - Alerts (acknowledge, resolve, dismiss)
- ✅ **DELETE** - Reports, widgets
- ✅ **Complex queries** - Alerts with multiple filters

**Tables Accessed:**
- `student_enrollment_summary` (VIEW)
- `attendance_summary_view` (VIEW)
- `academic_performance_summary` (VIEW)
- `finance_summary_view` (VIEW)
- `staff_workload_summary` (VIEW)
- `analytics_alerts`
- `reports`
- `dashboard_widgets`

**RPC Calls:**
- `get_school_analytics_overview`
- `get_attendance_analytics`
- `get_academic_analytics`
- `get_finance_analytics`
- `detect_attendance_alerts`
- `detect_finance_alerts`
- `detect_academic_alerts`

**Potential Issues:**
- ⚠️ Heavy RPC usage for analytics (7 calls)
- ✅ Good use of materialized views for summaries

---

### 1.13 Email Service (`src/lib/services/emailService.ts`)
**API Call Types:**
- ✅ **Auth operations** - Resend confirmation, check email status, reset password
- ✅ **Edge Function invocation** - Send teacher/parent invitation emails
- ✅ **LocalStorage** - Cooldown tracking (client-side only)

**Tables Accessed:**
- None (uses Auth API and Edge Functions)

**RPC Calls:**
- None

**Edge Functions Called:**
- `send-email` (for teacher invitations)
- `send-email` (for parent invitations)

**Potential Issues:**
- ⚠️ Uses `supabase.auth.admin.getUserById` from client-side (security issue!)
- ⚠️ Edge function name is generic (`send-email`)

---

## 2. Edge Functions Analysis

### 2.1 Students Edge Function (`supabase/functions/students/index.ts`)
**Endpoint:** `/functions/v1/students`
**Methods:** GET, POST
**Authentication:** Requires `students` module

**Operations:**
- GET: List students with pagination and search
- POST: Create student with enrollment and event emission

**Events Emitted:**
- `student.enrolled` - When student is enrolled in a class

**Database Operations:**
- `students` table (SELECT, INSERT)
- `student_enrollments` table (INSERT)

**Potential Issues:**
- ✅ Good event-driven architecture
- ⚠️ Search only by `full_name` (not admission_number like in service)

---

### 2.2 Other Edge Functions (from directory structure)
**Identified Edge Function Categories:**
- `academic/terms/` - Term management
- `academic/years/` - Academic year management
- `analytics/dashboard/` - Dashboard data aggregation
- `attendance/sessions/` - Attendance session management
- `exams/marks/` - Exam marks entry
- `features/` - Feature management
- `finance/payments/` - Payment processing
- `otp-rate-limit/` - Rate limiting for OTP
- `parents/children/` - Parent-child linking
- `payments/approve/` - Payment approval workflow
- `schools/features/` - School feature management
- `staff/assignments/` - Teacher assignments
- `_events/process/` - Event processing (billing automation)

**Potential Issues:**
- ⚠️ Many edge functions not examined in detail
- ⚠️ Event-driven architecture may have consistency issues

---

## 3. API Call Types Summary

### 3.1 By Operation Type

| Operation Type | Count | Services Using |
|---------------|-------|----------------|
| **SELECT** | 13 | All services |
| **SELECT with JOINs** | 13 | All services |
| **INSERT** | 13 | All services |
| **UPDATE** | 12 | All except email |
| **DELETE** | 8 | student, staff, attendance, exam, admin, academic, finance, analytics |
| **UPSERT** | 3 | exam, billing, subscription |
| **Bulk INSERT** | 3 | attendance, exam, finance |
| **Storage Upload** | 3 | student, billing, kyc |
| **RPC Calls** | 30+ | staff, attendance, exam, admin, finance, kyc, subscription, parent, analytics |
| **Edge Functions** | 2+ | email (send-email) |
| **Auth Operations** | 1 | email |

### 3.2 By Database Table

| Table/View | Services | Operation Types |
|-----------|----------|-----------------|
| `students` | student, parent, analytics | SELECT, INSERT, UPDATE |
| `staff_profiles` | staff, analytics | SELECT, INSERT, UPDATE, DELETE |
| `attendance_*` | attendance, parent, analytics | SELECT, INSERT, UPDATE, DELETE |
| `exams` | exam, analytics | SELECT, INSERT, UPDATE, DELETE |
| `student_results` | exam, parent | SELECT, INSERT, UPDATE |
| `schools` | admin, billing, kyc, subscription | SELECT, INSERT, UPDATE |
| `profiles` | admin, parent | SELECT, UPDATE |
| `notifications` | finance, parent | SELECT, INSERT, UPDATE |
| `invoices` | billing, finance | SELECT, INSERT, UPDATE |
| `payments` | billing, subscription, finance | SELECT, INSERT, UPDATE |

---

## 4. Critical Issues Found

### 4.1 Security Issues

#### 🔴 CRITICAL: Client-side Admin Auth Call
**File:** `src/lib/services/emailService.ts` (line 71)
```typescript
const { data, error } = await supabase.auth.admin.getUserById(userId);
```
**Issue:** Using `auth.admin` methods from client-side code
**Risk:** Exposes admin privileges to client
**Fix:** Move to edge function or backend service

---

### 4.2 Performance Issues

#### 🟡 MEDIUM: N+1 Query Problem
**Files:** Multiple services
**Examples:**
- `parentService.ts` - Dashboard makes 3 RPC calls per child
- `kycService.ts` - Parallel queries for each KYC section
- `examService.ts` - Sequential queries in `calculateExamResults`

**Impact:** Slow dashboard loads, poor scalability
**Fix:** Use RPC functions or batch queries

#### 🟡 MEDIUM: Missing Database Indexes
**Issue:** No evidence of composite indexes on frequently queried columns
**Examples:**
- `school_id + status + created_at` (used in many queries)
- `student_id + date` (attendance records)
- `school_id + exam_id + student_id` (exam results)

**Impact:** Slow query performance as data grows
**Fix:** Add composite indexes in migration

---

### 4.3 Type Safety Issues

#### 🟡 MEDIUM: Extensive `any` Type Casting
**Files:** All services
**Examples:**
```typescript
const db = supabase as any;
const { data, error } = await (supabase as any).rpc("function_name");
```

**Issue:** Bypasses TypeScript type checking
**Risk:** Runtime errors, poor IDE support
**Fix:** Generate Supabase types properly or define interfaces

---

### 4.4 Error Handling Issues

#### 🟡 MEDIUM: Inconsistent Error Handling
**Examples:**
- Some functions throw errors: `if (error) throw error;`
- Some return null: `if (error) return null;`
- Some log and continue: `console.error("Error:", error);`

**Impact:** Hard to debug, inconsistent UX
**Fix:** Standardize error handling strategy

#### 🟡 MEDIUM: Silent Failures
**File:** `emailService.ts` (multiple locations)
```typescript
} catch (error) {
  console.error('Failed to send email:', error);
  // Don't throw - allow to proceed
}
```

**Issue:** Critical operations fail silently
**Risk:** Users don't know emails failed
**Fix:** Show user-facing error messages

---

### 4.5 Data Consistency Issues

#### 🟡 MEDIUM: No Transaction Wrappers
**File:** `billingService.ts` (lines 215-265)
```typescript
// Multiple operations without transaction
await supabase.from("school_feature_flags").upsert(...);
await supabase.from("schools").update(...);
await supabase.from("invoices").insert(...);
await supabase.from("feature_access_logs").insert(...);
```

**Issue:** Partial failures leave data inconsistent
**Risk:** School activated but invoice not created
**Fix:** Use Supabase transactions or RPC

#### 🟡 MEDIUM: Race Conditions
**File:** `studentService.ts` (line 104)
```typescript
admission_number: `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
```

**Issue:** Random admission number generation can collide
**Risk:** Duplicate admission numbers
**Fix:** Use database sequence or unique constraint with retry

---

## 5. Missing API Call Types

### 5.1 No Batch Operations
**Issue:** Most services insert/update one record at a time
**Example:** `academicService.ts` bulk import loops through items
**Fix:** Use Supabase batch operations or RPC

### 5.2 No Caching Strategy
**Issue:** Every page load hits database
**Examples:**
- Dashboard analytics
- School settings
- Feature flags

**Fix:** Implement Redis caching or use Supabase cache headers

### 5.3 No WebSocket/Realtime
**Issue:** No real-time updates for:
- Live attendance tracking
- Real-time notifications
- Collaborative exam marking

**Fix:** Use Supabase Realtime subscriptions

---

## 6. Recommendations

### 6.1 Immediate Actions (High Priority)

1. **Fix client-side admin auth** (emailService.ts)
   - Move `auth.admin.getUserById` to edge function

2. **Add database indexes**
   ```sql
   CREATE INDEX idx_students_school_status ON students(school_id, status);
   CREATE INDEX idx_attendance_school_date ON attendance_records(school_id, date);
   CREATE INDEX idx_results_school_exam ON student_exam_results(school_id, exam_id);
   ```

3. **Standardize error handling**
   - Create custom error classes
   - Add error boundaries in UI

4. **Add transaction wrappers**
   - Wrap multi-table operations in RPC functions
   - Use database transactions for critical workflows

### 6.2 Short-term Actions (Medium Priority)

5. **Generate Supabase types**
   - Run `supabase gen types typescript`
   - Remove `as any` casts

6. **Optimize N+1 queries**
   - Create RPC functions for dashboard data
   - Use batch queries where possible

7. **Add admission number sequence**
   ```sql
   CREATE SEQUENCE admission_number_seq;
   ```

8. **Implement caching**
   - Cache dashboard analytics (5 min TTL)
   - Cache school settings (1 hour TTL)

### 6.3 Long-term Actions (Low Priority)

9. **Add real-time features**
   - Live attendance updates
   - Real-time notifications
   - Collaborative features

10. **Implement batch operations**
    - Bulk student import via RPC
    - Bulk attendance marking via RPC

11. **Add API rate limiting**
    - Prevent abuse
    - Implement per-user limits

12. **Add request/response logging**
    - Log all API calls for debugging
    - Monitor performance metrics

---

## 7. API Call Types by Feature

### 7.1 Onboarding Flow
1. School creation (RPC: `create_school_with_admin`)
2. KYC submission (multiple table inserts)
3. Payment verification (storage + table inserts)
4. Module activation (upsert feature flags)

### 7.2 Student Management
1. List students (SELECT with JOIN)
2. Create student (INSERT + guardian links)
3. Import students (bulk INSERT in loop)
4. Transfer student (UPDATE + INSERT)

### 7.3 Attendance Management
1. Create session (INSERT)
2. Mark attendance (bulk INSERT)
3. Calculate statistics (RPC)
4. Generate reports (VIEW queries)

### 7.4 Exam Management
1. Create exam (INSERT)
2. Enter marks (bulk INSERT)
3. Calculate results (multiple RPC + UPSERT)
4. Generate report cards (SELECT + INSERT)

### 7.5 Financial Management
1. Create invoice (INSERT + RPC for number)
2. Submit payment (storage + INSERT)
3. Approve payment (RPC + multiple UPDATEs)
4. Generate reports (RPC)

---

## 8. Database Views Used

| View Name | Service | Purpose |
|-----------|---------|---------|
| `profiles_view` | admin | User listing with roles |
| `payments_simple` | admin | Payment listing |
| `student_enrollment_summary` | analytics | Enrollment statistics |
| `attendance_summary_view` | analytics | Attendance statistics |
| `academic_performance_summary` | analytics | Academic statistics |
| `finance_summary_view` | analytics | Financial statistics |
| `staff_workload_summary` | analytics | Staff workload |

**Note:** Views help avoid complex JOINs in application code

---

## 9. RPC Functions Catalog

### 9.1 Staff Management (8 functions)
- `generate_teacher_invitation_token`
- `validate_teacher_invitation_token`
- `accept_teacher_invitation`
- `get_teacher_invitation_stats`
- `get_pending_teachers`
- `create_teacher_assignment`
- `get_teacher_assigned_students`
- `get_teacher_workload`

### 9.2 Attendance (3 functions)
- `get_class_attendance`
- `get_class_attendance_stats`
- `get_student_attendance_summary`

### 9.3 Exams (2 functions)
- `calculate_grade`
- `calculate_class_positions`

### 9.4 Admin (5 functions)
- `create_school_with_admin`
- `create_platform_admin`
- `delete_user`
- `approve_payment`
- `reject_payment`
- `get_system_health`

### 9.5 Finance (7 functions)
- `approve_student_payment`
- `reject_student_payment`
- `get_financial_summary`
- `create_audit_log`
- `generate_invoice_number`
- `get_payment_report`
- `get_invoice_report`

### 9.6 KYC (3 functions)
- `get_kyc_status`
- `get_kyc_progress`
- `check_kyc_required`

### 9.7 Subscription (6 functions)
- `check_tenant_feature_access`
- `enable_tenant_feature`
- `disable_tenant_feature`
- `approve_subscription_payment`
- `reject_subscription_payment`
- `get_subscription_stats`

### 9.8 Parent (6 functions)
- `get_parent_children`
- `get_parent_attendance_summary`
- `get_parent_fee_summary`
- `get_parent_latest_results`
- `get_parent_unread_count`
- `generate_invitation_token`

### 9.9 Analytics (7 functions)
- `get_school_analytics_overview`
- `get_attendance_analytics`
- `get_academic_analytics`
- `get_finance_analytics`
- `detect_attendance_alerts`
- `detect_finance_alerts`
- `detect_academic_alerts`

**Total RPC Functions: 47+**

---

## 10. Storage Buckets

| Bucket Name | Service | Purpose |
|------------|---------|---------|
| `student-images` | student | Student profile photos |
| `school-files` | billing | Payment proof documents |
| `kyc-documents` | kyc | KYC verification documents |

**Security Note:** Ensure proper RLS policies on all buckets

---

## 11. Event-Driven Architecture

### 11.1 Events Emitted
- `student.enrolled` - When student is enrolled in class

### 11.2 Event Handlers
- `_events/process/billing-automation.ts` - Processes billing events

**Note:** Event system is underutilized (only 1 event type found)

---

## 12. Conclusion

### Strengths
✅ Well-organized service layer
✅ Good use of database views for analytics
✅ Comprehensive RPC functions for complex operations
✅ Event-driven architecture for some workflows
✅ Soft deletes for data retention

### Weaknesses
❌ Client-side admin auth usage
❌ N+1 query problems
❌ Missing database indexes
❌ Inconsistent error handling
❌ No transaction wrappers for multi-table operations
❌ Extensive TypeScript `any` usage
❌ Silent failures in critical operations

### Overall Health: 6.5/10
The application has a solid foundation but needs optimization for performance, security, and maintainability.

---

## Next Steps

1. **Week 1:** Fix critical security issues, add indexes
2. **Week 2:** Optimize N+1 queries, add transactions
3. **Week 3:** Generate types, remove `any` casts
4. **Week 4:** Implement caching, add monitoring

**Estimated Effort:** 3-4 weeks for full remediation