-- ============================================================================
-- TEACHER ONBOARDING — COMPLETE DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- 1. TEACHER INVITATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Teacher details
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    specialization TEXT,
    qualifications TEXT,
    employment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (
        employment_type IN ('permanent', 'contract', 'temporary', 'intern', 'volunteer')
    ),
    
    -- Invitation details
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'expired', 'cancelled')
    ),
    
    -- Tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    
    -- Audit
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(school_id, email)
);

-- ============================================================================
-- 2. STAFF PROFILES (Enhanced)
-- ============================================================================

-- Add growth_model column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff_profiles' 
        AND column_name = 'growth_model'
    ) THEN
        ALTER TABLE staff_profiles ADD COLUMN growth_model TEXT DEFAULT 'floating' CHECK (
            growth_model IN ('fixed', 'floating', 'hybrid')
        );
    END IF;
END $$;

-- ============================================================================
-- 3. TEACHER ASSIGNMENTS (MUTABLE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    grade_id UUID REFERENCES grades(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    
    -- Academic context
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
    
    -- Assignment type
    assignment_type TEXT NOT NULL DEFAULT 'subject_teacher' CHECK (
        assignment_type IN ('class_teacher', 'subject_teacher', 'assistant_teacher', 'relief_teacher')
    ),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive', 'pending', 'archived')
    ),
    
    -- Teacher growth settings (per assignment)
    growth_model TEXT DEFAULT 'floating' CHECK (
        growth_model IN ('fixed', 'floating', 'hybrid')
    ),
    is_primary BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 1,
    workload_percentage DECIMAL(5,2) DEFAULT 100,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(school_id, teacher_id, grade_id, class_id, subject_id, academic_year_id)
);

-- ============================================================================
-- 4. TEACHER ACADEMIC PROGRESSION (For floating model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    
    -- Current year
    current_academic_year_id UUID REFERENCES academic_years(id),
    current_grade_id UUID REFERENCES grades(id),
    current_class_id UUID REFERENCES classes(id),
    
    -- Next year (auto-calculated for floating model)
    next_academic_year_id UUID REFERENCES academic_years(id),
    next_grade_id UUID REFERENCES grades(id),
    next_class_id UUID REFERENCES classes(id),
    
    -- Student cohort (students that move with teacher)
    student_ids UUID[] DEFAULT '{}',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'pending', 'completed', 'cancelled')
    ),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(school_id, teacher_id, current_academic_year_id)
);

-- ============================================================================
-- 5. SCHOOL SETTINGS (Teacher assignment model)
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_teacher_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
    
    -- Default teacher growth model for the school
    default_growth_model TEXT NOT NULL DEFAULT 'floating' CHECK (
        default_growth_model IN ('fixed', 'floating', 'hybrid')
    ),
    
    -- Auto-assignment settings
    auto_assign_on_accept BOOLEAN DEFAULT FALSE,
    notify_principal_on_registration BOOLEAN DEFAULT TRUE,
    require_principal_approval BOOLEAN DEFAULT TRUE,
    
    -- Year-end transition
    auto_promote_teachers BOOLEAN DEFAULT TRUE,
    auto_assign_new_students BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings for each school (triggered on school creation)
