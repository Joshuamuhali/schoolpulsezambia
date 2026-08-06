import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Loader2, ArrowRight, School, MapPin, Phone, User } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

// Helper function to generate unique subdomain
const generateSubdomain = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8);
};

const schoolRegistrationSchema = z.object({
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  schoolType: z.enum(["day", "boarding", "mixed"], {
    required_error: "Please select a school type",
  }),
  province: z.string().min(2, "Province is required"),
  district: z.string().min(2, "District is required"),
  address: z.string().min(5, "Address is required"),
  schoolPhone: z.string().min(10, "School phone number is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  ownerPhone: z.string().min(10, "Owner phone number is required"),
});

type SchoolRegistrationValues = z.infer<typeof schoolRegistrationSchema>;

const SchoolRegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolRegistrationValues>({
    resolver: zodResolver(schoolRegistrationSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    console.log('[SchoolRegistration] Page loaded');
  }, []);

  const onSubmit = async (data: SchoolRegistrationValues) => {
    setLoading(true);
    setError(null);

    try {
      // Check authentication with session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[SchoolRegistration] No active session:', sessionError);
        setError("You must be logged in to register a school. Redirecting to login...");
        setTimeout(() => navigate('/auth/login'), 2000);
        return;
      }

      console.log('[SchoolRegistration] User authenticated:', session.user.email);
      console.log('[SchoolRegistration] Creating school:', data.schoolName);

      // Create school
      const { data: school, error: schoolError } = await (supabase as any)
        .from("schools")
        .insert({
          name: data.schoolName,
          subdomain: generateSubdomain(data.schoolName),
          school_type: data.schoolType,
          province: data.province,
          district: data.district,
          address: data.address,
          contact_phone: data.schoolPhone,
          status: "active",
          onboarding_status: "pending",
          billing_status: "pending",
          subscription_status: "inactive",
          state: "draft",
          type: "private",
          onboarding_step: 1,
          kyc_status: "pending",
          kyc_required: true,
          created_by: session.user.id,
        })
        .select()
        .single();

      if (schoolError || !school) {
        console.error('[SchoolRegistration] School creation failed:', schoolError);
        throw new Error(schoolError?.message || "Failed to create school");
      }

      console.log('[SchoolRegistration] School created:', school.id);

      // Create school_members record
      const { error: memberError } = await (supabase as any)
        .from("school_members")
        .insert({
          school_id: school.id,
          user_id: session.user.id,
          role: "owner",
          status: "active",
        });

      if (memberError) {
        console.error('[SchoolRegistration] School member creation failed:', memberError);
        throw new Error(memberError.message || "Failed to create school membership");
      }

      console.log('[SchoolRegistration] School member created');

      // Update user profile with owner information
      await supabase.auth.updateUser({
        data: {
          full_name: data.ownerName,
          phone: data.ownerPhone,
        }
      });

      setSuccess(true);
      
      // Redirect to module selection after 1 second
      setTimeout(() => {
        navigate("/onboarding/modules");
      }, 1000);
    } catch (err: any) {
      console.error('[SchoolRegistration] Error:', err);
      setError(err.message || "Failed to register school. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12">
          <div className="text-center space-y-6">
            <Activity className="mx-auto h-20 w-20 text-primary" />
            <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <Card className="w-full max-w-md text-center p-8">
            <School className="mx-auto h-16 w-16 text-success mb-4" />
            <CardTitle className="text-2xl mb-2">School Registered!</CardTitle>
            <CardDescription>
              Your school has been registered successfully. Redirecting to module selection...
            </CardDescription>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-success/5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-success"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                opacity: 0.15 + i * 0.08,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-6">
          <Activity className="mx-auto h-20 w-20 text-primary" />
          <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
          <p className="text-primary-foreground/70 max-w-sm">
            Multi-tenant school management — modular, transparent, and built for African schools.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <School className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="font-display text-3xl font-bold text-primary mb-2">
              Register Your School
            </h1>
            <p className="text-muted-foreground">
              Create your school profile to get started
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>
                Provide your school details below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name *</Label>
                  <Input id="schoolName" placeholder="Acacia Country School" {...register("schoolName")} />
                  {errors.schoolName && <p className="text-xs text-destructive">{errors.schoolName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolType">School Type *</Label>
                  <select
                    id="schoolType"
                    {...register("schoolType")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select school type</option>
                    <option value="day">Day School</option>
                    <option value="boarding">Boarding School</option>
                    <option value="mixed">Mixed</option>
                  </select>
                  {errors.schoolType && <p className="text-xs text-destructive">{errors.schoolType.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Province *</Label>
                    <Input id="province" placeholder="Lusaka" {...register("province")} />
                    {errors.province && <p className="text-xs text-destructive">{errors.province.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District *</Label>
                    <Input id="district" placeholder="Lusaka" {...register("district")} />
                    {errors.district && <p className="text-xs text-destructive">{errors.district.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input id="address" placeholder="123 Main Street" {...register("address")} />
                  {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">School Phone Number *</Label>
                  <Input id="schoolPhone" type="tel" placeholder="+260 97 1234567" {...register("schoolPhone")} />
                  {errors.schoolPhone && <p className="text-xs text-destructive">{errors.schoolPhone.message}</p>}
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Owner Information
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Owner Name *</Label>
                      <Input id="ownerName" placeholder="John Doe" {...register("ownerName")} />
                      {errors.ownerName && <p className="text-xs text-destructive">{errors.ownerName.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ownerPhone">Owner Phone Number *</Label>
                      <Input id="ownerPhone" type="tel" placeholder="+260 97 1234567" {...register("ownerPhone")} />
                      {errors.ownerPhone && <p className="text-xs text-destructive">{errors.ownerPhone.message}</p>}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering School...
                    </>
                  ) : (
                    <>
                      Continue to Module Selection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationPage;