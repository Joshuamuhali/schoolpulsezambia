import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";

const ConfirmEmailPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const pendingEmail = localStorage.getItem('pending_confirmation_email');
    if (pendingEmail) {
      setEmail(pendingEmail);
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!email || countdown > 0) return;

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Confirmation email sent! Please check your inbox.'
      });
      setCountdown(60);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to resend email. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    localStorage.removeItem('pending_confirmation_email');
    navigate('/auth/account-creation');
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12">
        <div className="text-center space-y-6">
          <Mail className="mx-auto h-20 w-20 text-primary" />
          <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="font-display text-3xl font-bold text-primary">Check Your Email</h1>
            <p className="mt-2 text-muted-foreground">
              We've sent a confirmation link to your email address
            </p>
          </div>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="pt-6 space-y-6">
              {email && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium">Confirmation link sent to:</p>
                  <p className="text-sm text-blue-600 break-all">{email}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleResendEmail}
                  disabled={loading || countdown > 0 || !email}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in ${countdown}s`
                  ) : (
                    'Resend Confirmation Email'
                  )}
                </Button>

                <Button
                  onClick={handleChangeEmail}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Email Address
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            Already confirmed?{" "}
            <Link to="/auth/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmailPage;