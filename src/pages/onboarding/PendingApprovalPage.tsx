import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Clock, CheckCircle2, FileText, CreditCard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";

const PendingApprovalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);

  useEffect(() => {
    loadSchoolData();
  }, []);

  const loadSchoolData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth/login');
        return;
      }

      // Get school data
      const { data: memberData } = await (supabase as any)
        .from('school_members')
        .select('school_id, schools(*)')
        .eq('user_id', user.id)
        .single();

      if (!memberData?.schools) {
        navigate('/onboarding/welcome');
        return;
      }

      setSchoolData(memberData.schools);
    } catch (err) {
      console.error('[PendingApproval] Error loading data:', err);
      setError('Failed to load application status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12">
          <Activity className="h-20 w-20 text-primary" />
        </div>
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading application status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen">
        <div className="flex flex-1 items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
            <Clock className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
            <h1 className="font-display text-3xl font-bold text-primary mb-2">
              Application Under Review
            </h1>
            <p className="text-lg text-muted-foreground">
              Your school application is being reviewed by our team
            </p>
          </div>

          {schoolData && (
            <Card>
              <CardHeader>
                <CardTitle>Application Summary</CardTitle>
                <CardDescription>
                  School: {schoolData.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">School Registration</p>
                      <p className="text-sm text-muted-foreground">School profile created</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Module Selection</p>
                      <p className="text-sm text-muted-foreground">Features selected</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">KYC Verification</p>
                      <p className="text-sm text-muted-foreground">Documents submitted</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Payment Details</p>
                      <p className="text-sm text-muted-foreground">Payment information submitted</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Admin Approval</p>
                      <p className="text-sm text-muted-foreground">Pending review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                Our team will review your application within <strong>1-2 business days</strong>.
              </p>
              <p>
                We'll verify:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>School registration details</li>
                <li>KYC documents</li>
                <li>Selected modules and pricing</li>
                <li>Payment confirmation</li>
              </ul>
              <p className="text-muted-foreground">
                You'll receive an email once your account is approved. After approval, you can access your dashboard and start setting up your school.
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need help? Contact us at{' '}
              <a href="mailto:support@schoolpulse.com" className="text-primary hover:underline">
                support@schoolpulse.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalPage;