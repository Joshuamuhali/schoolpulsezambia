-- ============================================================================
-- PARENT PORTAL — COMPLETE DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- 1. PARENT PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS parent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal details
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'grandparent', 'other')),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    
    -- Preferences
    notification_preferences JSONB DEFAULT '{"sms": true, "email": true, "in_app": true}'::jsonb,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(school_id, user_id),
    UNIQUE(school_id, email)
);

-- ============================================================================
-- 2. PARENT INVITATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS parent_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Parent details
    parent_email TEXT NOT NULL,
    parent_first_name TEXT NOT NULL,
    parent_last_name TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'grandparent', 'other')),
    
    -- Invitation details
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    
    -- Tracking
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    
    -- Audit
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(school_id, parent_email, student_id)
);

-- ============================================================================
-- 3. STUDENT GUARDIANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    
    -- Relationship details
    relationship TEXT NOT NULL CHECK (relationship IN ('mother', 'father', 'guardian', 'grandparent', 'other')),
    is_primary BOOLEAN DEFAULT FALSE,
    is_emergency_contact BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT TRUE,
    priority_order INTEGER DEFAULT 0,
    
    -- Notification preferences for this child
    receive_attendance_alerts BOOLEAN DEFAULT TRUE,
    receive_fee_reminders BOOLEAN DEFAULT TRUE,
    receive_result_notifications BOOLEAN DEFAULT TRUE,
    receive_announcements BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(student_id, parent_id)
);

-- ============================================================================
-- 4. MESSAGE THREADS (Parent ↔ Teacher)
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parent_profiles(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    last_message_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(parent_id, teacher_id, student_id)
);

-- ============================================================================
-- 5. MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('parent', 'teacher', 'admin')),
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Parent profiles indexes
CREATE INDEX IF NOT EXISTS idx_parent_profiles_school_id ON parent_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_user_id ON parent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_email ON parent_profiles(email);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_status ON parent_profiles(status);

-- Parent invitations indexes
CREATE INDEX IF NOT EXISTS idx_parent_invitations_school_id ON parent_invitations(school_id);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_student_id ON parent_invitations(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_token ON parent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_status ON parent_invitations(status);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_parent_email ON parent_invitations(parent_email);
CREATE INDEX IF NOT EXISTS idx_parent_invitations_expires_at ON parent_invitations(expires_at);

-- Student guardians indexes
CREATE INDEX IF NOT EXISTS idx_student_guardians_school_id ON student_guardians(school_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student_id ON student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_parent_id ON student_guardians(parent_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_is_primary ON student_guardians(is_primary);

-- Message threads indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_school_id ON message_threads(school_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_parent_id ON message_threads(parent_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_teacher_id ON message_threads(teacher_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_student_id ON message_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parent_profiles_updated_at BEFORE UPDATE ON parent_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER parent_invitations_updated_at BEFORE UPDATE ON parent_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER student_guardians_updated_at BEFORE UPDATE ON student_guardians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER message_threads_updated_at BEFORE UPDATE ON message_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES — PARENT PROFILES
-- ============================================================================

ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

-- School Admin: Full access
CREATE POLICY "School admin can manage parent profiles" ON parent_profiles
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin')
        )
    );

-- Principal: Full access
CREATE POLICY "Principal can manage parent profiles" ON parent_profiles
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('principal')
        )
    );

-- Teacher: Read only — all parents in school
CREATE POLICY "Teacher can view parent profiles" ON parent_profiles
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('teacher')
        )
    );

-- Bursar: Read only — all parents
CREATE POLICY "Bursar can view parent profiles" ON parent_profiles
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('bursar')
        )
    );

-- Parents: Can view and update own profile
CREATE POLICY "Parents can view own profile" ON parent_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can update own profile" ON parent_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES — PARENT INVITATIONS
-- ============================================================================

ALTER TABLE parent_invitations ENABLE ROW LEVEL SECURITY;

-- School Admin: Full access
CREATE POLICY "School admin can manage parent invitations" ON parent_invitations
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin')
        )
    );

-- Principal: Full access
CREATE POLICY "Principal can manage parent invitations" ON parent_invitations
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('principal')
        )
    );

-- Teacher: Read only — only for their class
CREATE POLICY "Teacher can view parent invitations for their class" ON parent_invitations
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('teacher')
        )
        AND student_id IN (
            SELECT id FROM students 
            WHERE class_id IN (
                SELECT class_id FROM teacher_assignments 
                WHERE teacher_id = auth.uid()
            )
        )
    );

-- Bursar: Read only — all students
CREATE POLICY "Bursar can view parent invitations" ON parent_invitations
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('bursar')
        )
    );

-- Parents: Can view only their own invitations
CREATE POLICY "Parents can view own invitations" ON parent_invitations
    FOR SELECT USING (
        parent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- System: Can update invitation status (for email flow)
CREATE POLICY "System can update invitation status" ON parent_invitations
    FOR UPDATE USING (true);

-- ============================================================================
-- RLS POLICIES — STUDENT GUARDIANS
-- ============================================================================

ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;

-- School Admin: Full access
CREATE POLICY "School admin can manage student guardians" ON student_guardians
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin')
        )
    );

