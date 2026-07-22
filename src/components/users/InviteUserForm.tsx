/**
 * Component: InviteUserForm
 * Form to invite new users to the school
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { userManagementService } from "@/lib/services/userManagementService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@/lib/services/userManagementService";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  full_name: z.string().min(1, "Full name is required"),
  role_id: z.string().min(1, "Please select a role"),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserFormProps {
  schoolId: string;
  availableRoles: Role[];
  onSuccess: () => void;
}

export function InviteUserForm({ schoolId, availableRoles, onSuccess }: InviteUserFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  const onSubmit = async (data: InviteFormData) => {
    setLoading(true);
    setError(null);

    try {
      await userManagementService.inviteUser({
        schoolId,
        email: data.email,
        fullName: data.full_name,
        roleId: data.role_id,
        sendWelcome: true,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to invite user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="full_name">Full Name *</Label>
        <Input
          id="full_name"
          placeholder="e.g., John Doe"
          {...register("full_name")}
          className={errors.full_name ? "border-destructive" : ""}
        />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@school.com"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role *</Label>
        <Select onValueChange={(value) => setValue("role_id", value)}>
          <SelectTrigger className={errors.role_id ? "border-destructive" : ""}>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
                {role.module_key && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({role.module_key})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role_id && (
          <p className="text-sm text-destructive">{errors.role_id.message}</p>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        <p>An invitation email will be sent to the user with login instructions.</p>
        <p className="mt-1">Invites expire after 7 days.</p>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Invite...
          </>
        ) : (
          "Send Invitation"
        )}
      </Button>
    </form>
  );
}