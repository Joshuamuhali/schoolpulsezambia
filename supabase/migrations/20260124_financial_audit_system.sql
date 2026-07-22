-- ============================================================================
-- COMPREHENSIVE FINANCIAL AUDIT & APPROVAL SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCHOOL FEE STRUCTURES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('tuition', 'boarding', 'transport', 'uniform', 'meals', 'activities', 'other')),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'term', 'yearly', 'one_time')),
  is_mandatory BOOLEAN DEFAULT true,
  applicable_grades UUID[], -- Array of grade IDs
  applicable_classes UUID[], -- Array of class IDs
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_fee_structures_school_id ON school_fee_structures(school_id);
CREATE INDEX idx_school_fee_structures_status ON school_fee_structures(status);

-- ----------------------------------------------------------------------------
-- 2. STUDENT INVOICES (School Fees)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  
  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Fee breakdown
  fee_items JSONB NOT NULL, -- Array of {fee_structure_id, name, amount}
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  discount_reason TEXT,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Payment tracking
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  balance DECIMAL(10, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
  
  -- Payment reference
  payment_id UUID, -- Can reference subscription_payments or student_payments
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(school_id, invoice_number)
);

CREATE INDEX idx_student_invoices_school_id ON student_invoices(school_id);
CREATE INDEX idx_student_invoices_student_id ON student_invoices(student_id);
CREATE INDEX idx_student_invoices_status ON student_invoices(status);
CREATE INDEX idx_student_invoices_due_date ON student_invoices(due_date);
CREATE INDEX idx_student_invoices_created_at ON student_invoices(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. STUDENT PAYMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES student_invoices(id) ON DELETE SET NULL,
  
  -- Payment details
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'airtel_money', 'mtn_money', 'zamtel_money', 'cheque', 'other')),
  reference_number TEXT,
  payment_date DATE NOT NULL,
  payment_time TIME NOT NULL,
  
  -- Payer information
  payer_name TEXT NOT NULL,
  payer_phone TEXT,
  payer_email TEXT,
  relationship TEXT CHECK (relationship IN ('student', 'parent', 'guardian', 'sponsor', 'other')),
  
  -- Receipt
  receipt_number TEXT UNIQUE,
  receipt_url TEXT,
  
  -- Status and approval
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_payments_school_id ON student_payments(school_id);
CREATE INDEX idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX idx_student_payments_invoice_id ON student_payments(invoice_id);
CREATE INDEX idx_student_payments_status ON student_payments(status);
CREATE INDEX idx_student_payments_payment_date ON student_payments(payment_date DESC);
CREATE INDEX idx_student_payments_receipt_number ON student_payments(receipt_number);

-- ----------------------------------------------------------------------------
-- 4. PAYMENT ALLOCATIONS (Track which invoices a payment covers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES student_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES student_invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_payment_allocations_school_id ON payment_allocations(school_id);
CREATE INDEX idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- ----------------------------------------------------------------------------
-- 5. COMPREHENSIVE AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What happened
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'school', 'student', 'teacher', 'invoice', 'payment', 'subscription',
    'feature', 'user', 'attendance', 'exam', 'fee_structure'
  )),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'approved', 'rejected', 'activated',
    'deactivated', 'suspended', 'paid', 'refunded', 'cancelled', 'viewed'
  )),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  changes JSONB, -- Computed diff
  
  -- Context
  description TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  
  -- Who did it
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_performed_at ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ----------------------------------------------------------------------------
-- 6. FINANCIAL TRANSACTIONS (Unified ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Transaction details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'subscription_payment', 'student_payment', 'refund', 'adjustment', 'fee_waiver'
  )),
  transaction_date DATE NOT NULL,
  
  -- Amounts
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZMW',
  
  -- Related records
  reference_type TEXT NOT NULL CHECK (reference_type IN (
    'subscription_payment', 'student_payment', 'invoice', 'adjustment'
  )),
  reference_id UUID NOT NULL,
  
  -- Categorization
  category TEXT NOT NULL CHECK (category IN (
    'subscription', 'tuition', 'boarding', 'transport', 'uniform', 'meals',
    'activities', 'other_income', 'refund', 'adjustment', 'fee_waiver'
  )),
  subcategory TEXT,
  
  -- Payment details
  payment_method TEXT,
  reference_number TEXT,
  receipt_number TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Notes
  description TEXT,
  notes TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_transactions_school_id ON financial_transactions(school_id);
CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date DESC);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX idx_financial_transactions_reference ON financial_transactions(reference_type, reference_id);

-- ----------------------------------------------------------------------------
-- 7. APPROVAL WORKFLOWS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What needs approval
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'school_activation', 'subscription_payment', 'student_payment',
    'invoice_cancellation', 'fee_waiver', 'refund'
  )),
  entity_id UUID NOT NULL,
  
  -- Workflow details
  workflow_type TEXT NOT NULL CHECK (workflow_type IN (
    'school_onboarding', 'payment_verification', 'manual_adjustment'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_review', 'approved', 'rejected', 'cancelled'
  )),
  
  -- Assignment
  assigned_to UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  
  -- Decision
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'escalated')),
  decision_reason TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  
  -- Escalation
  escalated_from UUID REFERENCES auth.users(id),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_workflows_school_id ON approval_workflows(school_id);
CREATE INDEX idx_approval_workflows_status ON approval_workflows(status);
CREATE INDEX idx_approval_workflows_assigned_to ON approval_workflows(assigned_to);
CREATE INDEX idx_approval_workflows_priority ON approval_workflows(priority);
CREATE INDEX idx_approval_workflows_created_at ON approval_workflows(created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Recipient
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('user', 'school', 'admin')),
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'school_activation_request', 'payment_received', 'payment_verified',
    'payment_rejected', 'invoice_generated', 'invoice_overdue',
    'subscription_expiring', 'subscription_expired', 'approval_assigned',
    'approval_escalated', 'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Channels
  channels JSONB DEFAULT '["in_app"]'::jsonb, -- ["in_app", "email", "sms"]
  
  -- Related entity
  entity_type TEXT,
  entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Action
  action_url TEXT,
  action_label TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_school_id ON notifications(school_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE school_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- School fee structures: School can manage own, admin can view all
CREATE POLICY "Schools can manage own fee structures"
  ON school_fee_structures FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can view all fee structures"
  ON school_fee_structures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Student invoices: School can manage own, admin can view all
CREATE POLICY "Schools can manage own invoices"
  ON student_invoices FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can view all invoices"
  ON student_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Student payments: School can manage own, admin can view all
CREATE POLICY "Schools can manage own payments"
  ON student_payments FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can view all payments"
  ON student_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Payment allocations: Same as payments
CREATE POLICY "Schools can view own payment allocations"
  ON payment_allocations FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can view all payment allocations"
  ON payment_allocations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Audit logs: School can view own, admin can view all
CREATE POLICY "Schools can view own audit logs"
  ON audit_logs FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR
    school_id IS NULL -- Platform-level logs
  );

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Financial transactions: School can view own, admin can manage all
CREATE POLICY "Schools can view own transactions"
  ON financial_transactions FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage all transactions"
  ON financial_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Approval workflows: School can view own, admin can manage all
CREATE POLICY "Schools can view own approval workflows"
  ON approval_workflows FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM school_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Admins can manage all approval workflows"
  ON approval_workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

-- Notifications: Users can view own
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    recipient_type = 'admin' AND EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() AND is_super_admin = true
    )
  );

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 10. FUNCTIONS AND TRIGGERS
-- ----------------------------------------------------------------------------

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_school_fee_structures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_school_fee_structures_updated_at
  BEFORE UPDATE ON school_fee_structures
  FOR EACH ROW EXECUTE FUNCTION update_school_fee_structures_updated_at();

CREATE OR REPLACE FUNCTION update_student_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_invoices_updated_at
  BEFORE UPDATE ON student_invoices
  FOR EACH ROW EXECUTE FUNCTION update_student_invoices_updated_at();

CREATE OR REPLACE FUNCTION update_student_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_payments_updated_at
  BEFORE UPDATE ON student_payments
  FOR EACH ROW EXECUTE FUNCTION update_student_payments_updated_at();

CREATE OR REPLACE FUNCTION update_financial_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_financial_transactions_updated_at();

CREATE OR REPLACE FUNCTION update_approval_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_approval_workflows_updated_at
  BEFORE UPDATE ON approval_workflows
  FOR EACH ROW EXECUTE FUNCTION update_approval_workflows_updated_at();

