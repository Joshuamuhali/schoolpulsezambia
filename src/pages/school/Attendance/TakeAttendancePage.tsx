import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  ChevronRight,
  Save,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import * as attendanceService from "@/lib/services/attendanceService";
import * as staffService from "@/lib/services/staffService";
import * as academicService from "@/lib/services/academicService";
import * as studentService from "@/lib/services/studentService";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

export function TakeAttendancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserStaffId, setCurrentUserStaffId] = useState<string>("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Get staff profile for current user
        staffService.getStaffProfiles(currentSchool!.id).then((staff) => {
          const currentStaff = staff.find((s: any) => s.email === user.email);
          if (currentStaff) {
            setCurrentUserStaffId(currentStaff.id);
          }
        });
      }
    });
  }, [currentSchool]);

  // Get teacher's assignments
  const { data: teacherAssignments } = useQuery({
    queryKey: ["teacher-assignments", currentSchool?.id, currentUserStaffId],
    queryFn: () => staffService.getTeacherAssignments(currentSchool!.id, currentUserStaffId || undefined),
    enabled: !!currentSchool?.id && !!currentUserStaffId,
  });

  // Get classes for dropdown
  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id],
    queryFn: () => academicService.getClasses(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  // Get students for selected class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", selectedClassId],
    queryFn: () => studentService.getStudentsByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  // Check if attendance already exists for this class/date
  const { data: existingSession } = useQuery({
    queryKey: ["attendance-session", selectedClassId, selectedDate],
    queryFn: async () => {
      const sessions = await attendanceService.getAttendanceSessions(currentSchool!.id, {
        classId: selectedClassId,
        date: selectedDate,
      });
      return sessions[0] || null;
    },
    enabled: !!selectedClassId && !!selectedDate && !!currentSchool?.id,
  });

  // Load existing attendance records if session exists
  useEffect(() => {
    if (existingSession && existingSession.id) {
      attendanceService.getAttendanceRecords(existingSession.id).then((records) => {
        const data: Record<string, AttendanceStatus> = {};
        const remarksData: Record<string, string> = {};
        records.forEach((record) => {
          data[record.student_id] = record.status;
          if (record.remarks) remarksData[record.student_id] = record.remarks;
        });
        setAttendanceData(data);
        setRemarks(remarksData);
      });
    }
  }, [existingSession]);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (existingSession?.id) {
        // Update existing session
        await attendanceService.updateAttendanceSession(existingSession.id, {
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
      } else {
        // Create new session
        const session = await attendanceService.createAttendanceSession({
          school_id: currentSchool!.id,
          class_id: selectedClassId,
          teacher_id: currentUserStaffId,
          academic_year_id: (await academicService.getCurrentAcademicYear(currentSchool!.id))?.id || "",
          date: selectedDate,
          status: "submitted",
          total_students: students?.length || 0,
          present_count: Object.values(attendanceData).filter((s) => s === "present").length,
          absent_count: Object.values(attendanceData).filter((s) => s === "absent").length,
          late_count: Object.values(attendanceData).filter((s) => s === "late").length,
          excused_count: Object.values(attendanceData).filter((s) => s === "excused").length,
          created_by: currentUserId,
        });

        // Create attendance records
        const records = students?.map((student: any) => ({
          school_id: currentSchool!.id,
          attendance_session_id: session.id,
          student_id: student.id,
          status: attendanceData[student.id] || "present",
          remarks: remarks[student.id] || null,
        })) || [];

        await attendanceService.bulkCreateAttendanceRecords(records);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance submitted successfully");
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit attendance");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!selectedClassId || !students || students.length === 0) {
      toast.error("Please select a class");
      return;
    }

    const unmarked = students.filter((s: any) => !attendanceData[s.id]);
    if (unmarked.length > 0) {
      if (!confirm(`${unmarked.length} student(s) not marked. Submit anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    submitMutation.mutate({});
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return <Badge className="bg-green-100 text-green-800">Present</Badge>;
      case "absent":
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>;
      case "late":
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>;
      case "excused":
        return <Badge className="bg-blue-100 text-blue-800">Excused</Badge>;
    }
  };

  const stats = {
    total: students?.length || 0,
    present: Object.values(attendanceData).filter((s) => s === "present").length,
    absent: Object.values(attendanceData).filter((s) => s === "absent").length,
    late: Object.values(attendanceData).filter((s) => s === "late").length,
    excused: Object.values(attendanceData).filter((s) => s === "excused").length,
    unmarked: (students?.length || 0) - Object.keys(attendanceData).length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Take Attendance</h1>
        <p className="text-muted-foreground mt-2">
          Mark attendance for your classes
        </p>
      </div>

      {/* Class and Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <CardDescription>Choose the class and date for attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class *</label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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
              <label className="text-sm font-medium">Date *</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClassId && students && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Excused</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.excused}</div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {classes?.find((c: any) => c.id === selectedClassId)?.name} - Attendance
                  </CardTitle>
                  <CardDescription>
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </CardDescription>
                </div>
                {existingSession && (
                  <Badge variant="outline">
                    {existingSession.status === "submitted" ? "Submitted" : "Draft"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((student: any, index: number) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{student.full_name}</h4>
                          {student.admission_number && (
                            <p className="text-sm text-muted-foreground">
                              {student.admission_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {["present", "absent", "late", "excused"].map((status) => (
                          <Button
                            key={status}
                            variant={attendanceData[student.id] === status ? "default" : "outline"}
                            size="sm"
                            onClick={() =>
                              setAttendanceData({
                                ...attendanceData,
                                [student.id]: status as AttendanceStatus,
                              })
                            }
                            className="min-w-[80px]"
                          >
                            {status === "present" && <CheckCircle className="h-4 w-4 mr-1" />}
                            {status === "absent" && <XCircle className="h-4 w-4 mr-1" />}
                            {status === "late" && <Clock className="h-4 w-4 mr-1" />}
                            {status === "excused" && <AlertCircle className="h-4 w-4 mr-1" />}
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {stats.unmarked > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {stats.unmarked} student(s) not marked. They will be marked as Present by default.
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedClassId}
                  className="flex-1"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Submitting..." : existingSession ? "Update Attendance" : "Submit Attendance"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard/attendance/history")}
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedClassId && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Class</h3>
              <p className="text-muted-foreground">
                Choose a class from the dropdown above to take attendance
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}