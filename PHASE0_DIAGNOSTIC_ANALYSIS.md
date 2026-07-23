# Phase 0 Diagnostic Analysis - Supabase Query Failures

## Executive Summary

Based on codebase examination, the 400/406 errors are caused by **missing foreign key constraints** on the `school_payments` table, which breaks PostgREST's nested join syntax. The frontend has workaround views (`profiles_view`, `payments_simple`) but the original broken queries are still executing.

---

## Findings from Code Examination

### 1. Console Errors (from user report)
```
GET /rest/v1/school_payments?select=id,amount,currency,status,payment_method,reference,created_at,verified_at,schools(id,name),profiles(id,full_name)&order=created_at.desc
Status: 400 Bad Request

GET /rest/v1/profiles?select=id,email,full_name,phone,created_at,school_members(school_id,role,is_active,schools(id,name))&order=created_at.desc
Status: 400 Bad Request

GET /rest/v1/roles?select=id,key,name,description&order=name.asc
Status: 400 Bad Request
```

### 2. Frontend Code Analysis

**File: `src/pages/admin/PaymentsPage.tsx`**
- Line 42: Imports `fetchAllPayments, approvePayment, rejectPayment` from `@/lib/services/adminService`
- Line 66-68: Calls `fetchAllPayments()` which should use the `payments_simple` view
- **Issue**: Console shows the original broken query is still being called, not the view

**File: `src/lib/services/adminService.ts`**
- Line 84-86: `fetchAllUsers()` uses `profiles_view` (workaround)
- Line 170-173: `fetchAllPayments()` uses `payments_simple` (workaround)
- Line 228-240: `fetchSystemLogs()` uses nested joins: `profiles(id, full_name, email), schools(id, name)` - **THIS IS STILL BROKEN**
- Line 286-303: `fetchPlatformUserStats()` queries `profiles` and `school_members` directly
- Line 349-357: `fetchRoleId()` queries `roles` table directly
- Line 360-367: `fetchRoles()` queries `roles` table directly

**File: `src/pages/admin/UsersPage.tsx`**
- Line 90-92: Expects `user.school_members?.[0]?.roles` - nested join to roles
- Line 214-216: Expects `user.school_members?.[0]?.schools` - nested join to schools
- **Issue**: If the profiles_view doesn't include these joins, the UI shows "Platform Admin" as fallback

### 3. Database Schema Analysis

**From `supabase/migrations/20240001_platform_foundation.sql`:**
- `schools` table: id, name, subdomain, logo_url, address, phone, email, access_state, created_at, updated_at
- `profiles` table: id (FK to auth.users), school_id (FK to schools), full_name, email, avatar_url, phone, created_at, updated_at
- `roles` table: id, name, description, created_at
- `user_roles` table: user_id, role_id, school_id (junction table)
- **NO `school_members` table in this migration** - it's created elsewhere

**From `supabase/migrations/20260723_onboarding_module_selection.sql`:**
- Line 39-43: `ALTER TABLE school_payments ADD COLUMN IF NOT EXISTS reviewed_by, reviewed_at, rejection_reason, admin_notes`
- Line 50: `ALTER TABLE school_payments ENABLE ROW LEVEL SECURITY`
- Line 59-61: RLS policy for SELECT using `school_id IN (SELECT school_id FROM school_members...)`
- Line 64-66: RLS policy for INSERT using `school_id IN (SELECT school_id FROM school_members...)`
- Line 69-71: RLS policy for ALL using `is_platform_admin()`
- **NO FOREIGN KEY CONSTRAINTS DEFINED**

**From `supabase/migrations/20260112_billing_system.sql`:**
- Line 28-59: `payment_verifications` table (different from `school_payments`)
- Line 69-94: `invoices` table
- Line 189-198: RLS policies reference `school_members` table
- **NO foreign keys from payment_verifications to schools or profiles**

**From `supabase/migrations/20260124_financial_audit_system.sql`:**
- Line 8-23: `school_fee_structures` table references `tenants(id)` - **NOTE: uses `tenants` not `schools`**
- Line 31-69: `student_invoices` table references `tenants(id)` and `students(id)`
- Line 80-115: `student_payments` table references `tenants(id)` and `students(id)`
- Line 190-238: `financial_transactions` table references `tenants(id)`
- **CRITICAL**: These tables reference `tenants(id)` but the actual table is named `schools` - this is a schema mismatch!

### 4. Root Cause Analysis

**Problem 1: Missing Foreign Keys**
The `school_payments` table has NO foreign key constraints to:
- `schools(id)` - needed for `schools(id, name)` join
- `profiles(id)` or `auth.users(id)` - needed for `profiles(id, full_name)` join

PostgREST requires explicit FK constraints for nested joins. Without them, you get:
- PGRST200: "No relationship found between tables"
- PGRST201: "Ambiguous relationship" (if multiple FKs exist)

