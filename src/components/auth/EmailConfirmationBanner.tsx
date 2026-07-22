import { useState, useEffect } from "react";
import { AlertTriangle, Mail, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resendConfirmationEmail } from "@/lib/services/emailService";
import { useAuth } from "@/hooks/useAuth";

export function EmailConfirmationBanner() {
  const { user, loading } = useAuth();
  const [emailConfirmed, setEmailConfirmed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkConfirmation = async () => {
      if (!user?.id) {
        setChecking(false);
        return;
      }

      try {
        // Check if email is confirmed via user metadata
        const confirmed = !!user.email_confirmed_at;
        setEmailConfirmed(confirmed);
      } catch (error) {
        console.error('Failed to check email confirmation:', error);
      } finally {
        setChecking(false);
      }
    };

    if (!loading) {
      checkConfirmation();
    }
  }, [user, loading]);

  const handleResend = async () => {
    if (!user?.email) return;

    setResending(true);
    setMessage(null);

    try {
      const result = await resendConfirmationEmail(user.email);
      setMessage(result.message);
    } catch (error) {
      setMessage('Failed to send confirmation email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Don't show if loading, no user, or already confirmed
  if (loading || checking || !user || emailConfirmed === true || emailConfirmed === null) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium">Email not confirmed</p>
          <p className="text-sm mt-1">
            Please confirm your email address to access all features. 
            Check your inbox for the confirmation link.
          </p>
          {message && (
            <p className="text-sm mt-2 font-medium">{message}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleResend}
          disabled={resending}
          className="shrink-0"
        >
          {resending ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-3 w-3" />
              Resend
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}