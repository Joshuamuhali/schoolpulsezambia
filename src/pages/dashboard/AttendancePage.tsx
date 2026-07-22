import { useState } from "react";
import { Check, X, Clock, AlertCircle, Loader2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAppStore } from "@/store/appStore";
import {
  fetchClassAttendance,
  fetchClasses,
  submitBulkAttendance,
  fetchDailyAttendanceSummary,
} from "@/lib/services/attendance";
import type { AttendanceStatus } from "@/lib/supabase/types";

const today = new Date().toISOString().split("T")[0];

const AttendancePage = () => {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const userId = useAppStore((s) => s.userId)!;
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const qc = useQueryClient();

  const displayDate = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Classes list for selector
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["classes", schoolId],
    queryFn: () => fetchClasses(schoolId),
    enabled: !!schoolId,
  });

  // Daily summary
  const { data: summary } = useQuery({
    queryKey: ["attendance-summary", schoolId, today],
    queryFn: () => fetchDailyAttendanceSummary(schoolId, today),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  // Students for selected class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["class-attendance", schoolId, selectedClassId, today],
    queryFn: () => fetchClassAttendance(schoolId, selectedClassId, today),
    enabled: !!selectedClassId,
    onSuccess: (data) => {
      // Pre-fill status map from existing records
      const existing: Record<string, AttendanceStatus> = {};
      data.forEach((s) => { if (s.status) existing[s.id] = s.status; });
      setStatusMap(existing);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!students) return Promise.resolve();
      const records = students
        .filter((s) => statusMap[s.id])
        .map((s) => ({
          school_id: schoolId,
          class_id: selectedClassId,
          student_id: s.id,
          date: today,
          status: statusMap[s.id],
          recorded_by: userId,
        }));
      return submitBulkAttendance(records);
    },
    onSuccess: () => {
      toast.success("Attendance saved successfully");
      qc.invalidateQueries({ queryKey: ["attendance-summary", schoolId, today] });
      qc.invalidateQueries({ queryKey: ["class-attendance", schoolId, selectedClassId, today] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const setStatus = (id: string, status: AttendanceStatus) =>
    setStatusMap((prev) => ({ ...prev, [id]: status }));

  const markedCount = Object.keys(statusMap).length;
  const presentCount = Object.values(statusMap).filter((s) => s === "present").length;
  const absentCount = Object.values(statusMap).filter((s) => s === "absent").length;
  const lateCount = Object.values(statusMap).filter((s) => s === "late").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Attendance</h1>
        <p className="text-muted-foreground">{displayDate}</p>
      </div>

      {/* Daily summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Present", count: summary?.present ?? 0, icon: Check, color: "success" },
          { label: "Absent",  count: summary?.absent ?? 0,  icon: X,     color: "destructive" },
          { label: "Late",    count: summary?.late ?? 0,    icon: Clock,  color: "warning" },
        ].map((item) => (
          <Card key={item.label} className="shadow-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-${item.color}/10 flex items-center justify-center`}>
                <item.icon className={`h-5 w-5 text-${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs text-muted-foreground">{item.label} today</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class selector */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder={classesLoading ? "Loading classes…" : "Select a class"} />
              </SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((c: { id: string; name: string }) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedClassId && (
            <p className="text-sm text-muted-foreground">Select a class to start marking attendance.</p>
          )}

          {selectedClassId && studentsLoading && (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedClassId && !studentsLoading && students && students.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No active students in this class.</p>
          )}

          {selectedClassId && !studentsLoading && students && students.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>{students.length} students</span>
                <span>{markedCount} marked — {presentCount}P / {absentCount}A / {lateCount}L</span>
              </div>

              <div className="space-y-2">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <span className="font-medium text-sm">{student.full_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{student.admission_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusMap[student.id] && (
                        <Badge
                          variant="outline"
                          className="text-xs hidden sm:inline-flex"
                        >
                          {statusMap[student.id]}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant={statusMap[student.id] === "present" ? "default" : "outline"}
                        className={statusMap[student.id] === "present" ? "bg-success hover:bg-success/90 text-success-foreground" : ""}
                        onClick={() => setStatus(student.id, "present")}
                        aria-label="Present"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={statusMap[student.id] === "late" ? "default" : "outline"}
                        className={statusMap[student.id] === "late" ? "bg-warning hover:bg-warning/90 text-warning-foreground" : ""}
                        onClick={() => setStatus(student.id, "late")}
                        aria-label="Late"
                      >
                        <Clock className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={statusMap[student.id] === "absent" ? "default" : "outline"}
                        className={statusMap[student.id] === "absent" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                        onClick={() => setStatus(student.id, "absent")}
                        aria-label="Absent"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || markedCount === 0}
              >
                {submitMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="h-4 w-4" /> Submit Attendance ({markedCount} records)</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
