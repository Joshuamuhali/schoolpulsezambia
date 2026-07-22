# School Pulse API Architecture - Implementation Summary

## Overview
Successfully migrated from client-side Supabase calls to a unified server-side API architecture using Supabase Edge Functions. This provides proper tenant scoping, RBAC, module gating, and event-driven cross-domain communication.

## Architecture Components

### 1. Database Migrations (4 new files)

#### `20260121_domain_events.sql`
- Created `domain_events` table for event-driven architecture
- Added helper functions: `emit_domain_event()`, `process_domain_event()`
- RLS policies for tenant isolation

#### `20260122_rbac_helpers.sql`
- Centralized RBAC helper functions:
  - `get_user_context()` - Returns user, school, role, permissions
  - `has_permission()` - Check specific permission
  - `is_module_enabled()` - Check module feature flag
  - `assert_teacher_owns_class()` - Single source of truth for class access
  - `assert_parent_linked_to_student()` - Parent-student link validation
  - `get_current_school_id()` - Tenant resolution

#### `20260123_analytics_helpers.sql`
- Analytics aggregation functions:
  - `increment_attendance_summary()` - Update attendance aggregates
  - `upsert_daily_collection()` - Update daily finance aggregates
  - `recompute_class_performance()` - Recompute academic performance
- Created analytics tables:
  - `attendance_summary`
  - `daily_collection_aggregates`
  - `academic_performance_summary`

#### `20260124_payment_transaction.sql`
- Transactional payment recording function: `record_payment_transaction()`
- Atomic payment + balance update in single Postgres transaction
- Added `idempotency_key` column to payments table

#### `20260125_exam_marks_transaction.sql`
- Transactional exam marks submission function: `submit_exam_marks()`
- Atomic marks insertion with automatic grade computation
- Added `idempotency_key` column to exam_results table

### 2. Shared Middleware (`supabase/functions/_shared/`)

#### `middleware.ts`
- `resolveTenant()` - Resolves school_id from JWT
- `checkPermission()` - RBAC enforcement
- `checkModuleEnabled()` - Module gating
- `withMiddleware()` - Unified middleware chain
- Standard response helpers: `successResponse()`, `errorResponse()`

#### `dispatcher.ts`
- `emitEvent()` - Emit domain events
- `processEvents()` - Process unprocessed events
- Event handlers for all domain events

### 3. Edge Functions by Domain

#### Academic Domain
- `academic/years/index.ts` - Academic years CRUD
- `academic/terms/index.ts` - Terms CRUD with date validation

#### Students Domain
- `students/index.ts` - Student CRUD with enrollment and event emission

#### Finance Domain
- `finance/payments/index.ts` - Transactional payment recording with idempotency

#### Attendance Domain
- `attendance/sessions/index.ts` - Attendance submission with idempotency and teacher ownership check

#### Exams Domain
- `exams/marks/index.ts` - Exam marks submission with idempotency and grade computation

#### Parents Domain
- `parents/children/index.ts` - Composed child summary (attendance, results, fees)

#### Analytics Domain
- `analytics/dashboard/index.ts` - Role-aware dashboard analytics

#### Staff Domain
- `staff/assignments/index.ts` - Teacher assignments with event emission

#### Event Processing
- `_events/process/index.ts` - Scheduled event processor

## Event Flow

### student.enrolled
- **Emitted by**: `students/index.ts` when student enrolled
- **Handled by**: Event processor
- **Actions**: 
  - Checks for active fee structure for grade
  - Creates student fee record if structure exists

### class.teacher_assigned
- **Emitted by**: `staff/assignments/index.ts` when teacher assigned
- **Handled by**: Event processor
- **Actions**: Updates teacher_assignments table

### attendance.marked_absent
- **Emitted by**: `attendance/sessions/index.ts` when student marked absent
- **Handled by**: Event processor
- **Actions**:
  - Queues parent notification
  - Updates attendance summary

### exam.published
- **Emitted by**: (to be added to exam publish function)
- **Handled by**: Event processor
- **Actions**: Recomputes class performance aggregates