-- Auto-generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  receipt_num TEXT;
  year TEXT;
  seq INTEGER;
BEGIN
  year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO seq
  FROM student_payments
  WHERE receipt_number LIKE 'RCPT-' || year || '-%';
  
  receipt_num := 'RCPT-' || year || '-' || LPAD(seq::TEXT, 6, '0');
  RETURN receipt_num;
END;
$$;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_school_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  invoice_num TEXT;
  school_slug TEXT;
  seq INTEGER;
BEGIN
  SELECT slug INTO school_slug FROM tenants WHERE id = p_school_id;
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO seq
  FROM student_invoices
  WHERE school_id = p_school_id;
  
  invoice_num := UPPER(school_slug) || '-INV-' || LPAD(seq::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- Approve student payment
CREATE OR REPLACE FUNCTION approve_student_payment(
  p_payment_id UUID,
  p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment student_payments%ROWTYPE;
  v_invoice student_invoices%ROWTYPE;
  v_total_paid DECIMAL(10, 2);
BEGIN
  -- Get payment details
  SELECT * INTO v_payment FROM student_payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- Update payment status
  UPDATE student_payments
  SET status = 'approved',
      approved_by = p_approved_by,
      approved_at = NOW(),
      receipt_number = generate_receipt_number(),
      updated_at = NOW()
  WHERE id = p_payment_id;

  -- If linked to invoice, update invoice
  IF v_payment.invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice FROM student_invoices WHERE id = v_payment.invoice_id;
    
    -- Calculate total paid for this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM student_payments
    WHERE invoice_id = v_payment.invoice_id
      AND status = 'approved';
    
    -- Update invoice
    UPDATE student_invoices
    SET amount_paid = v_total_paid,
        status = CASE
          WHEN v_total_paid >= total_amount THEN 'paid'
          WHEN v_total_paid > 0 THEN 'partial'
          ELSE status
        END,
        paid_at = CASE
          WHEN v_total_paid >= total_amount THEN NOW()
          ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = v_payment.invoice_id;
  END IF;

  -- Create financial transaction
  INSERT INTO financial_transactions (
    school_id,
    transaction_type,
    transaction_date,
    amount,
    reference_type,
    reference_id,
    category,
    payment_method,
    reference_number,
    receipt_number,
    status,
    created_by
  ) VALUES (
    v_payment.school_id,
    'student_payment',
    v_payment.payment_date,
    v_payment.amount,
    'student_payment',
    v_payment.id,
    'tuition', -- TODO: Make this dynamic based on invoice items
    v_payment.payment_method,
    v_payment.reference_number,
    v_payment.receipt_number,
    'completed',
    p_approved_by
  );
END;
$$;

-- Reject student payment
CREATE OR REPLACE FUNCTION reject_student_payment(
  p_payment_id UUID,
  p_rejection_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE student_payments
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      updated_at = NOW()
  WHERE id = p_payment_id;
END;
$$;

-- Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_school_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT auth.uid(),
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    school_id,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values,
    description,
    performed_by,
    metadata
  ) VALUES (
    p_school_id,
    p_entity_type,
    p_entity_id,
    p_action,
    p_old_values,
    p_new_values,
    p_description,
    p_performed_by,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_school_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_channels JSONB DEFAULT '["in_app"]'::jsonb,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    school_id,
    user_id,
    recipient_type,
    type,
    title,
    message,
    channels,
    entity_type,
    entity_id,
    action_url,
    action_label
  ) VALUES (
    p_school_id,
    p_user_id,
    'user',
    p_type,
    p_title,
    p_message,
    p_channels,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_action_label
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. COMMENTS
-- ----------------------------------------------------------------------------

COMMENT ON TABLE school_fee_structures IS 'Fee structures for school billing';
COMMENT ON TABLE student_invoices IS 'Student fee invoices';
COMMENT ON TABLE student_payments IS 'Student payment submissions';
COMMENT ON TABLE payment_allocations IS 'Allocation of payments to invoices';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all actions';
COMMENT ON TABLE financial_transactions IS 'Unified financial transaction ledger';
COMMENT ON TABLE approval_workflows IS 'Approval workflow tracking';
COMMENT ON TABLE notifications IS 'User notifications';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================