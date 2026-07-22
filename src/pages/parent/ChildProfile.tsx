/**
 * Child Profile View
 * Detailed view of a child's information for parents
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { parentService } from "@/lib/services/parentService";
import type { ChildInfo, AttendanceSummary, FeeSummary, LatestResult } from "@/lib/services/parentService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, DollarSign, GraduationCap, User, Phone, Mail, MapPin } from "lucide-react";

export default function ChildProfile() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null);
  const [latestResults, setLatestResults] = useState<LatestResult[]>([]);
  const [parentProfile, setParentProfile] = useState<any>(null);

  useEffect(() => {
    if (studentId) {
      loadChildData();
    }
  }, [studentId]);

  const loadChildData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // Get parent profile
      const profile = await parentService.getCurrentParentProfile();
      if (!profile) {
        navigate("/parent/setup");
        return;
      }
      setParentProfile(profile);

      // Get child details
      const children = await parentService.getParentChildren(user.id);
      const childData = children.find(c => c.student_id === studentId);
      
      if (!childData) {
        navigate("/parent/dashboard");
        return;
      }
      
      setChild(childData);

      // Load attendance summary
      const attendanceData = await parentService.getStudentAttendanceStats(studentId!);
      setAttendance(attendanceData);

      // Load fee summary
      const feesData = await parentService.getStudentFeeSummary(studentId!);
      setFeeSummary(feesData);

      // Load latest results
      const resultsData = await parentService.getStudentResults(studentId!);
      setLatestResults(resultsData.slice(0, 5));

    } catch (error) {
      console.error("Error loading child data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Child not found</div>
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
                onClick={() => navigate("/parent/dashboard")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {child.student_name}
                </h1>
                <p className="text-sm text-gray-600">
                  {child.grade_name} {child.class_name && `• ${child.class_name}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Full Name</p>
                  <p className="font-medium">{child.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Admission Number</p>
                  <p className="font-medium">{child.admission_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grade</p>
                  <p className="font-medium">{child.grade_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="font-medium">{child.class_name || "Not assigned"}</p>
                </div>
                {child.class_teacher_name && (
                  <div>
                    <p className="text-sm text-gray-600">Class Teacher</p>
                    <p className="font-medium">{child.class_teacher_name}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Attendance Summary */}
              {attendance && (
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Attendance (Last 30 Days)
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Present</span>
                      <span className="font-semibold text-green-600">{attendance.present_days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Absent</span>
                      <span className="font-semibold text-red-600">{attendance.absent_days}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Late</span>
                      <span className="font-semibold text-yellow-600">{attendance.late_days}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Rate</span>
                        <span className={`text-lg font-bold ${getAttendanceColor(attendance.attendance_percentage)}`}>
                          {attendance.attendance_percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Fee Summary */}
              {feeSummary && (
                <Card className="p-6">
                  <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Fee Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Fees</span>
                      <span className="font-semibold">K{feeSummary.total_fees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Paid</span>
                      <span className="font-semibold text-green-600">K{feeSummary.total_paid.toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Balance</span>
                        <span className={`text-lg font-bold ${feeSummary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          K{feeSummary.balance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Latest Results */}
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Latest Results
                </h3>
                {latestResults.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{latestResults[0].exam_name}</span>
                      <span className="font-semibold text-blue-600">{latestResults[0].average}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Grade</span>
                      <span className="font-semibold">{latestResults[0].overall_grade}</span>
                    </div>
                    {latestResults[0].position && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Position</span>
                        <span className="font-semibold">#{latestResults[0].position}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No results yet</p>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Attendance History</h2>
              {attendance ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{attendance.present_days}</p>
                      <p className="text-sm text-gray-600">Present</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{attendance.absent_days}</p>
                      <p className="text-sm text-gray-600">Absent</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{attendance.late_days}</p>
                      <p className="text-sm text-gray-600">Late</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{attendance.excused_days}</p>
                      <p className="text-sm text-gray-600">Excused</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{attendance.total_days}</p>
                      <p className="text-sm text-gray-600">Total Days</p>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Attendance Rate</span>
                      <span className={`text-3xl font-bold ${getAttendanceColor(attendance.attendance_percentage)}`}>
                        {attendance.attendance_percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">No attendance data available</p>
              )}
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Exam Results</h2>
              {latestResults.length > 0 ? (
                <div className="space-y-4">
                  {latestResults.map((result) => (
                    <div key={result.exam_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{result.exam_name}</h3>
                          <p className="text-sm text-gray-600">{result.term_name} • {result.academic_year_id}</p>
                        </div>
                        <Badge variant="outline">{result.overall_grade}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Average</span>
                        <span className="text-xl font-bold text-blue-600">{result.average}%</span>
                      </div>
                      {result.position && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-600">Position</span>
                          <span className="font-semibold">#{result.position}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No results published yet</p>
              )}
            </Card>
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Fee Information</h2>
              {feeSummary ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Fees</p>
                      <p className="text-2xl font-bold text-blue-600">K{feeSummary.total_fees.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Paid</p>
                      <p className="text-2xl font-bold text-green-600">K{feeSummary.total_paid.toLocaleString()}</p>
                    </div>
                    <div className={`p-4 rounded-lg ${feeSummary.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-sm text-gray-600">Balance</p>
                      <p className={`text-2xl font-bold ${feeSummary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        K{feeSummary.balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {feeSummary.overdue_count > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        You have {feeSummary.overdue_count} overdue payment(s). Please contact the school office.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No fee information available</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}