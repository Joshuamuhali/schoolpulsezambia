-- ============================================================================
-- Transactional Payment Recording
-- ============================================================================
-- This function ensures atomic payment recording with balance updates
-- ============================================================================

CREATE OR REPLACE FUNCTION record_payment_transaction(
  p_school_id UUID,
  p_student_id UUID,
  p_bill_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference TEXT,
  p_recorded_by UUID,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  payment_id UUID,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the bill row to prevent concurrent updates
  SELECT balance INTO v_current_balance
  FROM student_bills
  WHERE id = p_bill_id
  FOR UPDATE;

  -- Validate payment amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid payment amount';
  END IF;

  IF p_amount > v_current_balance THEN
    RAISE EXCEPTION 'Payment amount exceeds outstanding balance';
  END IF;

  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;

  -- Insert payment record
  INSERT INTO payments (
    school_id,
    student_id,
    bill_id,
    amount,
    payment_method,
    reference,
    status,
    recorded_by,
    idempotency_key
  ) VALUES (
    p_school_id,
    p_student_id,
    p_bill_id,
    p_amount,
    p_payment_method,
    p_reference,
    'verified',
    p_recorded_by,
    p_idempotency_key
  ) RETURNING id INTO v_payment_id;

  -- Update student bill balance atomically
  UPDATE student_bills
  SET 
    paid_amount = paid_amount + p_amount,
    balance = v_new_balance,
    status = CASE 
      WHEN v_new_balance = 0 THEN 'paid'
      WHEN v_new_balance < v_current_balance THEN 'partial'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_bill_id;

  -- Return result
  RETURN QUERY SELECT v_payment_id, v_new_balance;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION record_payment_transaction TO authenticated;

-- ============================================================================
-- Add idempotency_key column to payments if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE payments ADD COLUMN idempotency_key TEXT UNIQUE;
    CREATE INDEX idx_payments_idempotency ON payments(idempotency_key);
  END IF;
END $$;
