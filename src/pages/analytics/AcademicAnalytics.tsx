/**
 * Academic Analytics Page
 * Detailed academic performance analytics and insights
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { analyticsService, type AcademicAnalytics } from "@/lib/services/analyticsService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft,
  BookOpen,
  Award,
  BarChart3
} from "lucide-react";

export default function AcademicAnalytics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AcademicAnalytics | null>(null);

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
      const data = await analyticsService.getAcademicAnalytics(schoolId);
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

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
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
                <h1 className="text-2xl font-bold text-gray-900">Academic Analytics</h1>
                <p className="text-sm text-gray-600">Performance and achievement insights</p>
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
                <p className="text-sm text-gray-600">Average Score</p>
                <p className={`text-3xl font-bold ${getPerformanceColor(analytics.average_score || 0)}`}>
                  {(analytics.average_score || 0).toFixed(1)}%
                </p>
              </div>
              <Award className="h-12 w-12 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(analytics.pass_rate || 0).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Exams</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.total_exams || 0}
                </p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-3xl font-bold text-gray-900">
                  {analytics.subject_performance?.length || 0}
                </p>
              </div>
              <BarChart3 className="h-12 w-12 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Performance</h3>
          <div className="space-y-4">
            {analytics.subject_performance?.map((subject) => (
              <div key={subject.subject_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{subject.subject_name}</p>
                  <p className="text-xs text-gray-500">{subject.students_count} students</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getPerformanceColor(subject.average_score)}`}>
                      {subject.average_score.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Average</p>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-bold text-gray-900">
                      {subject.pass_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Pass Rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{subject.passed_count} Passed</p>
                    <p className="text-sm font-medium text-red-600">{subject.failed_count} Failed</p>
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