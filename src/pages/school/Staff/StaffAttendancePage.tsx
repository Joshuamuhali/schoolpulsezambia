/**
 * Staff Attendance Management Page
 * Track and manage staff attendance
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Plus,
  Download,
  UserCheck,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { staffAttendanceService } from "@/lib/services/staffAttendanceService";
import { useAppStore } from "@/store/appStore";

const StaffAttendancePage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "present" | "absent" | "late" | "on_leave">("all");

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ["staff-attendance", currentSchool?.id, activeTab],
    queryFn: () => {
      if (!currentSchool?.id) return [];
      const status = activeTab === "all" ? undefined : activeTab;
      return staffAttendanceService.getStaffAttendance(currentSchool.id, { status });
    },
    enabled: !!currentSchool?.id,
  });

  const statusColors: Record<string, string> = {
    present: "bg-green-100 text-green-800 border-green-300",
    absent: "bg-red-100 text-red-800 border-red-300",
    late: "bg-yellow-100 text-yellow-800 border-yellow-300",
    half_day: "bg-orange-100 text-orange-800 border-orange-300",
    on_leave: "bg-blue-100 text-blue-800 border-blue-300",
  };

  const statusIcons: Record<string, any> = {
    present: UserCheck,
    absent: UserX,
    late: Clock,
    half_day: Clock,
    on_leave: Calendar,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Attendance</h1>
          <p className="text-muted-foreground">
            Track and manage staff attendance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="font-display text-2xl font-bold">{attendanceRecords?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="font-display text-2xl font-bold">
                  {attendanceRecords?.filter((a) => a.status === "present").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="font-display text-2xl font-bold">
                  {attendanceRecords?.filter((a) => a.status === "absent").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late</p>
                <p className="font-display text-2xl font-bold">
                  {attendanceRecords?.filter((a) => a.status === "late").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "all" | "present" | "absent" | "late" | "on_leave")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="present">Present</TabsTrigger>
          <TabsTrigger value="absent">Absent</TabsTrigger>
          <TabsTrigger value="late">Late</TabsTrigger>
          <TabsTrigger value="on_leave">On Leave</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Records
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : attendanceRecords && attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Staff</th>
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Check In</th>
                        <th className="pb-3 font-medium text-muted-foreground">Check Out</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Late</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record, index) => {
                        const StatusIcon = statusIcons[record.status] || Clock;
                        return (
                          <motion.tr
                            key={record.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {record.staff_profiles?.first_name} {record.staff_profiles?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({record.staff_profiles?.employee_number})
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(record.attendance_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : "-"}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : "-"}
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[record.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {record.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {record.late_minutes > 0 ? `${record.late_minutes} min` : "-"}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No attendance records found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffAttendancePage;