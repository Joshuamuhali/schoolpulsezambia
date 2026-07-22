-- ============================================================================
-- STUDENT LIFE CYCLE — TRANSFERS, WITHDRAWALS, PROMOTIONS, GRADUATION
-- ============================================================================

-- ============================================================================
-- 1. STUDENT TRANSFERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Transfer details
    transfer_type TEXT NOT NULL CHECK (
        transfer_type IN ('incoming', 'outgoing', 'internal')
    ),
    from_school_id UUID REFERENCES schools(id),
    to_school_id UUID REFERENCES schools(id),
    from_grade_id UUID REFERENCES grades(id),
    to_grade_id UUID REFERENCES grades(id),
    from_class_id UUID REFERENCES classes(id),
    to_class_id UUID REFERENCES classes(id),
    
    -- Academic context
    academic_year_id UUID REFERENCES academic_years(id),
    term_id UUID REFERENCES academic_terms(id),
    
    -- Transfer date
    transfer_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    
    -- Reason
    reason TEXT,
    notes TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')
    ),
    
    -- Documents
    transfer_documents TEXT[],
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, transfer_date)
);

-- ============================================================================
-- 2. STUDENT WITHDRAWALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Withdrawal details
    withdrawal_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT NOT NULL,
    reason_category TEXT CHECK (
        reason_category IN ('academic', 'financial', 'disciplinary', 'medical', 'relocation', 'other')
    ),
    
    -- Academic context
    academic_year_id UUID REFERENCES academic_years(id),
    term_id UUID REFERENCES academic_terms(id),
    grade_id UUID REFERENCES grades(id),
    class_id UUID REFERENCES classes(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')
    ),
    
    -- Clearance
    fees_cleared BOOLEAN DEFAULT FALSE,
    books_returned BOOLEAN DEFAULT FALSE,
    library_cleared BOOLEAN DEFAULT FALSE,
    other_clearances JSONB DEFAULT '{}',
    
    -- Documents
    withdrawal_documents TEXT[],
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, withdrawal_date)
);

-- ============================================================================
-- 3. STUDENT PROMOTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Promotion details
    from_grade_id UUID REFERENCES grades(id),
    to_grade_id UUID REFERENCES grades(id),
    from_class_id UUID REFERENCES classes(id),
    to_class_id UUID REFERENCES classes(id),
    
    -- Academic context
    from_academic_year_id UUID REFERENCES academic_years(id),
    to_academic_year_id UUID REFERENCES academic_years(id),
    
    -- Promotion date
    promotion_date DATE NOT NULL,
    
    -- Performance
    overall_grade TEXT,
    attendance_percentage DECIMAL(5,2),
    remarks TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'promoted', 'retained', 'conditional', 'graduated')
    ),
    
    -- Retention details (if retained)
    retention_reason TEXT,
    retention_period TEXT CHECK (
        retention_period IN ('term', 'semester', 'year')
    ),
    
    -- Graduation details (if graduated)
    graduated_at TIMESTAMPTZ,
    certificate_number TEXT,
    certificate_issued BOOLEAN DEFAULT FALSE,
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, from_academic_year_id, to_academic_year_id)
);

-- ============================================================================
-- 4. STUDENT RE-ENROLLMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_reenrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Re-enrollment details
    reenrollment_date DATE NOT NULL,
    academic_year_id UUID REFERENCES academic_years(id),
    grade_id UUID REFERENCES grades(id),
    class_id UUID REFERENCES classes(id),
    
    -- Previous academic year (if returning after absence)
    previous_academic_year_id UUID REFERENCES academic_years(id),
    absence_reason TEXT,
    absence_duration_months INTEGER,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')
    ),
    
    -- Fees
    fees_paid BOOLEAN DEFAULT FALSE,
    fee_amount DECIMAL(10,2),
    fee_payment_date DATE,
    
    -- Documents
    reenrollment_documents TEXT[],
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, academic_year_id)
);

-- ============================================================================
-- 5. STUDENT ARCHIVING
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Archive details
    archive_date DATE NOT NULL,
    archive_reason TEXT,
    
    -- Snapshot of student data at archive time
    student_snapshot JSONB NOT NULL,
    enrollment_snapshot JSONB,
    academic_snapshot JSONB,
    financial_snapshot JSONB,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'archived' CHECK (
        status IN ('archived', 'restored', 'deleted')
    ),
    
    -- Restoration (if restored)
    restored_at TIMESTAMPTZ,
    restored_by UUID REFERENCES auth.users(id),
    
    -- Audit
    archived_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, archive_date)
);

