-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260126_v2_foundation_tables
-- V2 Foundation: New tables for enhanced functionality
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Grade Boundaries (Enhanced grading per exam/school) ──────────────────────
-- This provides more flexible grading boundaries than the existing grading_scales

CREATE TABLE grade_boundaries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE grade_boundary_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_boundary_id UUID NOT NULL REFERENCES grade_boundaries(id) ON DELETE CASCADE,
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_letter      TEXT NOT NULL,
  min_score         NUMERIC(5,2) NOT NULL,
  max_score         NUMERIC(5,2) NOT NULL,
  gpa_points        NUMERIC(3,2),
  remarks           TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (min_score <= max_score),
  CHECK (gpa_points >= 0 AND gpa_points <= 5.0)
);

CREATE INDEX idx_grade_boundaries_school_id ON grade_boundaries(school_id);
CREATE INDEX idx_grade_boundary_rules_boundary_id ON grade_boundary_rules(grade_boundary_id);
CREATE INDEX idx_grade_boundary_rules_school_id ON grade_boundary_rules(school_id);

-- ─── Timetable/Scheduling ─────────────────────────────────────────────────────

CREATE TABLE timetable_periods (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  sort_order      INTEGER NOT NULL,
  is_break        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE timetable (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id         UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_id       UUID NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
  room            TEXT,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, class_id, day_of_week, period_id, academic_year_id, term_id)
);

CREATE INDEX idx_timetable_school_id ON timetable(school_id);
CREATE INDEX idx_timetable_class_id ON timetable(class_id);
CREATE INDEX idx_timetable_teacher_id ON timetable(teacher_id);
CREATE INDEX idx_timetable_term_id ON timetable(term_id);

-- ─── Homework Management ──────────────────────────────────────────────────────

CREATE TABLE homework (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  term_id         UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  class_id        UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  due_date        DATE NOT NULL,
  due_time        TIME,
  attachment_urls TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE homework_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id     UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  submission_text TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  submitted_at    TIMESTAMPTZ,
  marked_at       TIMESTAMPTZ,
  marks_obtained  NUMERIC(5,2),
  teacher_remarks TEXT,
  marked_by       UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(homework_id, student_id)
);

CREATE INDEX idx_homework_school_id ON homework(school_id);
CREATE INDEX idx_homework_class_id ON homework(class_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);
CREATE INDEX idx_homework_submissions_homework_id ON homework_submissions(homework_id);
CREATE INDEX idx_homework_submissions_student_id ON homework_submissions(student_id);

-- ─── Parent-Teacher Messaging ────────────────────────────────────────────────

CREATE TABLE message_threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject         TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE message_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at    TIMESTAMPTZ,
  is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text    TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_threads_school_id ON message_threads(school_id);
CREATE INDEX idx_message_threads_last_message ON message_threads(last_message_at DESC);
CREATE INDEX idx_message_participants_thread_id ON message_participants(thread_id);
CREATE INDEX idx_message_participants_user_id ON message_participants(user_id);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ─── Payment Plans ───────────────────────────────────────────────────────────

CREATE TABLE payment_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES student_invoices(id) ON DELETE CASCADE,
  total_amount    NUMERIC(12,2) NOT NULL,
  installment_count INTEGER NOT NULL,
  frequency       TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'termly', 'custom')),
  start_date      DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_plan_installments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date        DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  payment_id      UUID REFERENCES payments(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payment_plan_id, installment_number)
);

CREATE INDEX idx_payment_plans_school_id ON payment_plans(school_id);
CREATE INDEX idx_payment_plans_student_id ON payment_plans(student_id);
CREATE INDEX idx_payment_plan_installments_plan_id ON payment_plan_installments(payment_plan_id);

-- ─── Health Records ──────────────────────────────────────────────────────────

CREATE TABLE health_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id          UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  blood_group         TEXT,
  allergies           TEXT,
  chronic_conditions  TEXT,
  current_medications TEXT,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relationship TEXT,
  primary_care_provider TEXT,
  primary_care_phone TEXT,
  notes               TEXT,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, student_id)
);

CREATE TABLE vaccination_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vaccine_name    TEXT NOT NULL,
  dose_number     INTEGER,
  administered_date DATE NOT NULL,
  next_due_date   DATE,
  administered_by TEXT,
  facility        TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  incident_type   TEXT NOT NULL CHECK (incident_type IN ('accident', 'illness', 'injury', 'medication_administered', 'other')),
  incident_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description     TEXT NOT NULL,
  treatment_given TEXT,
  medication_given TEXT,
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_notes TEXT,
  reported_by     UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_health_records_school_id ON health_records(school_id);
