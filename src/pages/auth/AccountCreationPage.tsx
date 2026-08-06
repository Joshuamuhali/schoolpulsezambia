import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Activity, Loader2, User, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { signUp } from "@/lib/services/users";
import { supabase } from "@/lib/supabase/client";
import { checkRateLimit, RATE_LIMITS, getRateLimitKey } from "@/lib/services/rateLimit";

const accountCreationSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, "You must accept the terms and conditions")
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type AccountCreationValues = z.infer<typeof accountCreationSchema>;

const AccountCreationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const isSubmittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<AccountCreationValues>({
    resolver: zodResolver(accountCreationSchema),
    mode: "onBlur",
  });

  const password = watch("password");

  // Calculate password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;
    setPasswordStrength(strength);
  }, [password]);

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return "bg-red-500";
    if (passwordStrength <= 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Fair";
    if (passwordStrength <= 4) return "Good";
    return "Strong";
  };

  const handleCreateAccount = async () => {
    const isValid = await trigger(["fullName", "email", "phone", "password", "confirmPassword", "terms"]);
    if (!isValid) return;

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

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
        isSubmittingRef.current = false;
        return;
      }

      const payload = {
        email: getValues("email"),
        password: getValues("password"),
        options: {
          data: {
            full_name: getValues("fullName"),
            phone: getValues("phone"),
          },
        },
      };

      console.log('[account-creation] signUp payload', { ...payload, password: '[redacted]' });

      const authResult = await signUp(payload.email, payload.password, payload.options.data.full_name, getValues("phone"));

      if (authResult.user) {
        console.log('[account-creation] Account created successfully', { 
          userId: authResult.user.id, 
          email: payload.email,
          emailConfirmed: authResult.user.email_confirmed_at,
          confirmationSent: authResult.user.confirmation_sent_at,
          hasSession: !!authResult.session
        });
        
        // Store email for confirmation flow
        const userEmail = payload.email;
        setRegisteredEmail(userEmail);
        localStorage.setItem('pending_confirmation_email', userEmail);
        
        // Check if email confirmation is required
        if (!authResult.session) {
          // Email confirmation required - navigate to confirmation page
          navigate('/auth/confirm-email');
        } else {
          // User is already confirmed (session exists) - auto-confirmed
          // This should not happen if email confirmation is enabled
          console.warn('[account-creation] User has session without email confirmation');
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (success) {
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
            <Card className="text-center p-8">
              <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-6" />
              <CardTitle className="text-2xl mb-2">Account Created!</CardTitle>
              <CardDescription className="text-lg mb-4">
                Welcome to School Pulse. Your account has been created successfully.
              </CardDescription>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-2">📧 Check your email to verify your account</p>
                <p className="text-xs text-blue-600">
                  We've sent a confirmation link to <strong>{registeredEmail}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Didn't receive the email?</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/auth/confirm-email')}
                >
                  Resend Confirmation Email
                </Button>
              </div>
            </Card>
          </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center lg:text-left">
            <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
              <Activity className="h-8 w-8 text-primary" />
              <span className="font-display text-xl font-bold text-primary">School Pulse</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-primary mb-2">Create Your Account</h1>
            <p className="mt-1 text-muted-foreground">Get started with School Pulse</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="Joshua Muhali" {...register("fullName")} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" type="email" placeholder="admin@school.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input id="phone" type="tel" placeholder="+260 97 1234567" {...register("phone")} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                {password && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{getPasswordStrengthText()}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  {...register("terms")}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm font-normal cursor-pointer">
                  I agree to the{" "}
                  <Link to="/legal/terms" className="text-primary hover:underline" target="_blank">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/legal/privacy" className="text-primary hover:underline" target="_blank">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
            </CardContent>
            <CardFooter>
              <Button
                type="button"
                className="w-full"
                onClick={handleCreateAccount}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </CardFooter>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/auth/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AccountCreationPage;