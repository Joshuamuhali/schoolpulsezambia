/**
 * Staff Analytics Page
 * Detailed staff analytics and insights
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { analyticsService, type StaffWorkloadSummary } from "@/lib/services/analyticsService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  UserCheck,
  BookOpen,
  Clock
} from "lucide-react";

export default function StaffAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffWorkloadSummary[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Get current user and school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get school ID
      const { data: schoolMemberData } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!schoolMemberData) {
        navigate("/dashboard");
        return;
      }

      const schoolId: string = (schoolMemberData as any).school_id;
      const data = await analyticsService.getStaffWorkloadSummary(schoolId);
      setStaffData(data);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkloadColor = (students: number) => {
    if (students > 200) return "text-red-600";
    if (students > 150) return "text-yellow-600";
    return "text-green-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/analytics")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Staff Analytics</h1>
                <p className="text-sm text-gray-600">Teacher workload and performance</p>
              </div>
            </div>
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staffData.length}
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staffData.reduce((sum, staff) => sum + staff.classes_count, 0)}
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Subjects</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staffData.reduce((sum, staff) => sum + staff.subjects_count, 0)}
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">
                  {staffData.reduce((sum, staff) => sum + staff.students_count, 0).toLocaleString()}
                </p>
              </div>
              <UserCheck className="h-12 w-12 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Staff Workload Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Workload Details</h3>
          <div className="space-y-3">
            {staffData.map((staff) => (
              <div key={staff.staff_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{staff.staff_name}</p>
                  <p className="text-xs text-gray-500">{staff.position}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{staff.classes_count}</p>
                    <p className="text-xs text-gray-500">Classes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{staff.subjects_count}</p>
                    <p className="text-xs text-gray-500">Subjects</p>
                  </div>
                  <div className="text-center min-w-[100px]">
                    <p className={`text-sm font-bold ${getWorkloadColor(staff.students_count)}`}>
                      {staff.students_count}
                    </p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}