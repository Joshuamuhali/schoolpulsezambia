import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Receipt,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/types/feature";
import { toast } from "sonner";

interface PaymentConfirmation {
  setup_fee: {
    has_pending: boolean;
    amount: number;
    payment_id: string;
    reference: string;
    submitted_at: string;
  };
  modules: {
    has_pending: boolean;
    amount: number;
    payment_id: string;
    reference: string;
    submitted_at: string;
  };
}

export function PaymentConfirmationPopUp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<PaymentConfirmation | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Check if user has dismissed this pop-up recently
  const checkDismissed = () => {
    const dismissedKey = `payment_confirmation_dismissed_${user?.id}`;
    const dismissedUntil = localStorage.getItem(dismissedKey);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      return true;
    }
    return false;
  };

  // Fetch pending confirmations
  const fetchPendingConfirmations = async () => {
    if (!user?.user_metadata?.school_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc("get_pending_confirmations", {
        p_school_id: user.user_metadata.school_id,
      });

      if (error) throw error;

      // Also get full payment details for setup fee
      const { data: setupFeeData } = await (supabase as any)
        .from("school_payments")
        .select("id, amount, reference, created_at, status")
        .eq("school_id", user.user_metadata.school_id)
        .eq("payment_type", "setup_fee")
        .eq("status", "pending")
        .maybeSingle();

      // Get full payment details for modules
      const { data: modulesData } = await (supabase as any)
        .from("school_payments")
        .select("id, amount, reference, created_at, status")
        .eq("school_id", user.user_metadata.school_id)
        .eq("payment_type", "subscription")
        .eq("status", "pending")
        .maybeSingle();

      if (error) {
        console.error("Error fetching pending confirmations:", error);
        return;
      }

      setPendingPayments({
        setup_fee: {
          has_pending: !!setupFeeData || data?.setup_fee?.has_pending || false,
          amount: setupFeeData?.amount || data?.setup_fee?.amount || 0,
          payment_id: setupFeeData?.id || "",
          reference: setupFeeData?.reference || "",
          submitted_at: setupFeeData?.created_at || "",
        },
        modules: {
          has_pending: !!modulesData || data?.modules?.has_pending || false,
          amount: modulesData?.amount || data?.modules?.amount || 0,
          payment_id: modulesData?.id || "",
          reference: modulesData?.reference || "",
          submitted_at: modulesData?.created_at || "",
        },
      });
    } catch (error) {
      console.error("Error fetching pending confirmations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss pop-up
  const handleDismiss = () => {
    const dismissedKey = `payment_confirmation_dismissed_${user?.id}`;
    const dismissUntil = new Date();
    dismissUntil.setHours(dismissUntil.getHours() + 2); // Dismiss for 2 hours
    localStorage.setItem(dismissedKey, dismissUntil.toISOString());
    setDismissed(true);
  };

  // Refresh status
  const handleRefresh = async () => {
    setLoading(true);
    await fetchPendingConfirmations();
    toast.success("Payment status updated.");
  };

  // Navigate to payment page
  const handleMakePayment = (type: "setup_fee" | "modules") => {
    if (type === "setup_fee") {
      navigate("/payment/setup-fee");
    } else {
      navigate("/onboarding/payment");
    }
  };

  // Check if there are pending payments and pop-up hasn't been dismissed
  const hasPending = pendingPayments?.setup_fee?.has_pending || pendingPayments?.modules?.has_pending;

  useEffect(() => {
    fetchPendingConfirmations();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchPendingConfirmations();
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // Check dismissed status on mount
  useEffect(() => {
    if (checkDismissed()) {
      setDismissed(true);
    }
  }, []);

  // If no pending payments or dismissed, don't show
  if (!hasPending || dismissed || loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-2xl w-full mx-4 animate-in slide-in-from-bottom-4 duration-300">
        <Card className="border-2 border-yellow-200 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full animate-pulse">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">
                    ⏳ Payment Confirmation Required
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Your payment is awaiting approval. Some features are temporarily locked.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Countdown warning */}
            {countdown > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Auto-refreshing in {countdown}s...
              </div>
            )}

            {/* Pending payments list */}
            <div className="space-y-3">
              {pendingPayments?.setup_fee?.has_pending && (
                <PaymentStatusCard
                  type="setup_fee"
                  amount={pendingPayments.setup_fee.amount}
                  reference={pendingPayments.setup_fee.reference}
                  submittedAt={pendingPayments.setup_fee.submitted_at}
                  status="pending"
                />
              )}

              {pendingPayments?.modules?.has_pending && (
                <PaymentStatusCard
                  type="modules"
                  amount={pendingPayments.modules.amount}
                  reference={pendingPayments.modules.reference}
                  submittedAt={pendingPayments.modules.submitted_at}
                  status="pending"
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Check Status
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Clock className="w-4 h-4" />
                Refresh Now
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                Need help? Contact{" "}
                <a href="mailto:support@schoolpulse.com" className="text-indigo-600 hover:underline">
                  support@schoolpulse.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function PaymentStatusCard({ type, amount, reference, submittedAt, status }: any) {
  const isSetupFee = type === "setup_fee";
  const formattedDate = submittedAt ? new Date(submittedAt).toLocaleString() : "Just now";

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSetupFee ? (
            <CreditCard className="w-5 h-5 text-purple-600" />
          ) : (
            <Receipt className="w-5 h-5 text-blue-600" />
          )}
          <div>
            <p className="font-medium text-gray-900">
              {isSetupFee ? "Setup Fee" : "Module Subscription"}
            </p>
            <p className="text-sm text-gray-500">
              {formatCurrency(amount)}
              {reference && ` • Ref: ${reference}`}
            </p>
            <p className="text-xs text-gray-400">Submitted: {formattedDate}</p>
          </div>
        </div>
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </Badge>
      </div>
    </div>
  );
}