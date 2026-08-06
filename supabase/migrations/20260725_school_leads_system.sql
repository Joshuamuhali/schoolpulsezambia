-- School Leads Management System
-- Captures interested schools before they create an account

-- Create school_leads table
CREATE TABLE IF NOT EXISTS public.school_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- School Information
  school_name TEXT NOT NULL,
  school_type TEXT NOT NULL CHECK (school_type IN (
    'primary_school',
    'secondary_school', 
    'combined_school',
    'college_institution',
    'other'
  )),
  location_city TEXT,
  location_province TEXT,
  
  -- Contact Person
  contact_name TEXT NOT NULL,
  contact_role TEXT NOT NULL CHECK (contact_role IN (
    'owner',
    'director',
    'principal',
    'administrator',
    'it_officer',
    'other'
  )),
  
  -- Contact Details
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_contact_method TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_contact_method IN (
    'whatsapp',
    'phone_call',
    'email'
  )),
  
  -- School Size
  student_count_range TEXT NOT NULL CHECK (student_count_range IN (
    'under_100',
    '100_300',
    '301_500',
    '501_1000',
    '1000_plus'
  )),
  
  -- Current Situation
  current_system TEXT NOT NULL CHECK (current_system IN (
    'paper_based',
    'spreadsheets',
    'multiple_systems',
    'existing_software',
    'other'
  )),
  
  -- Interested Modules (stored as JSON array)
  interested_modules TEXT[] DEFAULT '{}',
  
  -- Timeline
  timeline TEXT NOT NULL CHECK (timeline IN (
    'immediately',
    '1_3_months',
    '3_6_months',
    'just_exploring'
  )),
  
  -- Additional Information
  message TEXT,
  
  -- Lead Management
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'contacted',
    'discovery_call',
    'demo_scheduled',
    'trial_started',
    'converted',
    'lost'
  )),
  assigned_to UUID REFERENCES platform_admins(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Metadata
  source TEXT DEFAULT 'homepage',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_school_leads_status ON public.school_leads(status);
CREATE INDEX IF NOT EXISTS idx_school_leads_assigned_to ON public.school_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_school_leads_created_at ON public.school_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_leads_email ON public.school_leads(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_school_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER school_leads_updated_at
  BEFORE UPDATE ON public.school_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_school_leads_updated_at();

-- Enable Row Level Security
ALTER TABLE public.school_leads ENABLE ROW LEVEL SECURITY;

-- Public can insert (submit form)
CREATE POLICY "Public can submit leads"
  ON public.school_leads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Platform admins can view all leads
CREATE POLICY "Platform admins can view all leads"
  ON public.school_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Platform admins can update leads
CREATE POLICY "Platform admins can update leads"
  ON public.school_leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Platform admins can delete leads
CREATE POLICY "Platform admins can delete leads"
  ON public.school_leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE platform_admins.id = auth.uid()
    )
  );

-- Grant permissions
GRANT INSERT ON public.school_leads TO anon;
GRANT INSERT ON public.school_leads TO authenticated;
GRANT ALL ON public.school_leads TO authenticated;

-- Create a view for lead statistics
CREATE OR REPLACE VIEW public.lead_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'new') as new_leads,
  COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
  COUNT(*) FILTER (WHERE status = 'discovery_call') as discovery_calls,
  COUNT(*) FILTER (WHERE status = 'demo_scheduled') as demos_scheduled,
  COUNT(*) FILTER (WHERE status = 'trial_started') as trials_started,
  COUNT(*) FILTER (WHERE status = 'converted') as converted,
  COUNT(*) FILTER (WHERE status = 'lost') as lost,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as leads_this_month
FROM public.school_leads;

-- Grant access to the view
GRANT SELECT ON public.lead_stats TO authenticated;

-- Insert sample data for testing (optional, can be removed)
-- INSERT INTO public.school_leads (
--   school_name, school_type, location_city, location_province,
--   contact_name, contact_role, phone, email, preferred_contact_method,
--   student_count_range, current_system, interested_modules, timeline, status
-- ) VALUES (
--   'Green Valley Academy',
--   'secondary_school',
--   'Lusaka',
--   'Lusaka',
--   'John Banda',
--   'director',
--   '+260 977 123 456',
--   'john@greenvalley.zm',
--   'whatsapp',
--   '501_1000',
--   'spreadsheets',
--   ARRAY['attendance', 'finance', 'parent_communication'],
--   '1_3_months',
--   'new'
-- );