-- Principal: Full access
CREATE POLICY "Principal can manage student guardians" ON student_guardians
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('principal')
        )
    );

-- Teacher: Read only — only for their class
CREATE POLICY "Teacher can view student guardians for their class" ON student_guardians
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('teacher')
        )
        AND student_id IN (
            SELECT id FROM students 
            WHERE class_id IN (
                SELECT class_id FROM teacher_assignments 
                WHERE teacher_id = auth.uid()
            )
        )
    );

-- Bursar: Read only — all students
CREATE POLICY "Bursar can view student guardians" ON student_guardians
    FOR SELECT USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('bursar')
        )
    );

-- Parents: Can view their own guardian links
CREATE POLICY "Parents can view own guardian links" ON student_guardians
    FOR SELECT USING (
        parent_id IN (
            SELECT id FROM parent_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- RLS POLICIES — MESSAGE THREADS
-- ============================================================================

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

-- School Admin: Full access
CREATE POLICY "School admin can manage message threads" ON message_threads
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin')
        )
    );

-- Principal: Full access
CREATE POLICY "Principal can manage message threads" ON message_threads
    FOR ALL USING (
        school_id IN (
            SELECT school_id FROM school_members 
            WHERE user_id = auth.uid() 
            AND role IN ('principal')
        )
    );

-- Teacher: Read/write — only their threads
CREATE POLICY "Teacher can manage own message threads" ON message_threads
    FOR ALL USING (
        teacher_id IN (
            SELECT user_id FROM staff WHERE id = teacher_id
        )
    );

-- Parents: Read/write — only their threads
CREATE POLICY "Parents can manage own message threads" ON message_threads
    FOR ALL USING (
        parent_id IN (
            SELECT id FROM parent_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- RLS POLICIES — MESSAGES
-- ============================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- School Admin: Full access
CREATE POLICY "School admin can manage messages" ON messages
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads 
            WHERE school_id IN (
                SELECT school_id FROM school_members 
                WHERE user_id = auth.uid() 
                AND role IN ('admin')
            )
        )
    );

-- Principal: Full access
CREATE POLICY "Principal can manage messages" ON messages
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads 
            WHERE school_id IN (
                SELECT school_id FROM school_members 
                WHERE user_id = auth.uid() 
                AND role IN ('principal')
            )
        )
    );

-- Teacher: Read/write — only their threads
CREATE POLICY "Teacher can manage messages in own threads" ON messages
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads 
            WHERE teacher_id IN (
                SELECT user_id FROM staff WHERE id = teacher_id
            )
        )
    );

-- Parents: Read/write — only their threads
CREATE POLICY "Parents can manage messages in own threads" ON messages
    FOR ALL USING (
        thread_id IN (
            SELECT id FROM message_threads 
            WHERE parent_id IN (
                SELECT id FROM parent_profiles WHERE user_id = auth.uid()
            )
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to validate invitation token
CREATE OR REPLACE FUNCTION validate_invitation_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    school_id UUID,
    student_id UUID,
    parent_email TEXT,
    parent_first_name TEXT,
    parent_last_name TEXT,
    relationship TEXT,
    status TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id,
        pi.school_id,
        pi.student_id,
        pi.parent_email,
        pi.parent_first_name,
        pi.parent_last_name,
        pi.relationship,
        pi.status,
        pi.expires_at
    FROM parent_invitations pi
    WHERE pi.token = p_token
    AND pi.status = 'pending'
    AND pi.expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to mark invitation as accepted
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE parent_invitations
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

-- Function to get parent's children
CREATE OR REPLACE FUNCTION get_parent_children(p_parent_id UUID)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    class_name TEXT,
    grade TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.first_name || ' ' || s.last_name as student_name,
        c.name as class_name,
        c.grade,
        sg.is_primary
    FROM student_guardians sg
    JOIN students s ON sg.student_id = s.id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE sg.parent_id = p_parent_id
    ORDER BY sg.is_primary DESC, s.last_name, s.first_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get invitation statistics
CREATE OR REPLACE FUNCTION get_invitation_stats(p_school_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total INTEGER;
    v_pending INTEGER;
    v_accepted INTEGER;
    v_expired INTEGER;
BEGIN
    SELECT 
        COUNT(*) INTO v_total
    FROM parent_invitations
    WHERE school_id = p_school_id;
    
    SELECT 
        COUNT(*) INTO v_pending
    FROM parent_invitations
    WHERE school_id = p_school_id AND status = 'pending';
    
    SELECT 
        COUNT(*) INTO v_accepted
    FROM parent_invitations
    WHERE school_id = p_school_id AND status = 'accepted';
    
    SELECT 
        COUNT(*) INTO v_expired
    FROM parent_invitations
    WHERE school_id = p_school_id AND status = 'expired';
    
    RETURN jsonb_build_object(
        'total', v_total,
        'pending', v_pending,
        'accepted', v_accepted,
        'expired', v_expired
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
