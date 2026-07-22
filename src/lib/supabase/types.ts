/**
 * Database types — aligned to the ACTUAL live schema.
 *
 * Real schema uses:
 *  - school_members (not user_roles) for role assignment
 *  - schools.state (not access_state) for the access state column
 *  - feature_pricing (separate table) for pricing
 *  - school_feature_flags uses feature_id (UUID FK to feature_catalog)
 *  - profiles: id, full_name, email, phone, created_at (no school_id, no updated_at)
 *  - roles: id, key, name, scope
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type RoleScope = "platform" | "school";
export type AccessState = "draft" | "preview" | "payment_pending" | "active" | "suspended";
export type AttendanceStatus = "present" | "absent" | "late";
export type Gender = "M" | "F";

// ─── Core tables ──────────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  subdomain: string;
  state: AccessState;
  created_at: string;
  updated_at: string;
  // Billing fields (may be null until payment is processed)
  billing_status?: string | null;
  onboarding_fee_paid?: boolean | null;
  onboarding_payment_id?: string | null;
  subscription_status?: string | null;
  trial_end_date?: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: "school" | "module" | "system";
  module_key: string | null;
  is_master: boolean;
  is_default: boolean;
  scope: RoleScope;
  created_at: string;
}

export interface Permission {
  id: string;
  key: string;
  name: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface SchoolMember {
  id: string;
  school_id: string;
  user_id: string;
  role_id: string;
  status: "active" | "inactive" | "pending";
  is_master: boolean;
  joined_at: string;
  updated_at: string;
}

export interface FeatureCatalog {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface FeaturePricing {
  id: string;
  feature_id: string;
  monthly_price: number;
  setup_price: number;
  currency: string;
  is_active: boolean;
}

export interface SchoolFeatureFlag {
  id: string;
  school_id: string;
  feature_id: string;
  status: string;
  enabled_at: string | null;
}

// ─── Academic Structure ──────────────────────────────────────────────────────

export interface AcademicYear {
  id: string;
  school_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed" | "archived";
  is_current: boolean;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Term {
  id: string;
  school_id: string;
  academic_year_id: string;
  name: string;
  term_number: number;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  is_current: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  school_id: string;
  name: string;
  level: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  grade_id: string;
  academic_year_id: string;
  name: string;
  stream?: string;
  capacity?: number;
  class_teacher_id?: string;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code?: string;
  description?: string;
  is_compulsory: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSubject {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id?: string;
  is_compulsory: boolean;
  periods_per_week?: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Students ────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  school_id: string;
  class_id: string | null;
  admission_number: string | null;
  full_name: string;
  gender: Gender | null;
  status: string;
  created_at: string;
  updated_at?: string;
  date_of_birth?: string;
  grade_id?: string | null;
  photo_url?: string;
  medical_conditions?: string;
  allergies?: string;
  blood_group?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  previous_school?: string;
  transfer_certificate_number?: string;
  enrollment_date?: string;
  graduation_date?: string;
  notes?: string;
}

export interface ParentLink {
  id: string;
  school_id: string;
  parent_user_id: string;
  student_id: string;
  relationship: string | null;
}

export interface Guardian {
  id: string;
  school_id: string;
  full_name: string;
  phone: string;
  email?: string;
  relationship?: string;
  address?: string;
  occupation?: string;
  national_id?: string;
  is_emergency_contact?: boolean;
  can_pickup?: boolean;
  notes?: string;
  created_at?: string;
}

export interface StudentGuardian {
  student_id: string;
  guardian_id: string;
  is_primary: boolean;
}

export interface StudentTransfer {
  id: string;
  school_id: string;
  student_id: string;
  from_class_id: string;
  to_class_id: string;
  transfer_date: string;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  status: "pending" | "approved" | "completed" | "cancelled";
  academic_year_id?: string;
  term_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudentImportLog {
  id: string;
  school_id: string;
  file_name?: string;
  total_records: number;
  successful_imports: number;
  failed_imports: number;
  errors?: any[];
  imported_by: string;
  imported_at: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceSettings {
  id: string;
  school_id: string;
  allow_editing: boolean;
  late_threshold_minutes: number;
  attendance_method: "present_absent" | "present_absent_late" | "custom";
  custom_statuses?: any;
  notify_parents_on_absence: boolean;
  notify_parents_on_late: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSession {
  id: string;
  school_id: string;
  class_id: string;
  teacher_id: string;
  academic_year_id: string;
  date: string;
  period?: string;
  status: "draft" | "submitted" | "approved" | "locked";
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  notes?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  school_id: string;
  attendance_session_id: string;
  student_id: string;
  status: "present" | "absent" | "late" | "excused";
  remarks?: string;
  late_minutes?: number;
  marked_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  id: string;
  school_id: string;
  student_id: string;
  class_id: string;
  academic_year_id: string;
  month: number;
  year: number;
  total_days: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate?: number;
  created_at: string;
  updated_at: string;
}

// ─── Exams & Results ─────────────────────────────────────────────────────────

export interface GradingSystem {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface GradeRule {
  id: string;
  school_id: string;
  grading_system_id: string;
  grade_name: string;
  min_score: number;
  max_score: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  school_id: string;
  academic_year_id: string;
  term_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "marks_entry" | "completed" | "published";
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  published_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamSubject {
  id: string;
  school_id: string;
  exam_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  max_marks: number;
  pass_marks: number;
  exam_date?: string;
  duration_minutes?: number;
  instructions?: string;
  status: "pending" | "in_progress" | "completed" | "approved";
  created_at: string;
  updated_at: string;
}

export interface StudentResult {
  id: string;
  school_id: string;
  exam_subject_id: string;
  student_id: string;
  score?: number;
  grade?: string;
  remarks?: string;
  status: "draft" | "submitted" | "approved" | "published";
  marked_by: string;
  approved_by?: string;
  approved_at?: string;
  marked_at: string;
  updated_at: string;
}

export interface StudentExamResult {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  total_marks: number;
  total_score: number;
  average: number;
  overall_grade?: string;
  position?: number;
  status: "draft" | "submitted" | "approved" | "published";
  created_at: string;
  updated_at: string;
}

export interface ReportCard {
  id: string;
  school_id: string;
  student_id: string;
  term_id: string;
  exam_id: string;
  teacher_comment?: string;
  principal_comment?: string;
  attendance_percentage?: number;
  status: "draft" | "generated" | "published";
  generated_by: string;
  published_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Communication ───────────────────────────────────────────────────────────

export interface Communication {
  id: string;
  school_id: string;
  title: string | null;
  message: string | null;
  created_at: string;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface PaymentVerification {
  id: string;
  school_id: string;
  transaction_id: string;
  amount: number;
  payment_date: string;
  payment_time: string;
  mobile_network: string;
  sender_phone?: string;
  proof_of_payment_url: string;
  payment_type: "onboarding" | "monthly" | "both";
  onboarding_fee?: number;
  module_fees?: { moduleId: string; amount: number }[];
  modules_selected?: string[];
  status: "pending" | "verified" | "rejected";
  rejection_reason?: string;
  submitted_by: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  school_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  onboarding_fee: number;
  module_fees?: { moduleId: string; amount: number };
  total_amount: number;
  amount_paid: number;
  status: "pending" | "paid" | "overdue" | "cancelled";
  payment_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureAccessLog {
  id: string;
  school_id: string;
  feature_id: string;
  action: "activated" | "deactivated" | "suspended";
  reason?: string;
  performed_by?: string;
  created_at: string;
}

// ─── School Setup (simple local tables) ──────────────────────────────────────

export interface FeeCategory {
  id: string;
  school_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

export interface FeeStructureRow {
  id: string;
  school_id: string;
  grade_id: string;
  fee_category_id: string;
  term_id: string;
  amount: number;
  due_date: string;
  created_at?: string;
}

export interface StaffType {
  id: string;
  school_id: string;
  name: string;
  base_salary?: number | null;
  pay_frequency?: string | null;
  created_at?: string;
}

export interface StaffMember {
  id: string;
  school_id: string;
  staff_type_id?: string | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  salary?: number | null;
  status: string;
  created_at?: string;
}

export interface Mark {
  id?: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  score: number | null;
  grade_letter?: string | null;
  remarks?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── Staff Management ────────────────────────────────────────────────────────

export interface StaffProfile {
  id: string;
  school_id: string;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  gender: "M" | "F" | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  position: string | null;
  department: string | null;
  employment_type: "permanent" | "contract" | "temporary" | "intern" | null;
  employment_date: string | null;
  termination_date: string | null;
  termination_reason: string | null;
  status: "active" | "inactive" | "on_leave" | "terminated";
  qualifications: string | null;
  experience_years: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeacherAssignment {
  id: string;
  school_id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_year_id: string;
  assignment_type: "class_teacher" | "subject_teacher";
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffInvitation {
  id: string;
  school_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role_id: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

// ─── User Management ─────────────────────────────────────────────────────────

export interface RoleHistory {
  id: string;
  school_member_id: string;
  old_role_id: string | null;
  new_role_id: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  created_at: string;
  old_role?: { name: string; key: string };
  new_role?: { name: string; key: string };
  changed_by_user?: { full_name: string; email: string };
}

export interface UserInvitation {
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  role_id: string;
  invited_by: string;
  token: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
  role?: {
    name: string;
    key: string;
    description: string | null;
  };
  invited_by_user?: {
    full_name: string;
    email: string;
  };
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  school_id: string;
  staff_id: string;
  employee_number?: string;
  employment_type: "permanent" | "contract" | "temporary" | "intern";
  department?: string;
  job_title?: string;
  date_of_joining: string;
  contract_start_date?: string;
  contract_end_date?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  mobile_money_number?: string;
  kra_pin?: string;
  nssf_number?: string;
  nhif_number?: string;
  is_active: boolean;
  termination_date?: string;
  termination_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface SalaryComponent {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  component_type: "earning" | "deduction";
  category: "basic" | "allowance" | "benefit" | "tax" | "deduction" | "statutory";
  calculation_type: "fixed" | "percentage" | "formula";
  value?: number;
  percentage_of?: number;
  formula?: string;
  is_taxable: boolean;
  is_pensionable: boolean;
  is_active: boolean;
  is_mandatory: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalaryAssignment {
  id: string;
  school_id: string;
  employee_id: string;
  salary_component_id: string;
  amount: number;
  effective_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  school_id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  status: "draft" | "processing" | "approved" | "paid" | "cancelled";
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Payroll {
  id: string;
  school_id: string;
  payroll_period_id: string;
  employee_id: string;
  basic_salary: number;
  allowances: { name: string; amount: number }[];
  gross_salary: number;
  deductions: { name: string; amount: number; type: string }[];
  total_deductions: number;
  taxable_income: number;
  paye_tax: number;
  nssf_deduction: number;
  nhif_deduction: number;
  net_salary: number;
  payment_status: "pending" | "processing" | "paid" | "failed";
  payment_method?: "bank_transfer" | "mobile_money" | "cash" | "cheque";
  payment_reference?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollPayment {
  id: string;
  school_id: string;
  payroll_id: string;
  amount: number;
  payment_method: "bank_transfer" | "mobile_money" | "cash" | "cheque";
  payment_reference?: string;
  payment_date: string;
  transaction_id?: string;
  bank_name?: string;
  account_number?: string;
  status: "pending" | "completed" | "failed" | "reversed";
  proof_of_payment_url?: string;
  processed_by: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Payslip {
  id: string;
  school_id: string;
  payroll_id: string;
  employee_id: string;
  payslip_number: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  total_allowances: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number; type: string }[];
  is_emailed: boolean;
  emailed_at?: string;
  is_downloaded: boolean;
  downloaded_at?: string;
  generated_by: string;
  created_at: string;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseCategory {
  id: string;
  school_id: string;
  name: string;
  code: string;
  description?: string;
  parent_category_id?: string;
  monthly_budget?: number;
  annual_budget?: number;
  requires_approval: boolean;
  approval_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  school_id: string;
  name: string;
  vendor_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  kra_pin?: string;
  registration_number?: string;
  bank_name?: string;
  bank_account_number?: string;
  is_active: boolean;
  is_preferred: boolean;
  rating?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  school_id: string;
  expense_number: string;
  title: string;
  description?: string;
  expense_date: string;
  category_id: string;
  vendor_id?: string;
  amount: number;
  currency: string;
  payment_method?: "cash" | "bank_transfer" | "mobile_money" | "cheque" | "credit";
  payment_reference?: string;
  payment_date?: string;
  status: "pending" | "approved" | "rejected" | "paid" | "cancelled";
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  receipt_url?: string;
  invoice_url?: string;
  attachments?: { url: string; name: string }[];
  is_recurring: boolean;
  recurrence_pattern?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  next_due_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseApproval {
  id: string;
  school_id: string;
  expense_id: string;
  approver_id: string;
  approval_level: number;
  status: "pending" | "approved" | "rejected";
  comments?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Admission Policy ─────────────────────────────────────────────────────────

export interface AcademicTerm {
  id: string;
  school_id: string;
  term_name: string;
  term_number: number;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed" | "cancelled";
  is_open_for_admission: boolean;
  admission_deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface AdmissionPolicy {
  id: string;
  school_id: string;
  policy_name: string;
  description?: string;
  require_previous_balance_cleared: boolean;
  admission_threshold_percentage: number;
  carry_forward_outstanding: boolean;
  auto_admit_on_payment: boolean;
  allow_principal_override: boolean;
  allow_finance_override: boolean;
  notify_on_pending_admission: boolean;
  notify_on_admission: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentPromotion {
  id: string;
  school_id: string;
  student_id: string;
  from_class_id?: string;
  to_class_id?: string;
  from_term_id?: string;
  to_term_id?: string;
  academic_status: "promoted" | "repeated" | "graduated" | "transferred";
  previous_term_outstanding: number;
  current_term_fee: number;
  total_due: number;
  amount_paid: number;
  admission_status: "pending" | "admitted" | "rejected" | "deferred";
  admission_date?: string;
  admitted_by?: string;
  is_override: boolean;
  override_reason?: string;
  override_by?: string;
  notes?: string;
  promoted_by: string;
  created_at: string;
  updated_at: string;
}

export interface StudentBalance {
  id: string;
  school_id: string;
  student_id: string;
  term_id: string;
  term_fee: number;
  amount_paid: number;
  outstanding_balance: number;
  previous_term_outstanding: number;
  status: "pending" | "partial" | "cleared" | "overdue";
  created_at: string;
  updated_at: string;
}

export interface AdmissionPayment {
  id: string;
  school_id: string;
  student_id: string;
  term_id: string;
  student_balance_id: string;
  amount: number;
  payment_method: string;
  payment_reference?: string;
  payment_date: string;
  allocated_to_previous: boolean;
  allocated_to_current: boolean;
  status: "pending" | "completed" | "failed" | "reversed";
  proof_of_payment_url?: string;
  recorded_by: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Financial Audit System ───────────────────────────────────────────────────

export interface SchoolFeeStructure {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  fee_type: "tuition" | "boarding" | "transport" | "uniform" | "meals" | "activities" | "other";
  amount: number;
  currency: string;
  billing_cycle: "monthly" | "term" | "yearly" | "one_time";
  is_mandatory: boolean;
  applicable_grades?: string[];
  applicable_classes?: string[];
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface StudentInvoice {
  id: string;
  school_id: string;
  student_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  fee_items: Array<{
    fee_structure_id: string;
    name: string;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  discount_reason?: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: "pending" | "partial" | "paid" | "overdue" | "cancelled";
  payment_id?: string;
  created_by: string;
  paid_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface StudentPayment {
  id: string;
  school_id: string;
  student_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "airtel_money" | "mtn_money" | "zamtel_money" | "cheque" | "other";
  reference_number?: string;
  payment_date: string;
  payment_time: string;
  payer_name: string;
  payer_phone?: string;
  payer_email?: string;
  relationship?: "student" | "parent" | "guardian" | "sponsor" | "other";
  receipt_number?: string;
  receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentAllocation {
  id: string;
  school_id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at: string;
}

export interface FinancialTransaction {
  id: string;
  school_id: string;
  transaction_type: "subscription_payment" | "student_payment" | "refund" | "adjustment" | "fee_waiver";
  transaction_date: string;
  amount: number;
  currency: string;
  reference_type: "subscription_payment" | "student_payment" | "invoice" | "adjustment";
  reference_id: string;
  category: "subscription" | "tuition" | "boarding" | "transport" | "uniform" | "meals" | "activities" | "other_income" | "refund" | "adjustment" | "fee_waiver";
  subcategory?: string;
  payment_method?: string;
  reference_number?: string;
  receipt_number?: string;
  status: "pending" | "completed" | "failed" | "reversed";
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  description?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  school_id?: string;
  entity_type: "school_activation" | "subscription_payment" | "student_payment" | "invoice_cancellation" | "fee_waiver" | "refund";
  entity_id: string;
  workflow_type: "school_onboarding" | "payment_verification" | "manual_adjustment";
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_review" | "approved" | "rejected" | "cancelled";
  assigned_to?: string;
  assigned_at?: string;
  decision?: "approved" | "rejected" | "escalated";
  decision_reason?: string;
  decided_by?: string;
  decided_at?: string;
  escalated_from?: string;
  escalated_at?: string;
  escalation_reason?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  school_id?: string;
  user_id?: string;
  recipient_type: "user" | "school" | "admin";
  type: "school_activation_request" | "payment_received" | "payment_verified" | "payment_rejected" | "invoice_generated" | "invoice_overdue" | "subscription_expiring" | "subscription_expired" | "approval_assigned" | "approval_escalated" | "system_alert";
  title: string;
  message: string;
  channels: string[];
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  action_label?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  school_id?: string;
  entity_type: "school" | "student" | "teacher" | "invoice" | "payment" | "subscription" | "feature" | "user" | "attendance" | "exam" | "fee_structure";
  entity_id: string;
  action: "created" | "updated" | "deleted" | "approved" | "rejected" | "activated" | "deactivated" | "suspended" | "paid" | "refunded" | "cancelled" | "viewed";
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes?: Record<string, any>;
  description?: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  performed_by: string;
  performed_at: string;
  metadata: Record<string, any>;
  created_at: string;
}

// ─── Parent Portal & Communication ───────────────────────────────────────────

export interface ParentProfile {
  id: string;
  school_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  relationship: "mother" | "father" | "guardian" | "grandparent" | "other";
  occupation?: string;
  address?: string;
  national_id?: string;
  status: "active" | "inactive" | "pending";
  is_verified: boolean;
  verified_at?: string;
  verified_by?: string;
  notification_preferences: {
    sms: boolean;
    email: boolean;
    in_app: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  message: string;
  summary?: string;
  audience: "all" | "parents" | "staff" | "specific_class" | "specific_grade";
  target_class_ids?: string[];
  target_grade_ids?: string[];
  target_role_keys?: string[];
  priority: "low" | "normal" | "high" | "urgent";
  category: "general" | "academic" | "financial" | "event" | "urgent" | "holiday";
  publish_at: string;
  expire_at?: string;
  status: "draft" | "published" | "archived";
  attachment_urls?: string[];
  created_by: string;
  published_by?: string;
  published_at?: string;
  archived_by?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface NotificationTemplate {
  id: string;
  school_id?: string;
  type: string;
  name: string;
  description?: string;
  sms_template?: string;
  email_subject?: string;
  email_body?: string;
  in_app_title?: string;
  in_app_message?: string;
  available_variables?: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmsProvider {
  id: string;
  school_id: string;
  provider_name: string;
  api_key: string;
  api_secret?: string;
  sender_id?: string;
  api_endpoint: string;
  is_active: boolean;
  is_default: boolean;
  sms_sent_count: number;
  sms_failed_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailProvider {
  id: string;
  school_id: string;
  provider_name: string;
  api_key: string;
  from_email: string;
  from_name: string;
  reply_to_email?: string;
  is_active: boolean;
  is_default: boolean;
  emails_sent_count: number;
  emails_failed_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Database interface ───────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      schools:              { Row: School;           Insert: Omit<School, "id" | "created_at" | "updated_at">; Update: Partial<School> };
      profiles:             { Row: Profile;          Insert: Omit<Profile, "created_at">;                       Update: Partial<Profile> };
      roles:                { Row: Role;             Insert: Omit<Role, "id">;                                  Update: Partial<Role> };
      permissions:          { Row: Permission;       Insert: Omit<Permission, "id">;                            Update: Partial<Permission> };
      role_permissions:     { Row: RolePermission;   Insert: RolePermission;                                    Update: Partial<RolePermission> };
      school_members:       { Row: SchoolMember;     Insert: Omit<SchoolMember, "id" | "created_at">;           Update: Partial<SchoolMember> };
      feature_catalog:      { Row: FeatureCatalog;   Insert: Omit<FeatureCatalog, "id" | "created_at">;         Update: Partial<FeatureCatalog> };
      feature_pricing:      { Row: FeaturePricing;   Insert: Omit<FeaturePricing, "id">;                        Update: Partial<FeaturePricing> };
      school_feature_flags: { Row: SchoolFeatureFlag;Insert: Omit<SchoolFeatureFlag, "id">;                     Update: Partial<SchoolFeatureFlag> };
      students:             { Row: Student;          Insert: Omit<Student, "id" | "created_at">;                Update: Partial<Student> };
      guardians:            { Row: Guardian;         Insert: Omit<Guardian, "id" | "created_at">;               Update: Partial<Guardian> };
      student_guardians:    { Row: StudentGuardian;  Insert: StudentGuardian;                                    Update: Partial<StudentGuardian> };
      parent_links:         { Row: ParentLink;       Insert: Omit<ParentLink, "id">;                            Update: Partial<ParentLink> };
      attendance_settings:  { Row: AttendanceSettings;  Insert: Omit<AttendanceSettings, "id" | "created_at" | "updated_at">; Update: Partial<AttendanceSettings> };
      attendance_sessions:  { Row: AttendanceSession;  Insert: Omit<AttendanceSession, "id" | "created_at" | "updated_at">; Update: Partial<AttendanceSession> };
      attendance_records:   { Row: AttendanceRecord;   Insert: Omit<AttendanceRecord, "id" | "marked_at" | "updated_at">; Update: Partial<AttendanceRecord> };
      attendance_summary:   { Row: AttendanceSummary;   Insert: Omit<AttendanceSummary, "id" | "created_at" | "updated_at">; Update: Partial<AttendanceSummary> };
      grading_systems:      { Row: GradingSystem;    Insert: Omit<GradingSystem, "id" | "created_at" | "updated_at">; Update: Partial<GradingSystem> };
      grade_rules:          { Row: GradeRule;        Insert: Omit<GradeRule, "id" | "created_at" | "updated_at">; Update: Partial<GradeRule> };
      exams:                { Row: Exam;             Insert: Omit<Exam, "id" | "created_at" | "updated_at">; Update: Partial<Exam> };
      exam_subjects:        { Row: ExamSubject;      Insert: Omit<ExamSubject, "id" | "created_at" | "updated_at">; Update: Partial<ExamSubject> };
      student_results:      { Row: StudentResult;    Insert: Omit<StudentResult, "id" | "marked_at" | "updated_at">; Update: Partial<StudentResult> };
      student_exam_results: { Row: StudentExamResult;Insert: Omit<StudentExamResult, "id" | "created_at" | "updated_at">; Update: Partial<StudentExamResult> };
      report_cards:         { Row: ReportCard;       Insert: Omit<ReportCard, "id" | "created_at" | "updated_at">; Update: Partial<ReportCard> };
      fee_structures:       { Row: SchoolFeeStructure;     Insert: Omit<SchoolFeeStructure, "id" | "created_at" | "updated_at">;          Update: Partial<SchoolFeeStructure> };
      fee_categories:       { Row: FeeCategory;      Insert: Omit<FeeCategory, "id" | "created_at">;             Update: Partial<FeeCategory> };
      fee_structure_rows:   { Row: FeeStructureRow;  Insert: Omit<FeeStructureRow, "id" | "created_at">;         Update: Partial<FeeStructureRow> };
      staff_types:          { Row: StaffType;        Insert: Omit<StaffType, "id" | "created_at">;               Update: Partial<StaffType> };
      staff:                { Row: StaffMember;      Insert: Omit<StaffMember, "id" | "created_at">;             Update: Partial<StaffMember> };
      marks:                { Row: Mark;             Insert: Omit<Mark, "id" | "created_at" | "updated_at">;    Update: Partial<Mark> };
      communications:       { Row: Communication;    Insert: Omit<Communication, "id" | "created_at">;          Update: Partial<Communication> };
      audit_logs:           { Row: AuditLog;         Insert: Omit<AuditLog, "id" | "created_at">;               Update: Partial<AuditLog> };
      payment_verifications:{ Row: PaymentVerification; Insert: Omit<PaymentVerification, "id" | "created_at" | "updated_at">; Update: Partial<PaymentVerification> };
      invoices:             { Row: Invoice;          Insert: Omit<Invoice, "id" | "created_at" | "updated_at">; Update: Partial<Invoice> };
      feature_access_logs:  { Row: FeatureAccessLog; Insert: Omit<FeatureAccessLog, "id" | "created_at">;       Update: Partial<FeatureAccessLog> };
      role_history:         { Row: RoleHistory;      Insert: Omit<RoleHistory, "id" | "created_at">;            Update: Partial<RoleHistory> };
      user_invitations:     { Row: UserInvitation;   Insert: Omit<UserInvitation, "id" | "created_at" | "updated_at">; Update: Partial<UserInvitation> };
      // Staff Management
      staff_profiles:       { Row: StaffProfile;     Insert: Omit<StaffProfile, "id" | "created_at" | "updated_at">; Update: Partial<StaffProfile> };
      teacher_assignments:  { Row: TeacherAssignment;Insert: Omit<TeacherAssignment, "id" | "created_at" | "updated_at">; Update: Partial<TeacherAssignment> };
      staff_invitations:    { Row: StaffInvitation;  Insert: Omit<StaffInvitation, "id" | "created_at" | "updated_at">; Update: Partial<StaffInvitation> };
      // Payroll
      employees:            { Row: Employee;         Insert: Omit<Employee, "id" | "created_at" | "updated_at">; Update: Partial<Employee> };
      salary_components:    { Row: SalaryComponent;  Insert: Omit<SalaryComponent, "id" | "created_at" | "updated_at">; Update: Partial<SalaryComponent> };
      employee_salary_assignments: { Row: EmployeeSalaryAssignment; Insert: Omit<EmployeeSalaryAssignment, "id" | "created_at" | "updated_at">; Update: Partial<EmployeeSalaryAssignment> };
      payroll_periods:      { Row: PayrollPeriod;    Insert: Omit<PayrollPeriod, "id" | "created_at" | "updated_at">; Update: Partial<PayrollPeriod> };
      payroll:              { Row: Payroll;          Insert: Omit<Payroll, "id" | "created_at" | "updated_at">; Update: Partial<Payroll> };
      payroll_payments:     { Row: PayrollPayment;   Insert: Omit<PayrollPayment, "id" | "created_at" | "updated_at">; Update: Partial<PayrollPayment> };
      payslips:             { Row: Payslip;          Insert: Omit<Payslip, "id" | "created_at">;               Update: Partial<Payslip> };
      // Expenses
      expense_categories:   { Row: ExpenseCategory;  Insert: Omit<ExpenseCategory, "id" | "created_at" | "updated_at">; Update: Partial<ExpenseCategory> };
      vendors:              { Row: Vendor;           Insert: Omit<Vendor, "id" | "created_at" | "updated_at">; Update: Partial<Vendor> };
      expenses:             { Row: Expense;          Insert: Omit<Expense, "id" | "created_at" | "updated_at">; Update: Partial<Expense> };
      expense_approvals:    { Row: ExpenseApproval;  Insert: Omit<ExpenseApproval, "id" | "created_at" | "updated_at">; Update: Partial<ExpenseApproval> };
      // Academic Structure
      academic_years:       { Row: AcademicYear;     Insert: Omit<AcademicYear, "id" | "created_at" | "updated_at" | "created_by">; Update: Partial<AcademicYear> };
      terms:                { Row: Term;             Insert: Omit<Term, "id" | "created_at" | "updated_at">; Update: Partial<Term> };
      grades:               { Row: Grade;            Insert: Omit<Grade, "id" | "created_at" | "updated_at">; Update: Partial<Grade> };
      classes:              { Row: Class;            Insert: Omit<Class, "id" | "created_at" | "updated_at">; Update: Partial<Class> };
      subjects:             { Row: Subject;          Insert: Omit<Subject, "id" | "created_at" | "updated_at">; Update: Partial<Subject> };
      class_subjects:       { Row: ClassSubject;     Insert: Omit<ClassSubject, "id" | "created_at" | "updated_at">; Update: Partial<ClassSubject> };
      // Admission Policy
      academic_terms:       { Row: AcademicTerm;     Insert: Omit<AcademicTerm, "id" | "created_at" | "updated_at">; Update: Partial<AcademicTerm> };
      admission_policies:   { Row: AdmissionPolicy;  Insert: Omit<AdmissionPolicy, "id" | "created_at" | "updated_at">; Update: Partial<AdmissionPolicy> };
      student_promotions:   { Row: StudentPromotion; Insert: Omit<StudentPromotion, "id" | "created_at" | "updated_at">; Update: Partial<StudentPromotion> };
      student_balances:     { Row: StudentBalance;   Insert: Omit<StudentBalance, "id" | "created_at" | "updated_at">; Update: Partial<StudentBalance> };
      admission_payments:   { Row: AdmissionPayment; Insert: Omit<AdmissionPayment, "id" | "created_at" | "updated_at">; Update: Partial<AdmissionPayment> };
      student_transfers:    { Row: StudentTransfer;  Insert: Omit<StudentTransfer, "id" | "created_at" | "updated_at">; Update: Partial<StudentTransfer> };
      student_import_logs:  { Row: StudentImportLog; Insert: Omit<StudentImportLog, "id" | "imported_at">;         Update: Partial<StudentImportLog> };
      // Parent Portal & Communication
      parent_profiles:      { Row: ParentProfile;    Insert: Omit<ParentProfile, "id" | "created_at" | "updated_at">; Update: Partial<ParentProfile> };
      announcements:        { Row: Announcement;     Insert: Omit<Announcement, "id" | "created_at" | "updated_at">; Update: Partial<Announcement> };
      notifications:        { Row: Notification;     Insert: Omit<Notification, "id" | "created_at" | "updated_at">; Update: Partial<Notification> };
      announcement_reads:   { Row: AnnouncementRead; Insert: Omit<AnnouncementRead, "id" | "read_at">;             Update: Partial<AnnouncementRead> };
      notification_templates: { Row: NotificationTemplate; Insert: Omit<NotificationTemplate, "id" | "created_at" | "updated_at">; Update: Partial<NotificationTemplate> };
      sms_providers:        { Row: SmsProvider;      Insert: Omit<SmsProvider, "id" | "created_at" | "updated_at">; Update: Partial<SmsProvider> };
      email_providers:      { Row: EmailProvider;    Insert: Omit<EmailProvider, "id" | "created_at" | "updated_at">; Update: Partial<EmailProvider> };
      // Financial Audit System
      school_fee_structures: { Row: SchoolFeeStructure; Insert: Omit<SchoolFeeStructure, "id" | "created_at" | "updated_at">; Update: Partial<SchoolFeeStructure> };
      student_invoices:     { Row: StudentInvoice;   Insert: Omit<StudentInvoice, "id" | "created_at" | "updated_at">; Update: Partial<StudentInvoice> };
      student_payments:     { Row: StudentPayment;   Insert: Omit<StudentPayment, "id" | "created_at" | "updated_at">; Update: Partial<StudentPayment> };
      payment_allocations:  { Row: PaymentAllocation; Insert: Omit<PaymentAllocation, "id" | "created_at">; Update: Partial<PaymentAllocation> };
      financial_transactions: { Row: FinancialTransaction; Insert: Omit<FinancialTransaction, "id" | "created_at" | "updated_at">; Update: Partial<FinancialTransaction> };
      approval_workflows:   { Row: ApprovalWorkflow; Insert: Omit<ApprovalWorkflow, "id" | "created_at" | "updated_at">; Update: Partial<ApprovalWorkflow> };
    };
    Views: {
      user_permissions_view: { Row: { user_id: string; school_id: string; role_key: string; permission_key: string } };
    };
    Functions: {
      current_school: { Args: Record<never, never>; Returns: string };
      create_school_onboarding: { 
        Args: { 
          p_school_name: string; 
          p_subdomain: string; 
          p_admin_id: string;
          p_selected_modules?: string[] | null;
        }; 
        Returns: { school_id: string; school_name: string; subdomain: string; state: string } 
      };
      set_active_school: { Args: { p_school_id: string }; Returns: void };
      promote_to_super_admin_by_email: { Args: { target_email: string }; Returns: string };
      validate_subdomain: { Args: { p_subdomain: string }; Returns: string | null };
      validate_email: { Args: { p_email: string }; Returns: string | null };
      get_user_role: { Args: { p_user_id: string; p_school_id: string }; Returns: string };
      is_master_account: { Args: { p_user_id: string; p_school_id: string }; Returns: boolean };
      get_school_users: { Args: { p_school_id: string }; Returns: any[] };
      change_user_role: { Args: { p_user_id: string; p_school_id: string; p_new_role_id: string; p_changed_by: string; p_reason?: string | null }; Returns: any };
      invite_user_to_school: { Args: { p_school_id: string; p_email: string; p_full_name: string; p_role_id: string; p_invited_by: string; p_expires_in_hours?: number }; Returns: any };
      accept_invitation: { Args: { p_token: string; p_user_id: string }; Returns: any };
      user_has_permission: { Args: { p_user_id: string; p_school_id: string; p_resource: string; p_action: string }; Returns: boolean };
      create_audit_log: { Args: { p_school_id: string; p_entity_type: string; p_entity_id: string; p_action: string; p_old_values?: any; p_new_values?: any; p_description?: string; p_performed_by?: string; p_metadata?: Record<string, any> }; Returns: string };
      approve_student_payment: { Args: { p_payment_id: string; p_approved_by: string }; Returns: void };
      reject_student_payment: { Args: { p_payment_id: string; p_rejection_reason: string }; Returns: void };
      generate_invoice_number: { Args: { p_school_id: string }; Returns: string };
      get_financial_summary: { Args: { p_school_id: string; p_start_date: string; p_end_date: string }; Returns: any };
      get_payment_report: { Args: { p_school_id: string; p_start_date: string; p_end_date: string }; Returns: any };
      get_invoice_report: { Args: { p_school_id: string; p_start_date: string; p_end_date: string }; Returns: any };
    };
    Enums: {
      role_scope: RoleScope;
      access_state: AccessState;
      attendance_status: AttendanceStatus;
    };
  };
}