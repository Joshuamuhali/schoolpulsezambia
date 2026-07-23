# Critical Questions - Need Your Input

Based on the workflow you've described, I understand the system now:

## Confirmed Workflow
1. School registers → `schools` table INSERT
2. Select modules → `school_module_selections` table
3. Calculate total → Sum of module prices + setup fee
4. Submit → Creates `school_payments` row with `status = 'pending'`
5. Admin sends payment instructions (manual - WhatsApp/email)
6. School submits proof → `school_payments` row with payment details
7. Admin approves → Updates `school_payments.status = 'verified'` AND should update `schools.access_state = 'active'`
8. School gains access → RLS policies allow access based on `school_members` membership

## What This Confirms
- **`school_payments` is the canonical table** for onboarding payments (not `payment_verifications` or `subscription_payments`)
- The critical link is: `school_payments.status = 'verified'` → `schools.access_state = 'active'`
- If step 7 doesn't update `schools.access_state`, that's why access isn't working

---

## What I Need From You

I cannot proceed with fixes until you provide the Phase 0 diagnostic output. Here's the **minimum** I need:

### Option A: Run ALL 5 queries (preferred)
Go to Supabase Dashboard → SQL Editor and run these, then paste the output:

**Query 1 (FK constraints):**
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

**Query 2 (columns):**
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('school_payments','profiles','school_members','schools')
ORDER BY table_name, ordinal_position;
```

**Query 3 (RLS policies):**
```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('school_payments','profiles','school_members','schools','roles')
ORDER BY tablename, policyname;
```

**Query 4 (views):**
```sql
SELECT table_name FROM information_schema.views 
WHERE table_name LIKE '%payment%' OR table_name LIKE '%profile%' OR table_name IN ('profiles_view','payments_simple','roles')
ORDER BY table_name;
```

**Query 5 (test failing query):**
```sql
SELECT id, amount, currency, status, payment_method, reference, created_at, verified_at, 
       schools(id, name), profiles(id, full_name)
FROM school_payments
ORDER BY created_at DESC
LIMIT 1;
```

### Option B: Answer These 3 Questions (minimum required)

If you can't run the queries, at least answer:

1. **Does `school_payments` have foreign keys to `schools` and `profiles`/`auth.users`?**
   - Check in Supabase Dashboard → Database → Tables → `school_payments` → Constraints tab
   - Or run: `SELECT * FROM information_schema.table_constraints WHERE table_name = 'school_payments' AND constraint_type = 'FOREIGN KEY';`

2. **Does the `roles` table have a `key` column?**
   - Check in Supabase Dashboard → Database → Tables → `roles` → Columns
   - The foundation schema shows `id, name, description, created_at` but the frontend queries `select("id, key, name, description")`

3. **Does a `school_members` table exist?**
   - The RLS policies reference it, but I haven't seen it in the migrations
   - Run: `SELECT table_name FROM information_schema.tables WHERE table_name = 'school_members';`

---

## Why I Need This

I've analyzed your code and found **5 likely problems**, but I need the actual database state to confirm which ones are real:

1. **Missing FK constraints** on `school_payments` → breaks nested joins → 400 errors
2. **Missing `key` column** on `roles` → breaks roles query → 400 error
3. **Missing `school_members` table** or wrong references → breaks RLS policies
4. **`approve_payment` RPC doesn't update `schools.access_state`** → approval doesn't grant access
5. **Frontend still calling old queries** instead of the workaround views

Without the Phase 0 output, I'm guessing. With it, I can give you the exact fix.

---

## Quick Test You Can Do Right Now

In your browser console on the admin page, run:
```javascript
console.log('Current user:', JSON.stringify(localStorage.getItem('supabase.auth.token')));
```

Then check: Are you logged in as one of these users?
- genic1401@gmail.com
- mwansaplarry@gmail.com
- admin@schoolpulse.local
- muhali@schoolpulsezambia.com

If yes, the "Platform Admin" badge showing for everyone suggests the `profiles_view` or the join to `school_members` → `schools` is broken, which aligns with the missing FK theory.

---

**Please provide either:**
- The 5 query outputs (copy-paste from Supabase SQL Editor), OR
- Answers to the 3 questions above

Then I'll immediately give you the Phase 1 diagnosis and Phase 2 fix.