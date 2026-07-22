/**
 * Staff Leave Management Page
 * Manage staff leave requests, approvals, and balances
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { staffLeaveService } from "@/lib/services/staffLeaveService";
import { useAppStore } from "@/store/appStore";

const StaffLeavePage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected" | "completed">("all");

  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ["staff-leave", currentSchool?.id, activeTab],
    queryFn: () => {
      if (!currentSchool?.id) return [];
      const status = activeTab === "all" ? undefined : activeTab;
      return staffLeaveService.getStaffLeave(currentSchool.id, { status });
    },
    enabled: !!currentSchool?.id,
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    cancelled: "bg-gray-100 text-gray-800 border-gray-300",
    completed: "bg-blue-100 text-blue-800 border-blue-300",
  };

  const statusIcons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    cancelled: XCircle,
    completed: CheckCircle,
  };

  const leaveTypeColors: Record<string, string> = {
    annual: "bg-blue-100 text-blue-800",
    sick: "bg-red-100 text-red-800",
    maternity: "bg-pink-100 text-pink-800",
    paternity: "bg-purple-100 text-purple-800",
    compassionate: "bg-orange-100 text-orange-800",
    study: "bg-indigo-100 text-indigo-800",
    unpaid: "bg-gray-100 text-gray-800",
    other: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Leave</h1>
          <p className="text-muted-foreground">
            Manage staff leave requests and approvals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Leave Request
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="font-display text-2xl font-bold">{leaveRequests?.length || 0}</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-display text-2xl font-bold">
                  {leaveRequests?.filter((l) => l.status === "pending").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="font-display text-2xl font-bold">
                  {leaveRequests?.filter((l) => l.status === "approved").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="font-display text-2xl font-bold">
                  {leaveRequests?.filter((l) => l.status === "rejected").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "all" | "pending" | "approved" | "rejected" | "completed")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Leave Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : leaveRequests && leaveRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Staff</th>
                        <th className="pb-3 font-medium text-muted-foreground">Leave Type</th>
                        <th className="pb-3 font-medium text-muted-foreground">Duration</th>
                        <th className="pb-3 font-medium text-muted-foreground">Days</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequests.map((leave, index) => {
                        const StatusIcon = statusIcons[leave.status] || Clock;
                        return (
                          <motion.tr
                            key={leave.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {leave.staff_profiles?.first_name} {leave.staff_profiles?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({leave.staff_profiles?.employee_number})
                              </span>
                            </td>
                            <td className="py-3">
                              <Badge className={leaveTypeColors[leave.leave_type] || ""}>
                                {leave.leave_type}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(leave.start_date).toLocaleDateString()} -{" "}
                              {new Date(leave.end_date).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-muted-foreground">{leave.total_days}</td>
                            <td className="py-3">
                              <Badge className={statusColors[leave.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {leave.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {leave.status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                      Approve
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                                      Reject
                                    </Button>
                                  </>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                  View
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
                  No leave requests found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffLeavePage;