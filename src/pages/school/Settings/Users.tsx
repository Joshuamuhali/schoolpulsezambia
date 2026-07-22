/**
 * Page: Users
 * User management with roles, invitations, and permissions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userManagementService } from "@/lib/services/userManagementService";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, Shield, UserX, UserCheck, Mail, MoreVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { InviteUserForm } from "@/components/users/InviteUserForm";
import { EditUserRole } from "@/components/users/EditUserRole";
import type { SchoolMember, UserInvitation } from "@/lib/services/userManagementService";

export function UsersPage() {
  const { currentSchool } = useAppStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showInvite, setShowInvite] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SchoolMember | null>(null);
  const [showEditRole, setShowEditRole] = useState(false);

  // Get all users for this school
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["school-users", currentSchool?.id],
    queryFn: () => userManagementService.getSchoolUsers(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  // Get available roles
  const { data: availableRoles } = useQuery({
    queryKey: ["available-roles", currentSchool?.id],
    queryFn: () => userManagementService.getAvailableRoles(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  // Get invitations
  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ["school-invitations", currentSchool?.id],
    queryFn: () => userManagementService.getSchoolInvitations(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  // Deactivate user
  const deactivateMutation = useMutation({
    mutationFn: (userId: string) =>
      userManagementService.deactivateUser(userId, currentSchool!.id),
    onSuccess: () => {
      toast.success("User deactivated");
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error("Failed to deactivate user: " + error.message);
    },
  });

  // Reactivate user
  const reactivateMutation = useMutation({
    mutationFn: (userId: string) =>
      userManagementService.reactivateUser(userId, currentSchool!.id),
    onSuccess: () => {
      toast.success("User reactivated");
      refetchUsers();
    },
    onError: (error: any) => {
      toast.error("Failed to reactivate user: " + error.message);
    },
  });

  // Cancel invitation
  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      userManagementService.cancelInvitation(invitationId),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      queryClient.invalidateQueries({ queryKey: ["school-invitations"] });
    },
    onError: (error: any) => {
      toast.error("Failed to cancel invitation: " + error.message);
    },
  });

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role.key === selectedRole;
    return matchesSearch && matchesRole;
  });

  const filteredInvitations = invitations?.filter((invitation) => {
    return (
      invitation.email.toLowerCase().includes(search.toLowerCase()) ||
      invitation.full_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  if (usersLoading || invitationsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and permissions for your school
          </p>
        </div>
        <Dialog open={showInvite} onOpenChange={setShowInvite}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <InviteUserForm
              schoolId={currentSchool!.id}
              availableRoles={availableRoles || []}
              onSuccess={() => {
                setShowInvite(false);
                refetchUsers();
                toast.success("Invitation sent successfully!");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{users?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Users</p>
            <p className="text-2xl font-bold">
              {users?.filter((u) => u.status === "active").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending Invites</p>
            <p className="text-2xl font-bold">
              {invitations?.filter((i) => i.status === "pending").length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Master Account</p>
            <p className="text-2xl font-bold">
              {users?.filter((u) => u.is_master).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        >
          <option value="all">All Roles</option>
          {availableRoles?.map((role) => (
            <option key={role.id} value={role.key}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {user.user.full_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{user.user.full_name || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">{user.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{user.role.name}</Badge>
                        {user.is_master && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Master
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.status === "active" ? (
                        <Badge variant="success">Active</Badge>
                      ) : user.status === "pending" ? (
                        <Badge variant="warning">Pending</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(user.joined_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditRole(true);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>

                        {user.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deactivateMutation.mutate(user.user_id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reactivateMutation.mutate(user.user_id)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
            </h3>
            <div className="space-y-3">
              {filteredInvitations?.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{invitation.full_name}</p>
                    <p className="text-sm text-muted-foreground">{invitation.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {invitation.role?.name || "No Role"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Expires {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Role Dialog */}
      {selectedUser && (
        <EditUserRole
          userId={selectedUser.user_id}
          currentRoleId={selectedUser.role_id}
          schoolId={currentSchool!.id}
          open={showEditRole}
          onClose={() => {
            setShowEditRole(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            refetchUsers();
            setShowEditRole(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}