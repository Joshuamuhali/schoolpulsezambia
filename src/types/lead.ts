// School Lead Management Types

export type SchoolType = 
  | 'primary_school'
  | 'secondary_school'
  | 'combined_school'
  | 'college_institution'
  | 'other';

export type ContactRole = 
  | 'owner'
  | 'director'
  | 'principal'
  | 'administrator'
  | 'it_officer'
  | 'other';

export type ContactMethod = 
  | 'whatsapp'
  | 'phone_call'
  | 'email';

export type StudentCountRange = 
  | 'under_100'
  | '100_300'
  | '301_500'
  | '501_1000'
  | '1000_plus';

export type CurrentSystem = 
  | 'paper_based'
  | 'spreadsheets'
  | 'multiple_systems'
  | 'existing_software'
  | 'other';

export type Timeline = 
  | 'immediately'
  | '1_3_months'
  | '3_6_months'
  | 'just_exploring';

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'discovery_call'
  | 'demo_scheduled'
  | 'trial_started'
  | 'converted'
  | 'lost';

export interface SchoolLead {
  id: string;
  school_name: string;
  school_type: SchoolType;
  location_city?: string;
  location_province?: string;
  contact_name: string;
  contact_role: ContactRole;
  phone: string;
  email: string;
  preferred_contact_method: ContactMethod;
  student_count_range: StudentCountRange;
  current_system: CurrentSystem;
  interested_modules: string[];
  timeline: Timeline;
  message?: string;
  status: LeadStatus;
  assigned_to?: string;
  notes?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFormData {
  school_name: string;
  school_type: SchoolType;
  location_city?: string;
  location_province?: string;
  contact_name: string;
  contact_role: ContactRole;
  phone: string;
  email: string;
  preferred_contact_method: ContactMethod;
  student_count_range: StudentCountRange;
  current_system: CurrentSystem;
  interested_modules: string[];
  timeline: Timeline;
  message?: string;
}

export interface LeadStats {
  new_leads: number;
  contacted: number;
  discovery_calls: number;
  demos_scheduled: number;
  trials_started: number;
  converted: number;
  lost: number;
  total_leads: number;
  leads_this_month: number;
}

export interface LeadWithAssigned extends SchoolLead {
  assigned_admin?: {
    full_name: string;
    email: string;
  };
}

// Form options for dropdowns
export const SCHOOL_TYPE_OPTIONS = [
  { value: 'primary_school', label: 'Primary School' },
  { value: 'secondary_school', label: 'Secondary School' },
  { value: 'combined_school', label: 'Combined School' },
  { value: 'college_institution', label: 'College / Institution' },
  { value: 'other', label: 'Other' },
] as const;

export const CONTACT_ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'director', label: 'Director' },
  { value: 'principal', label: 'Principal' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'it_officer', label: 'IT / Technology Officer' },
  { value: 'other', label: 'Other' },
] as const;

export const CONTACT_METHOD_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'email', label: 'Email' },
] as const;

export const STUDENT_COUNT_OPTIONS = [
  { value: 'under_100', label: 'Less than 100' },
  { value: '100_300', label: '100–300' },
  { value: '301_500', label: '301–500' },
  { value: '501_1000', label: '501–1,000' },
  { value: '1000_plus', label: '1,000+' },
] as const;

export const CURRENT_SYSTEM_OPTIONS = [
  { value: 'paper_based', label: 'Mostly paper-based' },
  { value: 'spreadsheets', label: 'Spreadsheets (Excel/Google Sheets)' },
  { value: 'multiple_systems', label: 'Multiple disconnected systems' },
  { value: 'existing_software', label: 'Already using school management software' },
  { value: 'other', label: 'Other' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: '1_3_months', label: 'Within 1–3 months' },
  { value: '3_6_months', label: 'Within 3–6 months' },
  { value: 'just_exploring', label: 'Just exploring' },
] as const;

export const INTERESTED_MODULES_OPTIONS = [
  { value: 'student_records', label: 'Student records' },
  { value: 'attendance', label: 'Attendance management' },
  { value: 'finance', label: 'Fees and finance' },
  { value: 'exams', label: 'Exams and grading' },
  { value: 'parent_communication', label: 'Parent communication' },
  { value: 'teacher_management', label: 'Teacher management' },
  { value: 'reports', label: 'Reports and analytics' },
  { value: 'operations', label: 'School operations' },
] as const;

export const LEAD_STATUS_OPTIONS = [
  { value: 'new', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'discovery_call', label: 'Discovery Call' },
  { value: 'demo_scheduled', label: 'Demo Scheduled' },
  { value: 'trial_started', label: 'Trial Started' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
] as const;

export const ZAMBIAN_PROVINCES = [
  'Central',
  'Copperbelt',
  'Eastern',
  'Luapula',
  'Lusaka',
  'Muchinga',
  'Northern',
  'North-Western',
  'Southern',
  'Western',
] as const;