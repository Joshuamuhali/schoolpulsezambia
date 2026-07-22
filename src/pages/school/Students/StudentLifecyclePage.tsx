/**
 * Student Lifecycle Management Page
 * Manage student transfers, withdrawals, promotions, and re-enrollments
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  UserMinus,
  TrendingUp,
  RefreshCw,
  FileText,
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { studentLifecycleService } from "@/lib/services/studentLifecycleService";
import { useAppStore } from "@/store/appStore";

const StudentLifecyclePage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("transfers");

  const { data: transfers } = useQuery({
    queryKey: ["student-transfers", currentSchool?.id],
    queryFn: () => currentSchool?.id ? studentLifecycleService.getStudentTransfers(currentSchool.id) : [],
    enabled: !!currentSchool?.id,
  });

  const { data: withdrawals } = useQuery({
    queryKey: ["student-withdrawals", currentSchool?.id],
    queryFn: () => currentSchool?.id ? studentLifecycleService.getStudentWithdrawals(currentSchool.id) : [],
    enabled: !!currentSchool?.id,
  });

  const { data: promotions } = useQuery({
    queryKey: ["student-promotions", currentSchool?.id],
    queryFn: () => currentSchool?.id ? studentLifecycleService.getStudentPromotions(currentSchool.id) : [],
    enabled: !!currentSchool?.id,
  });

  const { data: reenrollments } = useQuery({
    queryKey: ["student-reenrollments", currentSchool?.id],
    queryFn: () => currentSchool?.id ? studentLifecycleService.getStudentReenrollments(currentSchool.id) : [],
    enabled: !!currentSchool?.id,
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
    completed: "bg-blue-100 text-blue-800 border-blue-300",
    cancelled: "bg-gray-100 text-gray-800 border-gray-300",
    promoted: "bg-green-100 text-green-800 border-green-300",
    retained: "bg-orange-100 text-orange-800 border-orange-300",
    graduated: "bg-purple-100 text-purple-800 border-purple-300",
    archived: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const statusIcons: Record<string, any> = {
    pending: Clock,
    approved: CheckCircle,
    rejected: XCircle,
    completed: CheckCircle,
    cancelled: XCircle,
    promoted: TrendingUp,
    retained: AlertCircle,
    graduated: CheckCircle,
    archived: Archive,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Student Lifecycle</h1>
          <p className="text-muted-foreground">
            Manage student transfers, withdrawals, promotions, and re-enrollments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transfers</p>
                <p className="font-display text-2xl font-bold">{transfers?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Withdrawals</p>
                <p className="font-display text-2xl font-bold">{withdrawals?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <UserMinus className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Promotions</p>
                <p className="font-display text-2xl font-bold">{promotions?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Re-enrollments</p>
                <p className="font-display text-2xl font-bold">{reenrollments?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="reenrollments">Re-enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Student Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transfers && transfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Student</th>
                        <th className="pb-3 font-medium text-muted-foreground">Type</th>
                        <th className="pb-3 font-medium text-muted-foreground">From/To</th>
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((transfer: any, index: number) => {
                        const StatusIcon = statusIcons[transfer.status] || Clock;
                        return (
                          <motion.tr
                            key={transfer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {transfer.students?.first_name} {transfer.students?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({transfer.students?.admission_number})
                              </span>
                            </td>
                            <td className="py-3 capitalize">{transfer.transfer_type}</td>
                            <td className="py-3 text-muted-foreground">
                              {transfer.from_grade_id && transfer.to_grade_id ? (
                                <span>Grade Transfer</span>
                              ) : (
                                <span>School Transfer</span>
                              )}
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(transfer.transfer_date).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[transfer.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {transfer.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {transfer.status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                      Approve
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                                      Reject
                                    </Button>
                                  </>
                                )}
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
                  No transfers found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Student Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals && withdrawals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Student</th>
                        <th className="pb-3 font-medium text-muted-foreground">Reason</th>
                        <th className="pb-3 font-medium text-muted-foreground">Clearance</th>
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((withdrawal: any, index: number) => {
                        const StatusIcon = statusIcons[withdrawal.status] || Clock;
                        return (
                          <motion.tr
                            key={withdrawal.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {withdrawal.students?.first_name} {withdrawal.students?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({withdrawal.students?.admission_number})
                              </span>
                            </td>
                            <td className="py-3">
                              <div>
                                <p className="capitalize">{withdrawal.reason_category}</p>
                                <p className="text-xs text-muted-foreground">{withdrawal.reason}</p>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex gap-1">
                                <Badge variant={withdrawal.fees_cleared ? "default" : "outline"} className="text-xs">
                                  Fees
                                </Badge>
                                <Badge variant={withdrawal.books_returned ? "default" : "outline"} className="text-xs">
                                  Books
                                </Badge>
                                <Badge variant={withdrawal.library_cleared ? "default" : "outline"} className="text-xs">
                                  Library
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(withdrawal.withdrawal_date).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[withdrawal.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {withdrawal.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {withdrawal.status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                      Approve
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive">
                                      Reject
                                    </Button>
                                  </>
                                )}
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
                  No withdrawals found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Student Promotions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {promotions && promotions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Student</th>
                        <th className="pb-3 font-medium text-muted-foreground">From Grade</th>
                        <th className="pb-3 font-medium text-muted-foreground">To Grade</th>
                        <th className="pb-3 font-medium text-muted-foreground">Performance</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promotions.map((promotion: any, index: number) => {
                        const StatusIcon = statusIcons[promotion.status] || Clock;
                        return (
                          <motion.tr
                            key={promotion.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {promotion.students?.first_name} {promotion.students?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({promotion.students?.admission_number})
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">Grade {promotion.from_grade_id}</td>
                            <td className="py-3 text-muted-foreground">Grade {promotion.to_grade_id}</td>
                            <td className="py-3">
                              <div>
                                <p className="text-xs">{promotion.overall_grade || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">{promotion.attendance_percentage}% attendance</p>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[promotion.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {promotion.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {promotion.status === "pending" && (
                                  <>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                      Promote
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-orange-600">
                                      Retain
                                    </Button>
                                  </>
                                )}
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
                  No promotions found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reenrollments" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Student Re-enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reenrollments && reenrollments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Student</th>
                        <th className="pb-3 font-medium text-muted-foreground">Absence Reason</th>
                        <th className="pb-3 font-medium text-muted-foreground">Fees</th>
                        <th className="pb-3 font-medium text-muted-foreground">Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reenrollments.map((reenrollment: any, index: number) => {
                        const StatusIcon = statusIcons[reenrollment.status] || Clock;
                        return (
                          <motion.tr
                            key={reenrollment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {reenrollment.students?.first_name} {reenrollment.students?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({reenrollment.students?.admission_number})
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">{reenrollment.absence_reason || "-"}</td>
                            <td className="py-3">
                              <Badge variant={reenrollment.fees_paid ? "default" : "outline"} className="text-xs">
                                {reenrollment.fees_paid ? "Paid" : "Pending"}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(reenrollment.reenrollment_date).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[reenrollment.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {reenrollment.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                {reenrollment.status === "pending" && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    Approve
                                  </Button>
                                )}
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
                  No re-enrollments found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentLifecyclePage;
