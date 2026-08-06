export interface KYCStatus {
  overall: "pending" | "in_review" | "verified" | "rejected";
  registration: "pending" | "verified" | "rejected";
  business: "pending" | "verified" | "rejected";
  ownership: "pending" | "verified" | "rejected";
  head_teacher: "pending" | "verified" | "rejected";
  address: "pending" | "verified" | "rejected";
  statistics: "pending" | "verified" | "rejected";
}

export interface KYCProgress {
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  is_complete: boolean;
  sections: KYCSection[];
}

export interface KYCSection {
  name: string;
  completed: boolean;
  completed_at: string | null;
}

export interface KYCSchool {
  id: string;
  name: string;
  subdomain: string;
  state: string;
  kyc_status: string;
  kyc_submitted_at: string;
  admin_name: string;
  admin_email: string;
  sections: {
    registration: any;
    business: any;
    ownership: any;
    head_teacher: any;
    address: any;
    statistics: any;
    facilities: any;
  };
}

export interface SetupFeeRequest {
  id: string;
  school_id: string;
  amount: number;
  status: "pending" | "paid" | "approved" | "rejected";
  requested_at: string;
  paid_at: string;
  payment_id: string;
}

export interface SchoolRegistration {
  school_id: string;
  registration_number: string;
  certificate_url: string;
  date_registered: string;
  status: "pending" | "verified" | "rejected";
}

export interface BusinessRegistration {
  school_id: string;
  pacra_number: string;
  pacra_certificate_url: string;
  tpin: string;
  business_licence_number: string;
  business_licence_url: string;
  company_name: string;
  company_registration_number: string;
  status: "pending" | "verified" | "rejected";
}

export interface SchoolOwnership {
  school_id: string;
  ownership_type: "sole_proprietorship" | "limited_company" | "church" | "trust" | "ngo" | "cooperative";
  proprietor_name: string;
  proprietor_nrc: string;
  proprietor_passport: string;
  proprietor_nrc_front_url: string;
  proprietor_nrc_back_url: string;
  proprietor_position: string;
  proprietor_phone: string;
  proprietor_email: string;
  status: "pending" | "verified" | "rejected";
}

export interface SchoolHead {
  school_id: string;
  full_name: string;
  phone: string;
  email: string;
  tcz_number: string;
  status: "pending" | "verified" | "rejected";
}

export interface SchoolAddress {
  school_id: string;
  province: string;
  district: string;
  physical_address: string;
  gps_location: string;
  postal_address: string;
  status: "pending" | "verified" | "rejected";
}

export interface SchoolStatistics {
  school_id: string;
  number_of_students: number;
  number_of_teachers: number;
  number_of_classrooms: number;
  number_of_streams: number;
  number_of_campuses: number;
}

export interface SchoolFacilities {
  library: boolean;
  computer_lab: boolean;
  science_lab: boolean;
  boarding: boolean;
  sports: boolean;
  school_bus: boolean;
  clinic: boolean;
  dining_hall: boolean;
}

export interface KYCOnboardingData {
  // School Information
  school_name: string;
  school_type: "day" | "boarding" | "mixed";
  education_level: "ece" | "primary" | "secondary" | "combined";
  year_established: number;
  motto?: string;
  logo_file?: File;

  // Ministry Registration
  registration_number: string;
  registration_certificate: File;
  date_registered: string;

  // Business Registration
  pacra_number: string;
  pacra_certificate: File;
  tpin: string;
  business_licence_number?: string;
  business_licence?: File;
  company_name?: string;
  company_registration_number?: string;

  // Ownership
  ownership_type: "sole_proprietorship" | "limited_company" | "church" | "trust" | "ngo" | "cooperative";
  proprietor_name: string;
  proprietor_nrc: string;
  proprietor_nrc_front: File;
  proprietor_nrc_back: File;
  proprietor_position: string;
  proprietor_phone: string;
  proprietor_email: string;

  // Head Teacher
  head_teacher_name: string;
  head_teacher_phone: string;
  head_teacher_email: string;
  head_teacher_tcz: string;

  // Address
  province: string;
  district: string;
  physical_address: string;
  gps_location?: string;
  postal_address?: string;

  // Statistics
  number_of_students: number;
  number_of_teachers: number;
  number_of_classrooms: number;
  number_of_streams: number;
  number_of_campuses: number;

  // Facilities
  facilities: SchoolFacilities;

  // Billing
  billing_contact_name: string;
  billing_email: string;
  billing_phone: string;
  preferred_payment_method: "airtel_money" | "mtn_money" | "bank_transfer";

  // Terms
  terms_accepted: boolean;
  privacy_accepted: boolean;
}