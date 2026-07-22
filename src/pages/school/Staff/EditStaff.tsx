import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as staffService from "@/lib/services/staffService";
import { useAppStore } from "@/store/appStore";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const staffSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

export function EditStaff() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentSchool } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  // Fetch staff data
  const { data: staff, isLoading: staffLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffService.getStaffProfile(id!),
    enabled: !!id,
  });

  // Fetch staff types
  const { data: staffTypes } = useQuery({
    queryKey: ["staffTypes", currentSchool?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_types")
        .select("*")
        .eq("school_id", currentSchool!.id)
        .order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentSchool?.id,
  });

  // Set form values when staff data loads
  if (staff && !watch("first_name")) {
    setValue("first_name", staff.first_name);
    setValue("last_name", staff.last_name);
    setValue("email", staff.email || "");
    setValue("phone", staff.phone || "");
  }

  const mutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const staffData: any = {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
      };

      return staffService.updateStaffProfile(id!, staffData);
    },
    onSuccess: () => {
      toast.success("Staff member updated successfully");
      navigate("/dashboard/staff");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to update staff member");
    },
  });

  const onSubmit = (data: StaffFormData) => {
    mutation.mutate(data);
  };

  if (staffLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!staff) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Staff member not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard/staff")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Staff Member</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  {...register("first_name")}
                  className={errors.first_name ? "border-destructive" : ""}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  {...register("last_name")}
                  className={errors.last_name ? "border-destructive" : ""}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/staff")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Staff Member"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}