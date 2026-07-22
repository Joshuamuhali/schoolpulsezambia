/**
 * Analytics Dashboard
 * Executive dashboard with role-based views for school management
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { analyticsService, type SchoolOverview, type AnalyticsAlert } from "@/lib/services/analyticsService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  RefreshCw,
  ArrowLeft
} from "lucide-react";

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SchoolOverview | null>(null);
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([]);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Get current user and school
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRoleValue = profile?.role ?? "teacher";
      setUserRole(userRoleValue);

      // Get school ID
      const { data: schoolMemberData, error: schoolMemberError } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (schoolMemberError || !schoolMemberData) {
        navigate("/dashboard");
        return;
      }

      const schoolId: string = (schoolMemberData as any).school_id;

      // Load overview and alerts in parallel
      const [overviewData, alertsData] = await Promise.all([
        analyticsService.getSchoolOverview(schoolId),
        analyticsService.getAlerts(schoolId, "active"),
      ]);

      setOverview(overviewData);
      setAlerts(alertsData);

    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "ZMW",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "attendance": return <Calendar className="h-5 w-5" />;
      case "finance": return <DollarSign className="h-5 w-5" />;
      case "academic": return <GraduationCap className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
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
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  {userRole === "director" && "Business Overview"}
                  {userRole === "principal" && "School Operations"}
                  {userRole === "bursar" && "Financial Overview"}
                  {userRole === "teacher" && "Teaching Activity"}
                </p>
              </div>
            </div>
            <Button onClick={loadDashboardData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Active Alerts ({alerts.length})
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alerts.slice(0, 6).map((alert) => (
                <Card key={alert.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-gray-900 truncate">
                          {alert.title}
                        </h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Director/Principal/Bursar Dashboard */}
        {(userRole === "director" || userRole === "principal" || userRole === "bursar") && overview && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {(userRole === "director" || userRole === "principal") && (
                <>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Students</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {overview.total_students.toLocaleString()}
                        </p>
                      </div>
                      <Users className="h-12 w-12 text-blue-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Teachers</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {overview.total_teachers.toLocaleString()}
                        </p>
                      </div>
                      <GraduationCap className="h-12 w-12 text-green-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Attendance Rate</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {overview.attendance_rate?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <Calendar className="h-12 w-12 text-purple-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Avg Performance</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {overview.average_academic_performance?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-12 w-12 text-orange-500" />
                    </div>
                  </Card>
                </>
              )}

              {(userRole === "director" || userRole === "bursar") && (
                <>
                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Fees Expected</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(overview.total_fees_expected)}
                        </p>
                      </div>
                      <DollarSign className="h-12 w-12 text-blue-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Fees Collected</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(overview.total_fees_collected)}
                        </p>
                      </div>
                      <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Outstanding</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(overview.total_fees_outstanding)}
                        </p>
                      </div>
                      <XCircle className="h-12 w-12 text-red-500" />
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Collection Rate</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {overview.fee_collection_rate?.toFixed(1) || 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-12 w-12 text-purple-500" />
                    </div>
                  </Card>
                </>
              )}
            </div>

            {/* Quick Links */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate("/dashboard/analytics/students")}
                >
                  <Users className="h-8 w-8 text-blue-500" />
                  <span>Student Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate("/dashboard/analytics/attendance")}
                >
                  <Calendar className="h-8 w-8 text-green-500" />
                  <span>Attendance Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate("/dashboard/analytics/academic")}
                >
                  <GraduationCap className="h-8 w-8 text-purple-500" />
                  <span>Academic Analytics</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => navigate("/dashboard/analytics/finance")}
                >
                  <DollarSign className="h-8 w-8 text-orange-500" />
                  <span>Finance Analytics</span>
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Teacher Dashboard */}
        {userRole === "teacher" && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching Overview</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-gray-600">My Classes</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-gray-600">Attendance Pending</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">-</p>
                  <p className="text-sm text-gray-600">Marks Pending</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/dashboard/attendance")}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Take Attendance
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/dashboard/exams")}
                >
                  <FileText className="h-5 w-5 mr-2" />
                  Enter Marks
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}