-- ============================================================================
-- Transactional Exam Marks Submission
-- ============================================================================
-- This function ensures atomic marks submission with grade computation
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_exam_marks(
  p_school_id UUID,
  p_exam_subject_id UUID,
  p_scores JSONB,
  p_recorded_by UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  results_count INTEGER,
  average_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exam_subject RECORD;
  v_max_marks INTEGER;
  v_total_score NUMERIC := 0;
  v_count INTEGER := 0;
BEGIN
  -- Get exam subject details
  SELECT * INTO v_exam_subject
  FROM exam_subjects
  WHERE id = p_exam_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam subject not found';
  END IF;

  v_max_marks := v_exam_subject.max_marks;

  -- Insert exam results
  FOR i IN 0..jsonb_array_length(p_scores)-1 LOOP
    DECLARE
      v_student_id UUID := (p_scores->i->>'student_id')::UUID;
      v_score NUMERIC := (p_scores->i->>'score')::NUMERIC;
      v_grade TEXT;
    BEGIN
      -- Validate score
      IF v_score < 0 OR v_score > v_max_marks THEN
        RAISE EXCEPTION 'Invalid score for student %', v_student_id;
      END IF;

      -- Compute grade based on score percentage
      IF v_max_marks > 0 THEN
        DECLARE
          v_percentage NUMERIC := (v_score / v_max_marks) * 100;
        BEGIN
          v_grade := CASE
            WHEN v_percentage >= 80 THEN 'A'
            WHEN v_percentage >= 70 THEN 'B'
            WHEN v_percentage >= 60 THEN 'C'
            WHEN v_percentage >= 50 THEN 'D'
            ELSE 'F'
          END;
        END;
      ELSE
        v_grade := 'N/A';
      END IF;

      -- Insert or update exam result
      INSERT INTO exam_results (
        school_id,
        exam_subject_id,
        student_id,
        score,
        grade,
        recorded_by,
        idempotency_key
      ) VALUES (
        p_school_id,
        p_exam_subject_id,
        v_student_id,
        v_score,
        v_grade,
        p_recorded_by,
        p_idempotency_key
      )
      ON CONFLICT (exam_subject_id, student_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        grade = EXCLUDED.grade,
        recorded_by = p_recorded_by,
        updated_at = NOW();

      v_total_score := v_total_score + v_score;
      v_count := v_count + 1;
    END;
  END LOOP;

  -- Return summary
  RETURN QUERY SELECT v_count, CASE WHEN v_count > 0 THEN v_total_score / v_count ELSE 0 END;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION submit_exam_marks TO authenticated;

-- ============================================================================
-- Add idempotency_key column to exam_results if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'exam_results' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE exam_results ADD COLUMN idempotency_key TEXT;
    CREATE INDEX idx_exam_results_idempotency ON exam_results(idempotency_key);
  END IF;
END $$;