CREATE INDEX idx_health_records_student_id ON health_records(student_id);
CREATE INDEX idx_vaccination_records_student_id ON vaccination_records(student_id);
CREATE INDEX idx_health_incidents_student_id ON health_incidents(student_id);
CREATE INDEX idx_health_incidents_date ON health_incidents(incident_date DESC);

-- ─── Behavior & Discipline ───────────────────────────────────────────────────

CREATE TABLE behavior_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  behavior_type   TEXT NOT NULL CHECK (behavior_type IN ('positive', 'negative')),
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  location        TEXT,
  witnesses       TEXT[],
  action_taken    TEXT,
  points          INTEGER,
  recorded_by     UUID NOT NULL REFERENCES profiles(id),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE discipline_referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  referral_date   DATE NOT NULL,
  incident_date   DATE NOT NULL,
  incident_time   TIME,
  category        TEXT NOT NULL,
  description     TEXT NOT NULL,
  action_taken    TEXT,
  consequence     TEXT,
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  parent_notified_at TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'open',
  resolved_at     TIMESTAMPTZ,
  resolution_notes TEXT,
  referred_by     UUID NOT NULL REFERENCES profiles(id),
  resolved_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE suspensions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  discipline_referral_id UUID REFERENCES discipline_referrals(id),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  reason          TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('in_school', 'out_of_school')),
  parent_notified BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_behavior_records_school_id ON behavior_records(school_id);
CREATE INDEX idx_behavior_records_student_id ON behavior_records(student_id);
CREATE INDEX idx_behavior_records_recorded_at ON behavior_records(recorded_at DESC);
CREATE INDEX idx_discipline_referrals_school_id ON discipline_referrals(school_id);
CREATE INDEX idx_discipline_referrals_student_id ON discipline_referrals(student_id);
CREATE INDEX idx_suspensions_student_id ON suspensions(student_id);

-- ─── Library Management ──────────────────────────────────────────────────────

CREATE TABLE library_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  isbn            TEXT,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  publisher       TEXT,
  publication_year INTEGER,
  category        TEXT,
  subcategory     TEXT,
  edition         TEXT,
  pages           INTEGER,
  language        TEXT DEFAULT 'English',
  description     TEXT,
  cover_image_url TEXT,
  location_shelf  TEXT,
  location_rack   TEXT,
  status          TEXT NOT NULL DEFAULT 'available',
  acquisition_date DATE,
  acquisition_cost NUMERIC(10,2),
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE book_copies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  library_book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  copy_number     TEXT NOT NULL,
  barcode         TEXT UNIQUE,
  qr_code         TEXT,
  status          TEXT NOT NULL DEFAULT 'available',
  condition       TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, library_book_id, copy_number)
);

CREATE TABLE book_loans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  book_copy_id    UUID NOT NULL REFERENCES book_copies(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  loan_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  return_date     DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  fine_amount     NUMERIC(10,2) DEFAULT 0,
  fine_paid       BOOLEAN NOT NULL DEFAULT FALSE,
  loaned_by       UUID NOT NULL REFERENCES profiles(id),
  returned_to     UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE book_reservations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  library_book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  fulfilled_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_library_books_school_id ON library_books(school_id);
CREATE INDEX idx_library_books_title ON library_books(title);
CREATE INDEX idx_library_books_author ON library_books(author);
CREATE INDEX idx_book_copies_library_book_id ON book_copies(library_book_id);
CREATE INDEX idx_book_loans_school_id ON book_loans(school_id);
CREATE INDEX idx_book_loans_student_id ON book_loans(student_id);
CREATE INDEX idx_book_loans_due_date ON book_loans(due_date);
CREATE INDEX idx_book_reservations_school_id ON book_reservations(school_id);

-- ─── Inventory Management ────────────────────────────────────────────────────

CREATE TABLE inventory_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  parent_category_id UUID REFERENCES inventory_categories(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, name)
);

CREATE TABLE inventory_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES inventory_categories(id),
  name            TEXT NOT NULL,
  description     TEXT,
  sku             TEXT,
  quantity        INTEGER NOT NULL DEFAULT 0,
  unit            TEXT,
  unit_cost       NUMERIC(10,2),
  location        TEXT,
  condition       TEXT CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  purchase_date   DATE,
  warranty_expiry DATE,
  assigned_to     UUID REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'active',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'distribution', 'return', 'adjustment', 'disposal')),
  quantity        INTEGER NOT NULL,
  unit_cost       NUMERIC(10,2),
  total_cost      NUMERIC(10,2),
  reference       TEXT,
  notes           TEXT,
  recorded_by     UUID NOT NULL REFERENCES profiles(id),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_items_school_id ON inventory_items(school_id);
