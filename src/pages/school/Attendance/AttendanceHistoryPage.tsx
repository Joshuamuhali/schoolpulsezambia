import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";
import * as attendanceService from "@/lib/services/attendanceService";
import * as academicService from "@/lib/services/academicService";

export function AttendanceHistoryPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id],
    queryFn: () => academicService.getClasses(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["attendance-sessions", currentSchool?.id, selectedClass, selectedDate],
    queryFn: () => attendanceService.getAttendanceSessions(currentSchool!.id, {
      classId: selectedClass || undefined,
      date: selectedDate || undefined,
    }),
    enabled: !!currentSchool?.id,
  });

  const filteredSessions = sessions?.filter((session: any) => {
    if (!searchTerm) return true;
    const className = classes?.find((c: any) => c.id === session.class_id)?.name || "";
    return className.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "submitted":
        return <Badge className="bg-green-100 text-green-800">Submitted</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case "approved":
        return <Badge className="bg-blue-100 text-blue-800">Approved</Badge>;
      case "locked":
        return <Badge className="bg-gray-100 text-gray-800">Locked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAttendanceRate = (session: any) => {
    if (!session.total_students || session.total_students === 0) return 0;
    const present = session.present_count + session.late_count + session.excused_count;
    return Math.round((present / session.total_students) * 100);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Attendance History</h1>
        <p className="text-muted-foreground mt-2">
          View past attendance records
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by class name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Classes</SelectItem>
                  {classes?.map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.grades?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {filteredSessions?.length || 0} record(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredSessions && filteredSessions.length > 0 ? (
            <div className="space-y-4">
              {filteredSessions.map((session: any, index: number) => {
                const attendanceRate = getAttendanceRate(session);
                const className = classes?.find((c: any) => c.id === session.class_id);

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">
                          {className?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusBadge(session.status)}
                          <span className="text-sm text-muted-foreground">
                            Attendance Rate: {attendanceRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{session.present_count}</div>
                          <div className="text-xs text-muted-foreground">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{session.absent_count}</div>
                          <div className="text-xs text-muted-foreground">Absent</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-yellow-600">{session.late_count}</div>
                          <div className="text-xs text-muted-foreground">Late</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{session.excused_count}</div>
                          <div className="text-xs text-muted-foreground">Excused</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No attendance records</h3>
              <p className="text-muted-foreground">
                No attendance records found for the selected filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}