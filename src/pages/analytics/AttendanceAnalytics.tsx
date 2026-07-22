/**
 * Attendance Analytics Page
 * Detailed attendance analytics and insights
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { analyticsService, type AttendanceAnalytics } from "@/lib/services/analyticsService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  Users,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle
} from "lucide-react";

export default function AttendanceAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);

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
      const data = await analyticsService.getAttendanceAnalytics(schoolId);
      setAnalytics(data);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">No analytics data available</div>
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
                <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
                <p className="text-sm text-gray-600">Attendance patterns and trends</p>
              </div>
            </div>
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.overall_rate?.toFixed(1) || 0}%
                </p>
              </div>
              <Calendar className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Present</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.present_count?.toLocaleString() || 0}
                </p>
              </div>
              <Users className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Absent</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.absent_count?.toLocaleString() || 0}
                </p>
              </div>
              <Clock className="h-12 w-12 text-red-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Late</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.late_count?.toLocaleString() || 0}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.total_days || 0}</p>
              <p className="text-sm text-gray-600">Total Days</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileText className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.total_records || 0}</p>
              <p className="text-sm text-gray-600">Total Records</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.excused_count || 0}</p>
              <p className="text-sm text-gray-600">Excused Absences</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}