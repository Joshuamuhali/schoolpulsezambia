/**
 * Staff Performance Service
 * Handles staff performance reviews and evaluations
 */

import { supabase } from "@/lib/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface StaffPerformanceReview {
  id: string;
  school_id: string;
  staff_id: string;
  review_period_start: string;
  review_period_end: string;
  review_date: string;
  reviewed_by: string;
  teaching_quality?: number;
  punctuality?: number;
  teamwork?: number;
  communication?: number;
  overall_rating?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals?: string;
  comments?: string;
  status: "draft" | "submitted" | "acknowledged" | "completed";
  acknowledged_at?: string;
  staff_comments?: string;
  created_at: string;
  updated_at: string;
  staff_profiles?: {
    first_name: string;
    last_name: string;
    employee_number: string;
  };
}

export interface CreateStaffPerformanceReviewInput {
  schoolId: string;
  staffId: string;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewDate: string;
  teachingQuality?: number;
  punctuality?: number;
  teamwork?: number;
  communication?: number;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
}

export interface UpdateStaffPerformanceReviewInput {
  teachingQuality?: number;
  punctuality?: number;
  teamwork?: number;
  communication?: number;
  overallRating?: number;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  status?: StaffPerformanceReview["status"];
  staffComments?: string;
}

// ============================================================================
// STAFF PERFORMANCE CRUD
// ============================================================================

/**
 * Create staff performance review
 */
export async function createStaffPerformanceReview(
  input: CreateStaffPerformanceReviewInput
): Promise<StaffPerformanceReview> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .insert({
      school_id: input.schoolId,
      staff_id: input.staffId,
      review_period_start: input.reviewPeriodStart,
      review_period_end: input.reviewPeriodEnd,
      review_date: input.reviewDate,
      reviewed_by: user.id,
      teaching_quality: input.teachingQuality,
      punctuality: input.punctuality,
      teamwork: input.teamwork,
      communication: input.communication,
      overall_rating: input.overallRating,
      strengths: input.strengths,
      areas_for_improvement: input.areasForImprovement,
      goals: input.goals,
      comments: input.comments,
      status: "draft",
    } as never)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Get staff performance reviews
 */
export async function getStaffPerformanceReviews(
  schoolId: string,
  filters?: {
    staffId?: string;
    status?: StaffPerformanceReview["status"];
    startDate?: string;
    endDate?: string;
  }
): Promise<StaffPerformanceReview[]> {
  let query = supabase
    .from("staff_performance_reviews")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("school_id", schoolId)
    .order("review_date", { ascending: false });

  if (filters?.staffId) {
    query = query.eq("staff_id", filters.staffId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("review_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("review_date", filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StaffPerformanceReview[];
}

/**
 * Get staff performance review by ID
 */
export async function getStaffPerformanceReviewById(reviewId: string): Promise<StaffPerformanceReview> {
  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .eq("id", reviewId)
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Update staff performance review
 */
export async function updateStaffPerformanceReview(
  reviewId: string,
  updates: UpdateStaffPerformanceReviewInput
): Promise<StaffPerformanceReview> {
  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", reviewId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Submit performance review
 */
export async function submitPerformanceReview(reviewId: string): Promise<StaffPerformanceReview> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .update({
      status: "submitted",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", reviewId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Acknowledge performance review (by staff member)
 */
export async function acknowledgePerformanceReview(
  reviewId: string,
  staffComments?: string
): Promise<StaffPerformanceReview> {
  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      staff_comments: staffComments,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", reviewId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Complete performance review
 */
export async function completePerformanceReview(reviewId: string): Promise<StaffPerformanceReview> {
  const { data, error } = await supabase
    .from("staff_performance_reviews")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", reviewId)
    .select("*, staff_profiles(first_name, last_name, employee_number)")
    .single();

  if (error) throw error;
  return data as StaffPerformanceReview;
}

/**
 * Delete staff performance review
 */
export async function deleteStaffPerformanceReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from("staff_performance_reviews")
    .delete()
    .eq("id", reviewId);

  if (error) throw error;
}

// ============================================================================
// PERFORMANCE STATISTICS
// ============================================================================

/**
 * Get performance statistics for a school
 */
export async function getPerformanceStatistics(
  schoolId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  byStaff: Array<{
    staffId: string;
    staffName: string;
    averageRating: number;
    reviewCount: number;
  }>;
  byMonth: Record<string, number>;
}> {
  let query = supabase
    .from("staff_performance_reviews")
    .select("overall_rating, review_date, staff_id, staff_profiles(first_name, last_name)")
    .eq("school_id", schoolId)
    .not("overall_rating", "is", null);

  if (startDate) {
    query = query.gte("review_date", startDate);
  }
  if (endDate) {
    query = query.lte("review_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;

  const reviews = data as (StaffPerformanceReview & { staff_profiles: { first_name: string; last_name: string } })[];

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const byStaff: Record<string, { name: string; ratings: number[] }> = {};
  const byMonth: Record<string, number> = {};

  let totalRating = 0;

  reviews.forEach((review) => {
    if (review.overall_rating) {
      totalRating += review.overall_rating;
      ratingDistribution[review.overall_rating] = (ratingDistribution[review.overall_rating] || 0) + 1;

      // By staff
      const staffKey = review.staff_id;
      if (!byStaff[staffKey]) {
        byStaff[staffKey] = { name: `${review.staff_profiles?.first_name} ${review.staff_profiles?.last_name}`, ratings: [] };
      }
      byStaff[staffKey].ratings.push(review.overall_rating);

      // By month
      const month = new Date(review.review_date).toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + 1;
    }
  });

  const byStaffArray = Object.entries(byStaff).map(([staffId, data]) => ({
    staffId,
    staffName: data.name,
    averageRating: data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length,
    reviewCount: data.ratings.length,
  }));

  return {
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
    ratingDistribution,
    byStaff: byStaffArray,
    byMonth,
  };
}

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const staffPerformanceService = {
  // CRUD
  createStaffPerformanceReview,
  getStaffPerformanceReviews,
  getStaffPerformanceReviewById,
  updateStaffPerformanceReview,
  deleteStaffPerformanceReview,

  // Actions
  submitPerformanceReview,
  acknowledgePerformanceReview,
  completePerformanceReview,

  // Statistics
  getPerformanceStatistics,
};