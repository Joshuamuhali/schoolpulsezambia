import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Activity, Loader2, School, User, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signUp, onboardSchool, updateProfile } from "@/lib/services/users";
import { supabase } from "@/lib/supabase/client";
import { checkRateLimit, RATE_LIMITS, getRateLimitKey } from "@/lib/services/rateLimit";
import { ModuleSelector, type Module } from "@/components/modules/ModuleSelector";

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  subdomain: z.string().min(3, "Subdomain must be at least 3 characters")
    .regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type OnboardingValues = z.infer<typeof onboardingSchema>;

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Account, 2: Details, 3: Modules, 4: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
  });

  // Fetch available modules
  const { data: availableModules, isLoading: modulesLoading } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data as Module[];
    },
  });

  // Sync auth state - don't auto-fill or skip steps
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Don't auto-fill or skip steps - let user go through full onboarding
    };
    checkUser();
  }, []);

  const handleCreateAccount = async () => {
    const isValid = await trigger(["fullName", "email", "password", "confirmPassword"]);
    if (!isValid) return;

    setLoading(true);
    setError(null);
    try {
      // Client-side rate limiting
      const email = getValues("email");
      const rateLimitKey = getRateLimitKey(RATE_LIMITS.OTP_REQUEST.keyPrefix, email);
      const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMITS.OTP_REQUEST);

      if (!rateLimitResult.allowed) {
        setError(`Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`);
        setLoading(false);
        return;
      }

      const authResult = await signUp(email, getValues("password"), getValues("fullName"));
      if (authResult.user) {
        setUser(authResult.user);
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof OnboardingValues)[] = [];
    if (step === 2) fieldsToValidate = ["schoolName", "subdomain"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data: OnboardingValues) => {
    if (step !== 4) return;
    if (isSubmittingRef.current) return;
    if (!user) {
      setError("Session lost. Please create your account again.");
      setStep(1);
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      // 1. Update user profile name
      await updateProfile({ full_name: data.fullName });

      // 2. Create school onboarding with selected modules
      const result = await onboardSchool(
        data.schoolName,
        data.subdomain,
        user.id,
        selectedModules.length > 0 ? selectedModules : undefined
      );

      if (!result || !result.school_id) {
        throw new Error("Failed to create school. Please try again.");
      }

      // 3. Set active school
      // @ts-ignore - RPC function not in Supabase generated types yet
      await supabase.rpc("set_active_school", { p_school_id: result.school_id } as any);

      // 4. Refresh session to update JWT claims
      await supabase.auth.refreshSession();

      setSuccess(true);
      setTimeout(() => {
        navigate("/school/setup-fee-payment");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "An error occurred during onboarding.");
      setLoading(false);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card className="text-center p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-6" />
            <CardTitle className="text-2xl mb-2">School Registered!</CardTitle>
            <CardDescription className="text-lg">
              Welcome to School Pulse. <strong>{getValues("schoolName")}</strong> is ready.
            </CardDescription>
              <div className="mt-8">
                <p className="text-sm text-muted-foreground mb-4">Redirecting you to your dashboard...</p>
                <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Activity className="h-10 w-10 text-primary" />
            <span className="font-display text-2xl font-bold">School Pulse</span>
          </div>
          <h1 className="font-display text-3xl font-bold">Create your school</h1>
          <p className="text-muted-foreground mt-2">The most modular platform for African schools</p>
        </div>

        <div className="relative">
          <div className="flex justify-between mb-8 relative px-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  step >= s ? "bg-primary border-primary text-primary-foreground" : "bg-background border-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle2 className="h-6 w-6" /> : <span>{s}</span>}
              </div>
            ))}
            <div className="absolute top-1/2 left-0 h-0.5 w-full bg-muted -translate-y-1/2 z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-primary transition-all duration-300 -translate-y-1/2 z-0"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (step === 4) handleSubmit(onSubmit)(e); }}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Create Your Account
                      </CardTitle>
                      <CardDescription>Enter your details to create your administrator account</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" placeholder="Joshua Muhali" {...register("fullName")} />
                        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="admin@school.com" {...register("email")} />
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" type="password" placeholder="••••••••" {...register("confirmPassword")} />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="button" className="w-full" onClick={handleCreateAccount} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <School className="h-5 w-5 text-primary" />
                        School Details
                      </CardTitle>
                      <CardDescription>Tell us about your school</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">School Name</Label>
                        <Input id="schoolName" placeholder="Acacia Country School" {...register("schoolName")} />
                        {errors.schoolName && <p className="text-xs text-destructive">{errors.schoolName.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subdomain">Subdomain</Label>
                        <div className="flex items-center">
                          <Input id="subdomain" placeholder="acacia" className="rounded-r-none" {...register("subdomain")} />
                          <div className="bg-muted px-3 py-2 border border-l-0 rounded-r-md text-muted-foreground text-sm">.schoolpulse.com</div>
                        </div>
                        {errors.subdomain && <p className="text-xs text-destructive">{errors.subdomain.message}</p>}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="button" onClick={nextStep}>
                        Choose Modules <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Modules</CardTitle>
                      <CardDescription>Choose the features you need for your school</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                      {modulesLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        <ModuleSelector
                          modules={availableModules || []}
                          selected={selectedModules}
                          onSelectionChange={setSelectedModules}
                          showPricing={true}
                        />
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="button" onClick={nextStep} disabled={selectedModules.length === 0}>
                        Review Selection <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Review & Submit</CardTitle>
                      <CardDescription>Final check before we create your school</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <span className="text-muted-foreground">Administrator</span>
                          <p className="font-medium">{getValues("fullName")}</p>
                          <p className="text-xs text-muted-foreground">{getValues("email")}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-muted-foreground">School</span>
                          <p className="font-medium">{getValues("schoolName")}</p>
                          <p className="text-xs text-muted-foreground">{getValues("subdomain")}.schoolpulse.com</p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/50 p-4">
                        <h4 className="font-medium mb-2">Selected Modules</h4>
                        <div className="flex flex-wrap gap-2">
                          {(availableModules || [])
                            .filter(m => selectedModules.includes(m.id))
                            .map(m => (
                              <Badge key={m.id} variant="secondary">
                                {m.name}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      <div className="rounded-lg bg-primary/5 p-4 border border-primary/10 text-sm">
                        <p className="text-primary font-medium mb-1">Setup Fee: K3,500</p>
                        <p className="text-muted-foreground">One-time payment to activate your school. Module fees will be charged separately.</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button type="button" variant="outline" onClick={prevStep} disabled={loading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="submit" variant="hero" disabled={loading}>
                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing...</> : "Complete Registration"}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default OnboardingPage;
