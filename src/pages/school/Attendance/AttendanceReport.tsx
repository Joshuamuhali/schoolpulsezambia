import { useState } from "react";
import { Calendar, Download, Filter, Check, X, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/appStore";
import {
  fetchAttendanceReport,
  fetchAttendanceSummaryByDateRange,
  fetchClasses,
} from "@/lib/services/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

interface AttendanceRecordWithRelations {
  id: string;
  date: string;
  status: AttendanceStatus;
  students?: {
    full_name: string;
    admission_number: string | null;
  };
  classes?: {
    name: string;
    grades?: {
      name: string;
    };
  };
}

const AttendanceReport = () => {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [dateRange, setDateRange] = useState<"week" | "month" | "term">("week");

  const today = new Date();
  const startDate = new Date();
  if (dateRange === "week") {
    startDate.setDate(today.getDate() - 7);
  } else if (dateRange === "month") {
    startDate.setDate(today.getDate() - 30);
  } else {
    startDate.setDate(today.getDate() - 90);
  }

  const startDateStr = startDate.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
    enabled: !!schoolId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["attendance-summary-range", schoolId, startDateStr, endDateStr],
    queryFn: () => fetchAttendanceSummaryByDateRange(schoolId, startDateStr, endDateStr),
    enabled: !!schoolId,
  });

  const { data: records, isLoading: recordsLoading } = useQuery<AttendanceRecordWithRelations[]>({
    queryKey: ["attendance-report", schoolId, startDateStr, endDateStr, selectedClassId],
    queryFn: () => fetchAttendanceReport(schoolId, startDateStr, endDateStr, selectedClassId || undefined),
    enabled: !!schoolId,
  });

  const statusColors: Record<AttendanceStatus, string> = {
    present: "bg-success/10 text-success border-success/20",
    absent: "bg-destructive/10 text-destructive border-destructive/20",
    late: "bg-warning/10 text-warning border-warning/20",
  };

  const statusIcons: Record<AttendanceStatus, any> = {
    present: Check,
    absent: X,
    late: Clock,
  };

  const handleExport = () => {
    if (!records) return;
    
    const csv = [
      ["Date", "Student", "Admission #", "Class", "Grade", "Status"].join(","),
      ...records.map((r: AttendanceRecordWithRelations) => [
        r.date,
        r.students?.full_name || "",
        r.students?.admission_number || "",
        r.classes?.name || "",
        r.classes?.grades?.name || "",
        r.status,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${startDateStr}-to-${endDateStr}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Attendance Reports</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze attendance data
          </p>
        </div>
        <Button onClick={handleExport} disabled={!records || records.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Records", value: summary?.total ?? 0, color: "default" },
          { label: "Present", value: summary?.present ?? 0, color: "success" },
          { label: "Absent", value: summary?.absent ?? 0, color: "destructive" },
          { label: "Late", value: summary?.late ?? 0, color: "warning" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Rate */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Attendance Rate</p>
              <p className="text-3xl font-bold">{summary?.attendanceRate}%</p>
            </div>
            <div className="h-16 w-16 rounded-full border-4 border-success flex items-center justify-center">
              <span className="text-sm font-medium text-success">
                {summary?.attendanceRate}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="term">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder={classesLoading ? "Loading..." : "All classes"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All classes</SelectItem>
                  {(classes ?? []).map((c: { id: string; name: string }) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record: AttendanceRecordWithRelations) => {
                    const StatusIcon = statusIcons[record.status];
                    return (
                      <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(record.date).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm">
                            {record.students?.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.students?.admission_number}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {record.classes?.grades?.name} - {record.classes?.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={statusColors[record.status]}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found for the selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceReport;