CREATE OR REPLACE FUNCTION create_school_teacher_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO school_teacher_settings (school_id)
    VALUES (NEW.id)
    ON CONFLICT (school_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_school_teacher_settings ON schools;
CREATE TRIGGER trigger_create_school_teacher_settings
    AFTER INSERT ON schools
    FOR EACH ROW
    EXECUTE FUNCTION create_school_teacher_settings();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Teacher invitations indexes
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_school_id ON teacher_invitations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_token ON teacher_invitations(token);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_status ON teacher_invitations(status);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_email ON teacher_invitations(email);
CREATE INDEX IF NOT EXISTS idx_teacher_invitations_expires_at ON teacher_invitations(expires_at);

-- Staff profiles indexes
CREATE INDEX IF NOT EXISTS idx_staff_profiles_growth_model ON staff_profiles(growth_model);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON staff_profiles(status);

-- Teacher assignments indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_id ON teacher_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_grade_id ON teacher_assignments(grade_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class_id ON teacher_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_academic_year_id ON teacher_assignments(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_status ON teacher_assignments(status);

-- Teacher progression indexes
CREATE INDEX IF NOT EXISTS idx_teacher_progression_school_id ON teacher_progression(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_progression_teacher_id ON teacher_progression(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_progression_current_academic_year_id ON teacher_progression(current_academic_year_id);

-- School teacher settings indexes
CREATE INDEX IF NOT EXISTS idx_school_teacher_settings_school_id ON school_teacher_settings(school_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER teacher_invitations_updated_at BEFORE UPDATE ON teacher_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_assignments_updated_at BEFORE UPDATE ON teacher_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER teacher_progression_updated_at BEFORE UPDATE ON teacher_progression
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER school_teacher_settings_updated_at BEFORE UPDATE ON school_teacher_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES — TEACHER ONBOARDING
-- ============================================================================

-- Teacher Invitations
ALTER TABLE teacher_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage teacher invitations" ON teacher_invitations
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view own invitations" ON teacher_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Staff Profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage staff" ON staff_profiles
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal', 'bursar'))
    );

CREATE POLICY "Teachers can view own profile" ON staff_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Teachers can update own profile" ON staff_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Teacher Assignments
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage assignments" ON teacher_assignments
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view own assignments" ON teacher_assignments
    FOR SELECT USING (teacher_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view school assignments" ON teacher_assignments
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role = 'teacher')
    );

-- Teacher Progression
ALTER TABLE teacher_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage progression" ON teacher_progression
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view own progression" ON teacher_progression
    FOR SELECT USING (teacher_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid()));

-- School Teacher Settings
ALTER TABLE school_teacher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage teacher settings" ON school_teacher_settings
    FOR ALL USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid() AND role IN ('admin', 'principal'))
    );

CREATE POLICY "Teachers can view settings" ON school_teacher_settings
    FOR SELECT USING (
        school_id IN (SELECT school_id FROM school_members WHERE user_id = auth.uid())
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_teacher_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to validate teacher invitation token
CREATE OR REPLACE FUNCTION validate_teacher_invitation_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    school_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    specialization TEXT,
    qualifications TEXT,
    employment_type TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ti.id,
        ti.school_id,
        ti.email,
        ti.first_name,
        ti.last_name,
        ti.phone,
        ti.specialization,
        ti.qualifications,
        ti.employment_type,
        ti.status,
        ti.expires_at
    FROM teacher_invitations ti
    WHERE ti.token = p_token
    AND ti.status = 'pending'
    AND ti.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark teacher invitation as accepted
CREATE OR REPLACE FUNCTION accept_teacher_invitation(p_token TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE teacher_invitations
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher invitation statistics
CREATE OR REPLACE FUNCTION get_teacher_invitation_stats(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_accepted INTEGER;
    v_expired INTEGER;
BEGIN
    SELECT 
        COUNT(*) INTO v_total
    FROM teacher_invitations
    WHERE school_id = p_school_id;
    
    SELECT 
        COUNT(*) INTO v_pending
    FROM teacher_invitations
    WHERE school_id = p_school_id AND status = 'pending';
    
    SELECT 
        COUNT(*) INTO v_accepted
    FROM teacher_invitations
    WHERE school_id = p_school_id AND status = 'accepted';
    
    SELECT 
        COUNT(*) INTO v_expired
    FROM teacher_invitations
    WHERE school_id = p_school_id AND status = 'expired';
    
    RETURN jsonb_build_object(
        'total', v_total,
        'pending', v_pending,
        'accepted', v_accepted,
        'expired', v_expired
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get pending teachers for assignment
CREATE OR REPLACE FUNCTION get_pending_teachers(p_school_id UUID)
RETURNS TABLE (
    teacher_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    specialization TEXT,
    qualifications TEXT,
    employment_type TEXT,
    accepted_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.first_name,
        sp.last_name,
        sp.email,
        sp.specialization,
        sp.qualifications,
        sp.employment_type,
        ti.accepted_at
    FROM staff_profiles sp
    JOIN teacher_invitations ti ON sp.email = ti.email AND sp.school_id = ti.school_id
    WHERE sp.school_id = p_school_id
    AND sp.status = 'active'
    AND ti.status = 'accepted'
    AND NOT EXISTS (
        SELECT 1 FROM teacher_assignments ta
        WHERE ta.teacher_id = sp.id
        AND ta.status = 'active'
    )
    ORDER BY ti.accepted_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to create teacher assignment
CREATE OR REPLACE FUNCTION create_teacher_assignment(
    p_school_id UUID,
    p_teacher_id UUID,
    p_grade_id UUID,
    p_class_id UUID,
    p_subject_id UUID,
    p_academic_year_id UUID,
    p_assignment_type TEXT,
    p_growth_model TEXT,
    p_created_by UUID REFERENCES auth.users(id)
)
RETURNS UUID AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    INSERT INTO teacher_assignments (
        school_id,
        teacher_id,
        grade_id,
        class_id,
        subject_id,
        academic_year_id,
        assignment_type,
        growth_model,
        created_by
    )
    VALUES (
        p_school_id,
        p_teacher_id,
        p_grade_id,
        p_class_id,
        p_subject_id,
        p_academic_year_id,
        p_assignment_type,
        p_growth_model,
        p_created_by
    )
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher's assigned students
CREATE OR REPLACE FUNCTION get_teacher_assigned_students(p_teacher_id UUID, p_academic_year_id UUID)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    admission_number TEXT,
    grade_id UUID,
    grade_name TEXT,
    class_id UUID,
    class_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.first_name || ' ' || s.last_name as student_name,
        s.admission_number,
        g.id as grade_id,
        g.name as grade_name,
        c.id as class_id,
        c.name as class_name
    FROM teacher_assignments ta
    JOIN students s ON (
        (ta.class_id IS NOT NULL AND s.class_id = ta.class_id)
        OR (ta.grade_id IS NOT NULL AND s.grade_id = ta.grade_id)
    )
    LEFT JOIN grades g ON s.grade_id = g.id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE ta.teacher_id = p_teacher_id
    AND ta.academic_year_id = p_academic_year_id
    AND ta.status = 'active'
    AND s.status = 'active'
    ORDER BY c.name, s.last_name, s.first_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get teacher workload
CREATE OR REPLACE FUNCTION get_teacher_workload(p_school_id UUID, p_academic_year_id UUID)
RETURNS TABLE (
    teacher_id UUID,
    teacher_name TEXT,
    class_count INTEGER,
    student_count INTEGER,
    subject_count INTEGER,
    workload_percentage DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.id,
        sp.first_name || ' ' || sp.last_name as teacher_name,
        COUNT(DISTINCT ta.class_id) as class_count,
        COUNT(DISTINCT s.id) as student_count,
        COUNT(DISTINCT ta.subject_id) as subject_count,
        AVG(ta.workload_percentage) as workload_percentage
    FROM teacher_assignments ta
    JOIN staff_profiles sp ON ta.teacher_id = sp.id
    LEFT JOIN students s ON (
        (ta.class_id IS NOT NULL AND s.class_id = ta.class_id)
        OR (ta.grade_id IS NOT NULL AND s.grade_id = ta.grade_id)
    )
    WHERE ta.school_id = p_school_id
    AND ta.academic_year_id = p_academic_year_id
    AND ta.status = 'active'
    GROUP BY sp.id, sp.first_name, sp.last_name
    ORDER BY sp.last_name, sp.first_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
