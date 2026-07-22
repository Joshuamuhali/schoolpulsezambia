/**
 * Student Analytics Page
 * Detailed student analytics and insights
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { analyticsService, type StudentAnalytics } from "@/lib/services/analyticsService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  GraduationCap,
  Calendar,
  DollarSign
} from "lucide-react";

export default function StudentAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);

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
      const data = await analyticsService.getStudentAnalytics(schoolId);
      setAnalytics(data);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
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
                <h1 className="text-2xl font-bold text-gray-900">Student Analytics</h1>
                <p className="text-sm text-gray-600">Enrollment and demographic insights</p>
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
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.total_students.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(analytics.enrollment_trend)}
                  <span className="text-sm text-gray-600 capitalize">{analytics.enrollment_trend}</span>
                </div>
              </div>
              <Users className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New Admissions</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.new_admissions.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">This term</p>
              </div>
              <GraduationCap className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Graduation Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.graduation_rate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-2">Last academic year</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Retention Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.retention_rate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 mt-2">Year over year</p>
              </div>
              <Calendar className="h-12 w-12 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Demographics */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Gender Distribution</h4>
              <div className="space-y-2">
                {analytics.gender_distribution.map((item) => (
                  <div key={item.gender} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">{item.gender}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(item.count / analytics.total_students) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Grade Distribution</h4>
              <div className="space-y-2">
                {analytics.grade_distribution.map((item) => (
                  <div key={item.grade} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.grade}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(item.count / analytics.total_students) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-12 text-right">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <GraduationCap className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.graduation_rate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Graduation Rate</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.retention_rate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Retention Rate</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{analytics.new_admissions}</p>
              <p className="text-sm text-gray-600">New Admissions</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}