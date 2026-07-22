import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";
import * as attendanceService from "@/lib/services/attendanceService";
import * as academicService from "@/lib/services/academicService";

export function AttendanceReportsPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id],
    queryFn: () => academicService.getClasses(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["attendance-report", currentSchool?.id, selectedClass, selectedMonth, selectedYear],
    queryFn: async () => {
      if (!selectedClass) return null;
      
      const summary = await attendanceService.getClassAttendanceSummary(
        selectedClass,
        currentSchool!.id,
        selectedMonth,
        selectedYear
      );

      const stats = await attendanceService.getClassAttendanceStats(
        selectedClass,
        `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
        `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-31`,
        currentSchool!.id
      );

      return { summary, stats };
    },
    enabled: !!selectedClass && !!currentSchool?.id,
  });

  const getAttendanceRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  const getAttendanceRateBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (rate >= 80) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (rate >= 70) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Attendance Reports</h1>
        <p className="text-muted-foreground mt-2">
          View attendance statistics and trends
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select class and period for the report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class *</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.grades?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && reportData && (
        <>
          {/* Overall Stats */}
          {reportData.stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.stats.total_students || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Present</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {reportData.stats.avg_present?.toFixed(1) || 0}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Absent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {reportData.stats.avg_absent?.toFixed(1) || 0}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reportData.stats.total_sessions || 0}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student-wise Report */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Attendance Report</CardTitle>
                  <CardDescription>
                    {reportData.summary?.length || 0} student(s) in this class
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : reportData.summary && reportData.summary.length > 0 ? (
                <div className="space-y-3">
                  {reportData.summary.map((student: any, index: number) => (
                    <motion.div
                      key={student.student_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{student.student_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {student.total_days} school days
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-green-600">{student.present_count}</div>
                            <div className="text-xs text-muted-foreground">Present</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-red-600">{student.absent_count}</div>
                            <div className="text-xs text-muted-foreground">Absent</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-yellow-600">{student.late_count}</div>
                            <div className="text-xs text-muted-foreground">Late</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`text-right ${getAttendanceRateColor(student.attendance_rate || 0)}`}>
                            <div className="text-lg font-bold">{student.attendance_rate?.toFixed(1) || 0}%</div>
                          </div>
                          {getAttendanceRateBadge(student.attendance_rate || 0)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No data available</h3>
                  <p className="text-muted-foreground">
                    No attendance records found for the selected period
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedClass && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Class</h3>
              <p className="text-muted-foreground">
                Choose a class from the dropdown above to view attendance reports
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}