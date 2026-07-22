/**
 * Principal Teacher Management Page
 * Manage teacher invitations, assignments, and workload
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Mail,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  Filter,
  Download,
  Eye,
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getTeacherInvitationStats,
  getTeacherInvitations,
  getPendingTeachers,
  resendTeacherInvitation,
  cancelTeacherInvitation,
} from "@/lib/services/staffService";
import { useAppStore } from "@/store/appStore";
import { TeacherInvitationForm } from "@/components/TeacherInvitationForm";

const statusColors: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800 border-blue-300",
  accepted: "bg-green-100 text-green-800 border-green-300",
  expired: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-gray-100 text-gray-800 border-gray-300",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  accepted: CheckCircle,
  expired: XCircle,
  cancelled: XCircle,
};

const TeachersPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invitationOpen, setInvitationOpen] = useState(false);
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["teacher-invitation-stats", currentSchool?.id],
    queryFn: () => currentSchool?.id ? getTeacherInvitationStats(currentSchool.id) : null,
    enabled: !!currentSchool?.id,
  });

  const { data: invitations, isLoading, error } = useQuery({
    queryKey: ["teacher-invitations", currentSchool?.id, statusFilter],
    queryFn: () =>
      currentSchool?.id
        ? getTeacherInvitations(
            currentSchool.id,
            statusFilter === "all" ? undefined : (statusFilter as any)
          )
        : [],
    enabled: !!currentSchool?.id,
  });

  const { data: pendingTeachers } = useQuery({
    queryKey: ["pending-teachers", currentSchool?.id],
    queryFn: () => currentSchool?.id ? getPendingTeachers(currentSchool.id) : [],
    enabled: !!currentSchool?.id,
  });

  const resendMutation = useMutation({
    mutationFn: resendTeacherInvitation,
    onSuccess: () => {
      toast.success("Invitation resent successfully");
      qc.invalidateQueries({ queryKey: ["teacher-invitations"] });
      qc.invalidateQueries({ queryKey: ["teacher-invitation-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTeacherInvitation,
    onSuccess: () => {
      toast.success("Invitation cancelled");
      qc.invalidateQueries({ queryKey: ["teacher-invitations"] });
      qc.invalidateQueries({ queryKey: ["teacher-invitation-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = (invitations ?? []).filter(
    (inv: any) =>
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      inv.first_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.last_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Teacher Management</h1>
          <p className="text-muted-foreground">
            Manage teacher invitations, assignments, and workload
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setInvitationOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Invite Teacher
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Teachers</p>
                <p className="font-display text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="font-display text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="font-display text-2xl font-bold">{stats?.accepted || 0}</p>
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
                <p className="text-sm text-muted-foreground">Need Assignment</p>
                <p className="font-display text-2xl font-bold">{pendingTeachers?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Teachers Alert */}
      {pendingTeachers && pendingTeachers.length > 0 && (
        <Card className="shadow-card border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {pendingTeachers.length} teacher{pendingTeachers.length > 1 ? "s" : ""} ready for assignment
                  </p>
                  <p className="text-sm text-orange-700">
                    These teachers have accepted invitations but haven't been assigned to classes yet.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-orange-300">
                Assign Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invitations List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading invitations...</p>
        </div>
      ) : error ? (
        <Card className="shadow-card border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load invitations.</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-display font-semibold">No invitations found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "all" ? "Try adjusting your filters" : "Start by inviting teachers"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Teacher Name</th>
                    <th className="pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="pb-3 font-medium text-muted-foreground">Specialization</th>
                    <th className="pb-3 font-medium text-muted-foreground">Employment</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground">Sent</th>
                    <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invitation: any, index: number) => {
                    const StatusIcon = statusIcons[invitation.status] || Clock;
                    return (
                      <motion.tr
                        key={invitation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 font-medium">
                          {invitation.first_name} {invitation.last_name}
                        </td>
                        <td className="py-3 text-muted-foreground">{invitation.email}</td>
                        <td className="py-3">{invitation.specialization || "-"}</td>
                        <td className="py-3 capitalize">{invitation.employment_type}</td>
                        <td className="py-3">
                          <Badge className={statusColors[invitation.status] || ""}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {invitation.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(invitation.sent_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {invitation.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs"
                                  onClick={() => resendMutation.mutate(invitation.id)}
                                  disabled={resendMutation.isPending}
                                >
                                  <Mail className="h-3 w-3" /> Resend
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive"
                                  onClick={() => cancelMutation.mutate(invitation.id)}
                                  disabled={cancelMutation.isPending}
                                >
                                  <XCircle className="h-3 w-3" /> Cancel
                                </Button>
                              </>
                            )}
                            {invitation.status === "expired" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1 text-xs"
                                onClick={() => resendMutation.mutate(invitation.id)}
                                disabled={resendMutation.isPending}
                              >
                                <Mail className="h-3 w-3" /> Resend
                              </Button>
                            )}
                            {invitation.status === "accepted" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs"
                                >
                                  <Eye className="h-3 w-3" /> View
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs"
                                >
                                  <BookOpen className="h-3 w-3" /> Assign
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
          </CardContent>
        </Card>
      )}

      {/* Teacher Invitation Form Modal */}
      <TeacherInvitationForm
        open={invitationOpen}
        onOpenChange={setInvitationOpen}
        onSuccess={() => qc.invalidateQueries({ queryKey: ["teacher-invitations"] })}
      />
    </div>
  );
};

export default TeachersPage;
