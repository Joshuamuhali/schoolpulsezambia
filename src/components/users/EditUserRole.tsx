/**
 * Component: EditUserRole
 * Dialog to change user roles with audit trail
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userManagementService } from "@/lib/services/userManagementService";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/services/userManagementService";

interface EditUserRoleProps {
  userId: string;
  currentRoleId: string;
  schoolId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_CATEGORIES = {
  school: {
    title: "School Leadership & Management",
    roles: ["school_owner", "principal", "school_admin", "accountant", "hr_officer", "registrar", "receptionist"],
  },
  academic: {
    title: "Academic Staff",
    roles: ["teacher", "class_teacher", "hod", "head_teacher", "subject_coordinator"],
  },
  finance: {
    title: "Finance & Administration",
    roles: ["finance_director", "payroll_officer", "bursar", "bursar_assistant"],
  },
  students: {
    title: "Student Support",
    roles: ["counselor", "nurse", "sports_director", "librarian"],
  },
  communication: {
    title: "Communication",
    roles: ["comms_officer", "parent_liaison"],
  },
  system: {
    title: "System & Support",
    roles: ["it_support", "secretary"],
  },
};

export function EditUserRole({ userId, currentRoleId, schoolId, open, onClose, onSuccess }: EditUserRoleProps) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState(currentRoleId);
  const [reason, setReason] = useState("");

  // Get available roles
  const { data: availableRoles } = useQuery({
    queryKey: ["available-roles", schoolId],
    queryFn: () => userManagementService.getAvailableRoles(schoolId),
    enabled: open && !!schoolId,
  });

  // Update role mutation
  const mutation = useMutation({
    mutationFn: () =>
      userManagementService.changeUserRole({
        userId,
        schoolId,
        newRoleId: selectedRole,
        reason: reason || undefined,
      }),
    onSuccess: () => {
      toast.success("User role updated successfully");
      queryClient.invalidateQueries({ queryKey: ["school-users", schoolId] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedRole(currentRoleId);
      setReason("");
    }
  }, [open, currentRoleId]);

  // Group roles by category
  const groupedRoles = availableRoles?.reduce((acc, role) => {
    const category = role.category || "school";
    if (!acc[category]) acc[category] = [];
    acc[category].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  const getCategoryTitle = (category: string): string => {
    return ROLE_CATEGORIES[category as keyof typeof ROLE_CATEGORIES]?.title || category;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Changing a user's role will update their permissions and access levels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="font-medium">Current Role</h3>
            <Card className="bg-muted/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">
                    {availableRoles?.find((r) => r.id === currentRoleId)?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {availableRoles?.find((r) => r.id === currentRoleId)?.description || ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Select New Role</h3>
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
              <div className="space-y-4">
                {Object.entries(groupedRoles || {}).map(([category, roles]) => (
                  <div key={category} className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">
                      {getCategoryTitle(category)}
                    </Label>
                    <div className="grid gap-2 pl-2">
                      {roles.map((role) => (
                        <Card
                          key={role.id}
                          className={`cursor-pointer transition-all ${
                            selectedRole === role.id ? "border-primary bg-primary/5" : ""
                          }`}
                          onClick={() => setSelectedRole(role.id)}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <RadioGroupItem value={role.id} id={role.id} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={role.id} className="font-medium cursor-pointer">
                                  {role.name}
                                </Label>
                                {role.module_key && (
                                  <Badge variant="outline" className="text-xs">
                                    {role.module_key}
                                  </Badge>
                                )}
                              </div>
                              {role.description && (
                                <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Change (Optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., User has been promoted to Director"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={selectedRole === currentRoleId || mutation.isPending}
              className="flex-1"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}