-- ============================================================================
-- 6. STUDENT DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Document details
    document_type TEXT NOT NULL CHECK (
        document_type IN ('birth_certificate', 'medical_record', 'report_card', 'transfer_certificate', 'id_card', 'photo', 'other')
    ),
    document_name TEXT NOT NULL,
    document_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    
    -- Metadata
    description TEXT,
    expiry_date DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'expired', 'revoked', 'archived')
    ),
    
    -- Audit
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. STUDENT ID GENERATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_id_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    
    -- Sequence details
    academic_year_id UUID REFERENCES academic_years(id),
    grade_id UUID REFERENCES grades(id),
    prefix TEXT,
    current_number INTEGER DEFAULT 1,
    padding_length INTEGER DEFAULT 4,
    
    -- Format: PREFIX-YEAR-GRADE-NUMBER
    format_template TEXT DEFAULT '{prefix}-{year}-{grade}-{number:04d}',
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Student transfers
CREATE INDEX IF NOT EXISTS idx_student_transfers_school_id ON student_transfers(school_id);
CREATE INDEX IF NOT EXISTS idx_student_transfers_student_id ON student_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_transfers_status ON student_transfers(status);
CREATE INDEX IF NOT EXISTS idx_student_transfers_transfer_date ON student_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_student_transfers_academic_year_id ON student_transfers(academic_year_id);

-- Student withdrawals
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_school_id ON student_withdrawals(school_id);
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_student_id ON student_withdrawals(student_id);
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_status ON student_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_withdrawal_date ON student_withdrawals(withdrawal_date);
CREATE INDEX IF NOT EXISTS idx_student_withdrawals_academic_year_id ON student_withdrawals(academic_year_id);

-- Student promotions
CREATE INDEX IF NOT EXISTS idx_student_promotions_school_id ON student_promotions(school_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_student_id ON student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_status ON student_promotions(status);
CREATE INDEX IF NOT EXISTS idx_student_promotions_promotion_date ON student_promotions(promotion_date);
CREATE INDEX IF NOT EXISTS idx_student_promotions_from_academic_year_id ON student_promotions(from_academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_to_academic_year_id ON student_promotions(to_academic_year_id);

-- Student re-enrollments
CREATE INDEX IF NOT EXISTS idx_student_reenrollments_school_id ON student_reenrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_student_reenrollments_student_id ON student_reenrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_reenrollments_status ON student_reenrollments(status);
CREATE INDEX IF NOT EXISTS idx_student_reenrollments_academic_year_id ON student_reenrollments(academic_year_id);

-- Student archives
CREATE INDEX IF NOT EXISTS idx_student_archives_school_id ON student_archives(school_id);
CREATE INDEX IF NOT EXISTS idx_student_archives_student_id ON student_archives(student_id);
CREATE INDEX IF NOT EXISTS idx_student_archives_status ON student_archives(status);
CREATE INDEX IF NOT EXISTS idx_student_archives_archive_date ON student_archives(archive_date);

-- Student documents
CREATE INDEX IF NOT EXISTS idx_student_documents_school_id ON student_documents(school_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_document_type ON student_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_student_documents_status ON student_documents(status);

-- Student ID sequences
CREATE INDEX IF NOT EXISTS idx_student_id_sequences_school_id ON student_id_sequences(school_id);
CREATE INDEX IF NOT EXISTS idx_student_id_sequences_academic_year_id ON student_id_sequences(academic_year_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER student_transfers_updated_at BEFORE UPDATE ON student_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_withdrawals_updated_at BEFORE UPDATE ON student_withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_promotions_updated_at BEFORE UPDATE ON student_promotions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_reenrollments_updated_at BEFORE UPDATE ON student_reenrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_archives_updated_at BEFORE UPDATE ON student_archives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_documents_updated_at BEFORE UPDATE ON student_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_id_sequences_updated_at BEFORE UPDATE ON student_id_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Student Transfers
ALTER TABLE student_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage transfers" ON student_transfers
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view transfers" ON student_transfers
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'teacher')
    );

-- Student Withdrawals
ALTER TABLE student_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage withdrawals" ON student_withdrawals
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view withdrawals" ON student_withdrawals
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'teacher')
    );

-- Student Promotions
ALTER TABLE student_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage promotions" ON student_promotions
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view promotions" ON student_promotions
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'teacher')
    );

-- Student Re-enrollments
ALTER TABLE student_reenrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage reenrollments" ON student_reenrollments
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

-- Student Archives
ALTER TABLE student_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage archives" ON student_archives
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

-- Student Documents
ALTER TABLE student_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage documents" ON student_documents
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view documents" ON student_documents
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'teacher')
    );

