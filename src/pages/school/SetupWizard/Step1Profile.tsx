import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail, Phone, MapPin } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

const profileSchema = z.object({
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().optional(),
});

type ProfileData = z.infer<typeof profileSchema>;

export function Step1Profile() {
  const { updateData, nextStep } = useSetupWizard();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
  });

  const onSubmit = (data: ProfileData) => {
    updateData("schoolName", data.schoolName);
    updateData("contactEmail", data.contactEmail);
    updateData("contactPhone", data.contactPhone);
    updateData("address", data.address);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            School Information
          </CardTitle>
          <CardDescription>
            Tell us about your school
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name *</Label>
            <Input
              id="schoolName"
              placeholder="Acacia Country School"
              {...register("schoolName")}
            />
            {errors.schoolName && (
              <p className="text-xs text-destructive">{errors.schoolName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Email *
            </Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder="admin@school.com"
              {...register("contactEmail")}
            />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Phone *
            </Label>
            <Input
              id="contactPhone"
              placeholder="+260 97 123 4567"
              {...register("contactPhone")}
            />
            {errors.contactPhone && (
              <p className="text-xs text-destructive">{errors.contactPhone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address (Optional)
            </Label>
            <Input
              id="address"
              placeholder="123 School Road, Lusaka"
              {...register("address")}
            />
          </div>
        </CardContent>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid}>
          Next: Grades & Classes
        </Button>
      </div>
    </form>
  );
}