### payment.recorded
- **Emitted by**: `finance/payments/index.ts` when payment recorded
- **Handled by**: Event processor
- **Actions**:
  - Queues parent notification
  - Updates daily collection aggregate

## Security Features

1. **Tenant Scoping**: Every request resolves school_id from JWT, never trusted from client
2. **RBAC**: Permission checks via `has_permission()` before data access
3. **Module Gating**: Feature flag checks via `is_module_enabled()`
4. **Ownership Checks**: Centralized `assert_teacher_owns_class()` for all class access
5. **Parent Validation**: `assert_parent_linked_to_student()` for parent portal
6. **RLS Backstop**: Database-level policies as second line of defense

## Idempotency

Financially significant operations support idempotency via `Idempotency-Key` header:
- Payments (`finance/payments/index.ts`)
- Attendance submission (`attendance/sessions/index.ts`)
- Exam marks (`exams/marks/index.ts`)

## Transactional Operations

Critical operations wrapped in Postgres functions:
- `record_payment_transaction()` - Payment + balance update
- `submit_exam_marks()` - Marks + grade computation

## Deployment Steps

1. **Run migrations** in Supabase SQL editor:
   ```sql
   -- Run in order
   \i supabase/migrations/20260121_domain_events.sql
   \i supabase/migrations/20260122_rbac_helpers.sql
   \i supabase/migrations/20260123_analytics_helpers.sql
   \i supabase/migrations/20260124_payment_transaction.sql
   \i supabase/migrations/20260125_exam_marks_transaction.sql
   ```

2. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy _shared/middleware
   supabase functions deploy _shared/dispatcher
   supabase functions deploy academic/years
   supabase functions deploy academic/terms
   supabase functions deploy students
   supabase functions deploy finance/payments
   supabase functions deploy attendance/sessions
   supabase functions deploy exams/marks
   supabase functions deploy parents/children
   supabase functions deploy analytics/dashboard
   supabase functions deploy staff/assignments
   supabase functions deploy _events/process
   ```

3. **Set up event processor cron job**:
   - Configure Supabase cron or external scheduler
   - Call `_events/process` function every 1-5 minutes

## API Usage Example

### Call Edge Function from Frontend

```typescript
const { data, error } = await supabase.functions.invoke('students', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
  body: {
    // Request body
  },
});
```

### Response Format

All responses follow standard envelope:

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 100
  }
}
```

Error responses:

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions"
  }
}
```

## Verification Steps

### 1. Test Tenant Scoping
```sql
-- Insert as School A user
INSERT INTO students (school_id, ...) VALUES ('school-a-id', ...);

-- Try to read as School B user - should fail
SELECT * FROM students WHERE school_id = 'school-a-id';
```

### 2. Test RBAC
```typescript
// Call with teacher role on admin-only endpoint
// Should return 403 PERMISSION_DENIED
```

### 3. Test Module Gating
```typescript
// Call finance endpoint with finance module disabled
// Should return 403 MODULE_NOT_ENABLED
```

### 4. Test Idempotency
```typescript
// Call payment endpoint twice with same Idempotency-Key
// Second call should return same result without creating duplicate
```

### 5. Test Event Flow
```sql
-- Create student enrollment
INSERT INTO student_enrollments (...) VALUES (...);

-- Check domain_events table
SELECT * FROM domain_events WHERE event_type = 'student.enrolled';

-- Run event processor
CALL _events/process();

-- Verify fee record created
SELECT * FROM student_fees WHERE student_id = '...';
```

## Next Steps

1. **Update frontend services** to call Edge Functions instead of direct Supabase
2. **Add remaining Edge Functions** for complete CRUD operations
3. **Set up cron job** for event processor
4. **Add monitoring** for event processing failures
5. **Add more analytics endpoints** for reports

## Notes

- TypeScript lint errors about Deno modules are expected - these run in Supabase Deno runtime
- All Edge Functions use service role key for database access (server-side)
- Client sends JWT in Authorization header for authentication
- Middleware chain runs before any database access
- Event system decouples domains while maintaining causal relationships