CREATE POLICY "Parents can view own documents" ON student_documents
    FOR SELECT USING (
        student_id IN (
            SELECT student_id FROM student_guardians 
            WHERE parent_id IN (SELECT id FROM parent_profiles WHERE user_id = auth.uid())
        )
    );

-- Student ID Sequences
ALTER TABLE student_id_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage id sequences" ON student_id_sequences
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate student ID
CREATE OR REPLACE FUNCTION generate_student_id(p_school_id UUID, p_academic_year_id UUID, p_grade_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year TEXT;
    v_grade_name TEXT;
    v_current_number INTEGER;
    v_padding INTEGER;
    v_format TEXT;
    v_student_id TEXT;
BEGIN
    -- Get sequence settings
    SELECT 
        COALESCE(prefix, 'STU'),
        COALESCE(padding_length, 4),
        COALESCE(format_template, '{prefix}-{year}-{grade}-{number:04d}')
    INTO v_prefix, v_padding, v_format
    FROM student_id_sequences
    WHERE school_id = p_school_id
    AND academic_year_id = p_academic_year_id
    AND grade_id = p_grade_id;
    
    -- If no sequence exists, create default
    IF NOT FOUND THEN
        v_prefix := 'STU';
        v_padding := 4;
        v_format := '{prefix}-{year}-{grade}-{number:04d}';
        
        INSERT INTO student_id_sequences (school_id, academic_year_id, grade_id, prefix, padding_length, format_template)
        VALUES (p_school_id, p_academic_year_id, p_grade_id, v_prefix, v_padding, v_format);
        
        v_current_number := 1;
    ELSE
        -- Increment current number
        UPDATE student_id_sequences
        SET current_number = current_number + 1,
            updated_at = NOW()
        WHERE school_id = p_school_id
        AND academic_year_id = p_academic_year_id
        AND grade_id = p_grade_id
        RETURNING current_number INTO v_current_number;
    END IF;
    
    -- Get year and grade name
    SELECT name INTO v_year FROM academic_years WHERE id = p_academic_year_id;
    SELECT name INTO v_grade_name FROM grades WHERE id = p_grade_id;
    
    -- Format student ID
    v_student_id := format(v_format, 
        v_prefix, 
        v_year, 
        v_grade_name, 
        LPAD(v_current_number::TEXT, v_padding, '0')
    );
    
    RETURN v_student_id;
END;
$$ LANGUAGE plpgsql;

-- Function to promote students (batch)
CREATE OR REPLACE FUNCTION promote_students_batch(
    p_school_id UUID,
    p_from_academic_year_id UUID,
    p_to_academic_year_id UUID,
    p_promotion_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Promote all students from previous year
    INSERT INTO student_promotions (
        school_id,
        student_id,
        from_grade_id,
        to_grade_id,
        from_class_id,
        to_class_id,
        from_academic_year_id,
        to_academic_year_id,
        promotion_date,
        status,
        approved_by,
        approved_at
    )
    SELECT 
        s.school_id,
        s.id,
        s.grade_id,
        (SELECT id FROM grades WHERE school_id = s.school_id AND order = (SELECT order + 1 FROM grades WHERE id = s.grade_id)),
        s.class_id,
        (SELECT id FROM classes WHERE grade_id = (SELECT id FROM grades WHERE school_id = s.school_id AND order = (SELECT order + 1 FROM grades WHERE id = s.grade_id)) AND name = (SELECT name FROM classes WHERE id = s.class_id)),
        p_from_academic_year_id,
        p_to_academic_year_id,
        p_promotion_date,
        'promoted',
        auth.uid(),
        NOW()
    FROM students s
    WHERE s.school_id = p_school_id
    AND s.grade_id IS NOT NULL
    AND s.status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM student_promotions sp
        WHERE sp.student_id = s.id
        AND sp.to_academic_year_id = p_to_academic_year_id
    );
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Update student grade and class
    UPDATE students s
    SET 
        grade_id = (SELECT id FROM grades WHERE school_id = s.school_id AND order = (SELECT order + 1 FROM grades WHERE id = s.grade_id)),
        class_id = (SELECT id FROM classes WHERE grade_id = (SELECT id FROM grades WHERE school_id = s.school_id AND order = (SELECT order + 1 FROM grades WHERE id = s.grade_id)) AND name = (SELECT name FROM classes WHERE id = s.class_id)),
        updated_at = NOW()
    WHERE s.school_id = p_school_id
    AND s.grade_id IS NOT NULL
    AND s.status = 'active';
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
