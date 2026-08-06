import { supabase } from "@/lib/supabase/client";
import type {
  SchoolLead,
  LeadFormData,
  LeadStats,
  LeadWithAssigned,
  LeadStatus,
} from "@/types/lead";

// Submit a new lead from the homepage form
export async function submitLead(formData: LeadFormData): Promise<void> {
  const { error } = await supabase.from("school_leads").insert({
    school_name: formData.school_name,
    school_type: formData.school_type,
    location_city: formData.location_city || null,
    location_province: formData.location_province || null,
    contact_name: formData.contact_name,
    contact_role: formData.contact_role,
    phone: formData.phone,
    email: formData.email,
    preferred_contact_method: formData.preferred_contact_method,
    student_count_range: formData.student_count_range,
    current_system: formData.current_system,
    interested_modules: formData.interested_modules,
    timeline: formData.timeline,
    message: formData.message || null,
    source: "homepage",
  });

  if (error) throw error;
}

// Fetch all leads with optional filters
export async function fetchLeads(filters?: {
  status?: LeadStatus;
  assigned_to?: string;
  search?: string;
}): Promise<SchoolLead[]> {
  let query = supabase
    .from("school_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.assigned_to) {
    query = query.eq("assigned_to", filters.assigned_to);
  }

  if (filters?.search) {
    query = query.or(
      `school_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// Fetch a single lead by ID
export async function fetchLeadById(id: string): Promise<SchoolLead | null> {
  const { data, error } = await supabase
    .from("school_leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// Fetch lead statistics
export async function fetchLeadStats(): Promise<LeadStats> {
  const { data, error } = await supabase.from("lead_stats").select("*").single();

  if (error) {
    // If view doesn't exist, calculate manually
    const { data: leads, error: leadsError } = await supabase
      .from("school_leads")
      .select("status, created_at");

    if (leadsError) throw leadsError;

    const stats: LeadStats = {
      new_leads: 0,
      contacted: 0,
      discovery_calls: 0,
      demos_scheduled: 0,
      trials_started: 0,
      converted: 0,
      lost: 0,
      total_leads: leads?.length || 0,
      leads_this_month: 0,
    };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    leads?.forEach((lead) => {
      switch (lead.status) {
        case "new":
          stats.new_leads++;
          break;
        case "contacted":
          stats.contacted++;
          break;
        case "discovery_call":
          stats.discovery_calls++;
          break;
        case "demo_scheduled":
          stats.demos_scheduled++;
          break;
        case "trial_started":
          stats.trials_started++;
          break;
        case "converted":
          stats.converted++;
          break;
        case "lost":
          stats.lost++;
          break;
      }

      if (new Date(lead.created_at) >= thirtyDaysAgo) {
        stats.leads_this_month++;
      }
    });

    return stats;
  }

  return data as LeadStats;
}

// Update lead status
export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  const { error } = await supabase
    .from("school_leads")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

// Assign lead to a platform admin
export async function assignLead(
  id: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("school_leads")
    .update({ assigned_to: adminId })
    .eq("id", id);

  if (error) throw error;
}

// Add notes to a lead
export async function addLeadNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from("school_leads")
    .update({ notes })
    .eq("id", id);

  if (error) throw error;
}

// Convert lead to school (create school account)
export async function convertLeadToSchool(leadId: string): Promise<{
  schoolId: string;
  subdomain: string;
}> {
  // Fetch lead details
  const lead = await fetchLeadById(leadId);
  if (!lead) throw new Error("Lead not found");

  // Generate subdomain from school name
  const subdomain = lead.school_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Create school
  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .insert({
      name: lead.school_name,
      subdomain: `${subdomain}-${Date.now().toString(36)}`,
      school_type: lead.school_type,
      location_city: lead.location_city,
      location_province: lead.location_province,
      state: "draft",
    })
    .select("id, subdomain")
    .single();

  if (schoolError) throw schoolError;

  // Update lead status to converted
  await updateLeadStatus(leadId, "converted");

  return {
    schoolId: school.id,
    subdomain: school.subdomain,
  };
}

// Delete a lead
export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from("school_leads").delete().eq("id", id);

  if (error) throw error;
}

// Fetch leads with assigned admin details
export async function fetchLeadsWithAssigned(): Promise<LeadWithAssigned[]> {
  const { data, error } = await supabase
    .from("school_leads")
    .select(
      `
      *,
      assigned_admin:platform_admins(full_name, email)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Bulk update lead statuses
export async function bulkUpdateLeadStatus(
  ids: string[],
  status: LeadStatus
): Promise<void> {
  const { error } = await supabase
    .from("school_leads")
    .update({ status })
    .in("id", ids);

  if (error) throw error;
}

// Bulk assign leads to admin
export async function bulkAssignLeads(
  ids: string[],
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from("school_leads")
    .update({ assigned_to: adminId })
    .in("id", ids);

  if (error) throw error;
}