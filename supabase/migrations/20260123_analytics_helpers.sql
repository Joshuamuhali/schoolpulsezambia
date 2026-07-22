-- ============================================================================
-- Analytics Helper Functions
-- ============================================================================
-- These functions provide analytics aggregations for dashboards and reports
-- ============================================================================

-- ============================================================================
-- Helper Function: Increment Attendance Summary
-- Updates or creates attendance summary for a student/month
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_attendance_summary(
  p_student_id UUID,
  p_month TEXT  -- Format: YYYY-MM
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  -- Get school_id from student
  SELECT school_id INTO v_school_id
  FROM students
  WHERE id = p_student_id;

  -- Upsert attendance summary
  INSERT INTO attendance_summary (student_id, school_id, month, total_days, present_days, absent_days, late_days)
  VALUES (p_student_id, v_school_id, p_month, 1, 0, 1, 0)
  ON CONFLICT (student_id, month)
  DO UPDATE SET
    total_days = attendance_summary.total_days + 1,
    absent_days = attendance_summary.absent_days + 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_attendance_summary TO authenticated;

-- ============================================================================
-- Helper Function: Upsert Daily Collection
-- Updates or creates daily collection aggregate
-- ============================================================================

CREATE OR REPLACE FUNCTION upsert_daily_collection(
  p_school_id UUID,
  p_date DATE,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_collection_aggregates (school_id, date, total_amount, transaction_count)
  VALUES (p_school_id, p_date, p_amount, 1)
  ON CONFLICT (school_id, date)
  DO UPDATE SET
    total_amount = daily_collection_aggregates.total_amount + p_amount,
    transaction_count = daily_collection_aggregates.transaction_count + 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION upsert_daily_collection TO authenticated;

-- ============================================================================
-- Helper Function: Recompute Class Performance
-- Recreates academic performance aggregates for a class
-- ============================================================================

CREATE OR REPLACE FUNCTION recompute_class_performance(p_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing aggregates for this class
  DELETE FROM academic_performance_summary
  WHERE class_id = p_class_id;

  -- Recreate from exam results
  INSERT INTO academic_performance_summary (class_id, subject_id, student_id, average_score, grade)
  SELECT 
    es.class_id,
    es.subject_id,
    er.student_id,
    AVG(er.score) as average_score,
    -- Compute grade from average score
    CASE
      WHEN AVG(er.score) >= 80 THEN 'A'
      WHEN AVG(er.score) >= 70 THEN 'B'
      WHEN AVG(er.score) >= 60 THEN 'C'
      WHEN AVG(er.score) >= 50 THEN 'D'
      ELSE 'F'
    END as grade
  FROM exam_results er
  JOIN exam_subjects es ON er.exam_subject_id = es.id
  WHERE es.class_id = p_class_id
  GROUP BY es.class_id, es.subject_id, er.student_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION recompute_class_performance TO authenticated;

-- ============================================================================
-- Create Missing Analytics Tables
-- ============================================================================

-- Attendance Summary Table
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: YYYY-MM
  total_days INTEGER NOT NULL DEFAULT 0,
  present_days INTEGER NOT NULL DEFAULT 0,
  absent_days INTEGER NOT NULL DEFAULT 0,
  late_days INTEGER NOT NULL DEFAULT 0,
  attendance_rate NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_days > 0 THEN (present_days::NUMERIC / total_days * 100) ELSE 0 END
  ) STORED,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, month)
);

CREATE INDEX idx_attendance_summary_student ON attendance_summary(student_id);
CREATE INDEX idx_attendance_summary_school_month ON attendance_summary(school_id, month);

ALTER TABLE attendance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view their own attendance summaries"
  ON attendance_summary FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

-- Daily Collection Aggregates Table
CREATE TABLE IF NOT EXISTS daily_collection_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, date)
);

CREATE INDEX idx_daily_collection_school_date ON daily_collection_aggregates(school_id, date);

ALTER TABLE daily_collection_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view their own collection aggregates"
  ON daily_collection_aggregates FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

-- Academic Performance Summary Table
CREATE TABLE IF NOT EXISTS academic_performance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  average_score NUMERIC(5,2),
  grade TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, subject_id, student_id)
);

CREATE INDEX idx_academic_performance_class ON academic_performance_summary(class_id);
CREATE INDEX idx_academic_performance_student ON academic_performance_summary(student_id);

ALTER TABLE academic_performance_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools can view their own performance summaries"
  ON academic_performance_summary FOR SELECT
  USING (
    class_id IN (
      SELECT id FROM classes 
      WHERE school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid())
    )
  );