**Problem 2: Schema Mismatch**
The `20260124_financial_audit_system.sql` migration references `tenants(id)` but the actual table is `schools(id)`. This suggests:
- Either `tenants` is a view/alias for `schools`
- Or this is a bug in the migration

**Problem 3: Frontend Query Mismatch**
The console errors show the frontend is calling:
```
/rest/v1/school_payments?select=...,schools(id,name),profiles(id,full_name)
```

But `adminService.ts` line 170-173 shows it should be using `payments_simple` view. This suggests:
- The frontend code was recently updated to use views
- But the old queries are cached or there's another code path still using them
- OR the views don't exist yet and the code is falling back

**Problem 4: Roles Query Failure**
The `/roles` endpoint is returning 400. This could be because:
- The `roles` table doesn't have RLS enabled properly
- The `key` column doesn't exist (the schema shows `name` but not `key`)
- Looking at the schema: `roles` table has `id, name, description, created_at` - **NO `key` COLUMN**
- But the frontend queries `select("id, key, name, description")` and filters by `.eq("key", roleKey)`

**Problem 5: "Platform Admin" Badge Issue**
In `UsersPage.tsx` line 242-244, the fallback badge shows "Platform Admin" when:
```typescript
{school ? (
  <span className="text-sm">{school.name}</span>
) : (
  <Badge variant="outline" className="bg-primary/10 text-primary">
    Platform Admin
  </Badge>
)}
```

This happens when `school` is null/undefined, which occurs when:
- The `profiles_view` doesn't include the `schools` join
- OR the join fails due to missing FK constraints
- OR the user's `school_id` is actually null (platform admins)

---

## What Needs to Be Verified (Phase 0 Queries)

I need you to run these 5 queries in your Supabase SQL Editor and paste the **FULL RAW OUTPUT**:

### Query 1: FK Constraints
```sql
SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name, tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name IN ('school_payments','profiles','school_members','schools')
       OR ccu.table_name IN ('school_payments','profiles','school_members','schools'))
ORDER BY tc.table_name, kcu.column_name;
```

**Expected result**: Will likely show NO FKs from `school_payments` to `schools` or `profiles`

### Query 2: Columns
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('school_payments','profiles','school_members','schools')
ORDER BY table_name, ordinal_position;
```

**Expected result**: Will show actual column names and types

### Query 3: RLS Policies
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('school_payments','profiles','school_members','schools','roles')
ORDER BY tablename, policyname;
```

**Expected result**: Will show if RLS is enabled and what policies exist

### Query 4: Views and Functions
```sql
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%payment%' OR table_name LIKE '%profile%' OR table_name LIKE '%user_detail%' OR table_name IN ('roles','profiles_view','payments_simple')
ORDER BY table_name;

SELECT proname FROM pg_proc 
WHERE proname LIKE '%payment%' OR proname LIKE '%profile%' OR proname LIKE '%user%'
ORDER BY proname;
```

**Expected result**: Will show if `profiles_view`, `payments_simple`, and other workaround views exist

### Query 5: Test the Failing Query
```sql
SELECT id, amount, currency, status, payment_method, reference, created_at, verified_at, 
       schools(id, name), profiles(id, full_name)
FROM school_payments
ORDER BY created_at DESC
LIMIT 1;
```

**Expected result**: Will return the exact PGRST error code and message

---

## Questions for You

1. **Are `school_payments`, `payment_verifications`, and `subscription_payments` three separate tables?** Or are some of them aliases/views of each other?

2. **Does a `tenants` table exist, or is it a view/alias for `schools`?** The `20260124_financial_audit_system.sql` migration references `tenants(id)` but the foundation schema uses `schools(id)`.

3. **Does the `roles` table have a `key` column?** The frontend queries it by `key`, but the foundation schema only shows `name`.

---

## Preliminary Diagnosis (Pending Phase 0 Output)

Based on code analysis alone, the fixes will likely be:

1. **Add FK constraints** to `school_payments`:
   ```sql
   ALTER TABLE school_payments 
     ADD CONSTRAINT school_payments_school_id_fkey 
     FOREIGN KEY (school_id) REFERENCES schools(id),
     ADD CONSTRAINT school_payments_reviewed_by_fkey 
     FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
   ```

2. **Fix the roles table** - either add a `key` column or update frontend to use `name`

3. **Verify or create the workaround views** (`profiles_view`, `payments_simple`) with proper joins

4. **Fix the `school_members` table references** - ensure it exists and has proper FKs

5. **Reload PostgREST schema cache**:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

## Next Steps

1. Run the 5 Phase 0 queries and paste the output
2. Answer the 3 questions above
3. I'll provide the exact Phase 1 diagnosis table
4. Then Phase 2 with the single canonical fix

**Do not make any changes yet** - I need the actual database state before proposing fixes.