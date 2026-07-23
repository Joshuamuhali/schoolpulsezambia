import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldX,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import {
  fetchAllUsers,
  enableUser,
  disableUser,
  fetchRoles,
  deleteUser,
  blockUser,
  unblockUser,
} from "@/lib/services/adminService";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const UsersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [unblockOpen, setUnblockOpen] = useState(false);
  const [reason, setReason] = useState("");

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, roleFilter, schoolFilter],
    queryFn: () =>
      fetchAllUsers({
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        schoolId: schoolFilter === "all" ? undefined : schoolFilter,
      }),
    staleTime: 30_000,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: fetchRoles,
    staleTime: 300_000,
  });

  const enableMutation = useMutation({
    mutationFn: enableUser,
    onSuccess: () => {
      toast.success("User enabled successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to enable user");
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableUser,
    onSuccess: () => {
      toast.success("User disabled successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to disable user");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete user");
    },
  });

  const blockMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      blockUser(userId, reason),
    onSuccess: () => {
      toast.success("User blocked successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setBlockOpen(false);
      setReason("");
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to block user");
    },
  });

  const unblockMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      unblockUser(userId, reason),
    onSuccess: () => {
      toast.success("User unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setUnblockOpen(false);
      setReason("");
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to unblock user");
    },
  });

  const getRoleBadge = (user: any) => {
    const member = user.school_members?.[0];
    const role = member?.roles;
    if (!role) return <Badge variant="outline">No Role</Badge>;

    const roleColors: Record<string, string> = {
      super_admin: "bg-destructive/10 text-destructive border-destructive/20",
      admin: "bg-primary/10 text-primary border-primary/20",
      teacher: "bg-success/10 text-success border-success/20",
      parent: "bg-info/10 text-info border-info/20",
      student: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="outline" className={roleColors[role.key as string] || ""}>
        {role.name as string}
      </Badge>
    );
  };

  const getStatusBadge = (user: any) => {
    if (user.is_blocked) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <ShieldX className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }
    const isActive = user.school_members?.[0]?.is_active ?? user.is_active;
    return isActive !== false ? (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        <ShieldX className="h-3 w-3 mr-1" />
        Disabled
      </Badge>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load users. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage all platform users across all schools</p>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={role.key}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => navigate("/admin/schools/create")} className="w-full sm:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Create School
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            All Users ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No users found matching your criteria.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => {
                    const member = user.school_members?.[0];
                    const school = member?.schools;
                    const isActive = member?.is_active ?? user.is_active;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" />
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user)}</TableCell>
                        <TableCell>
                          {school ? (
                            <span className="text-sm">{school.name}</span>
                          ) : (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Platform Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/schools/${school?.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View School
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              {user.is_blocked ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setUnblockOpen(true);
                                  }}
                                  className="text-success"
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Unblock User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setBlockOpen(true);
                                  }}
                                  className="text-warning"
                                >
                                  <ShieldX className="h-4 w-4 mr-2" />
                                  Block User
                                </DropdownMenuItem>
                              )}
                              {isActive !== false ? (
                                <DropdownMenuItem
                                  onClick={() => disableMutation.mutate(user.id)}
                                  className="text-muted-foreground"
                                >
                                  <ShieldX className="h-4 w-4 mr-2" />
                                  Disable User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => enableMutation.mutate(user.id)}
                                  className="text-success"
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Enable User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteOpen(true);
                                }}
                                className="text-destructive font-medium focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription className="mt-2">
              Are you absolutely sure you want to delete <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong> ({selectedUser?.email})? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(selectedUser.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Confirmation Dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <ShieldX className="h-5 w-5" />
              Block User Access
            </DialogTitle>
            <DialogDescription className="mt-2">
              You are about to block <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong>. They will be immediately blocked from accessing the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="block-reason">Reason for Blocking</Label>
            <Textarea
              id="block-reason"
              placeholder="e.g. Unpaid setup fees, terms violation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setBlockOpen(false); setReason(""); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => blockMutation.mutate({ userId: selectedUser.id, reason })}
              disabled={blockMutation.isPending || !reason.trim()}
            >
              {blockMutation.isPending ? "Blocking..." : "Block Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Confirmation Dialog */}
      <Dialog open={unblockOpen} onOpenChange={setUnblockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <ShieldCheck className="h-5 w-5" />
              Unblock User Access
            </DialogTitle>
            <DialogDescription className="mt-2">
              Restore system access for <strong>{selectedUser?.first_name} {selectedUser?.last_name}</strong> ({selectedUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="unblock-reason">Notes / Reason for Unblocking</Label>
            <Textarea
              id="unblock-reason"
              placeholder="e.g. Setup fee verified..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setUnblockOpen(false); setReason(""); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => unblockMutation.mutate({ userId: selectedUser.id, reason })}
              disabled={unblockMutation.isPending || !reason.trim()}
            >
              {unblockMutation.isPending ? "Unblocking..." : "Unblock User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;