CREATE INDEX idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);

-- ─── Facility Management ─────────────────────────────────────────────────────

CREATE TABLE facilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  facility_type   TEXT NOT NULL,
  location        TEXT,
  capacity        INTEGER,
  description     TEXT,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE facility_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  facility_id     UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  booked_by       UUID NOT NULL REFERENCES profiles(id),
  purpose         TEXT NOT NULL,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed',
  notes           TEXT,
  approved_by     UUID REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_facilities_school_id ON facilities(school_id);
CREATE INDEX idx_facility_bookings_school_id ON facility_bookings(school_id);
CREATE INDEX idx_facility_bookings_facility_id ON facility_bookings(facility_id);
CREATE INDEX idx_facility_bookings_datetime ON facility_bookings(start_datetime, end_datetime);

-- ─── School Events ───────────────────────────────────────────────────────────

CREATE TABLE school_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  event_type      TEXT NOT NULL,
  start_datetime  TIMESTAMPTZ NOT NULL,
  end_datetime    TIMESTAMPTZ NOT NULL,
  location        TEXT,
  target_audience TEXT[] DEFAULT '{}',
  max_participants INTEGER,
  registration_required BOOLEAN NOT NULL DEFAULT FALSE,
  registration_deadline DATE,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_registrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES school_events(id) ON DELETE CASCADE,
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES profiles(id),
  registered_by   UUID NOT NULL REFERENCES profiles(id),
  status          TEXT NOT NULL DEFAULT 'registered',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_events_school_id ON school_events(school_id);
CREATE INDEX idx_school_events_start_datetime ON school_events(start_datetime);
CREATE INDEX idx_event_registrations_event_id ON event_registrations(event_id);

-- ─── Visitor Management ──────────────────────────────────────────────────────

CREATE TABLE visitor_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  visitor_name    TEXT NOT NULL,
  visitor_type    TEXT NOT NULL,
  id_number       TEXT,
  phone_number    TEXT NOT NULL,
  email           TEXT,
  organization    TEXT,
  purpose         TEXT NOT NULL,
  visiting_student_id UUID REFERENCES students(id),
  visiting_staff_id UUID REFERENCES profiles(id),
  check_in_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time  TIMESTAMPTZ,
  badge_number    TEXT,
  photo_url       TEXT,
  id_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visitor_logs_school_id ON visitor_logs(school_id);
CREATE INDEX idx_visitor_logs_check_in ON visitor_logs(check_in_time DESC);
CREATE INDEX idx_visitor_logs_visitor_name ON visitor_logs(visitor_name);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

CREATE TRIGGER trg_grade_boundaries_updated_at BEFORE UPDATE ON grade_boundaries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_grade_boundary_rules_updated_at BEFORE UPDATE ON grade_boundary_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timetable_periods_updated_at BEFORE UPDATE ON timetable_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_timetable_updated_at BEFORE UPDATE ON timetable FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_homework_updated_at BEFORE UPDATE ON homework FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_homework_submissions_updated_at BEFORE UPDATE ON homework_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_message_threads_updated_at BEFORE UPDATE ON message_threads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payment_plans_updated_at BEFORE UPDATE ON payment_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payment_plan_installments_updated_at BEFORE UPDATE ON payment_plan_installments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_health_records_updated_at BEFORE UPDATE ON health_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_vaccination_records_updated_at BEFORE UPDATE ON vaccination_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_health_incidents_updated_at BEFORE UPDATE ON health_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_behavior_records_updated_at BEFORE UPDATE ON behavior_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_discipline_referrals_updated_at BEFORE UPDATE ON discipline_referrals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_suspensions_updated_at BEFORE UPDATE ON suspensions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_library_books_updated_at BEFORE UPDATE ON library_books FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_book_copies_updated_at BEFORE UPDATE ON book_copies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_book_loans_updated_at BEFORE UPDATE ON book_loans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_book_reservations_updated_at BEFORE UPDATE ON book_reservations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_categories_updated_at BEFORE UPDATE ON inventory_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_inventory_transactions_updated_at BEFORE UPDATE ON inventory_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_facility_bookings_updated_at BEFORE UPDATE ON facility_bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_school_events_updated_at BEFORE UPDATE ON school_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_event_registrations_updated_at BEFORE UPDATE ON event_registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_visitor_logs_updated_at BEFORE UPDATE ON visitor_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();