import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, CheckCircle, XCircle, AlertCircle, X, Loader2, RefreshCw, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PaymentDetails {
  has_pending: boolean;
  amount: number;
  payment_id?: string;
  reference?: string;
  submitted_at?: string;
}

interface PaymentConfirmation {
  setup_fee: PaymentDetails;
  modules: PaymentDetails;
}

export function PaymentConfirmationPopUp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState<PaymentConfirmation | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed this pop-up recently (within 2 hours)
  const checkDismissed = () => {
    if (!user) return false;
    const dismissedUntil = localStorage.getItem(`payment_confirmation_dismissed_${user.id}`);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      return true;
    }
    return false;
  };

  const fetchPendingConfirmations = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get school_id from school_members
      const { data: member } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!member?.school_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_pending_confirmations", {
        p_school_id: member.school_id,
      });

      if (error) throw error;

      if (data) {
        // Fetch detailed payment info for setup fee
        const { data: setupFeeData } = await supabase
          .from("school_payments")
          .select("id, amount, reference, created_at, status")
          .eq("school_id", member.school_id)
          .eq("payment_type", "setup_fee")
          .eq("status", "pending")
          .maybeSingle();

        // Fetch detailed payment info for modules
        const { data: modulesData } = await supabase
          .from("school_payments")
          .select("id, amount, reference, created_at, status")
          .eq("school_id", member.school_id)
          .eq("payment_type", "subscription")
          .eq("status", "pending")
          .maybeSingle();

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
      }
    } catch (error) {
      console.error("Error fetching pending confirmations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDismissed(checkDismissed());
    fetchPendingConfirmations();
  }, [user]);

  const handleDismiss = () => {
    if (!user) return;
    const dismissUntil = new Date();
    dismissUntil.setHours(dismissUntil.getHours() + 2);
    localStorage.setItem(`payment_confirmation_dismissed_${user.id}`, dismissUntil.toISOString());
    setDismissed(true);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPendingConfirmations();
    toast.success("Payment status updated.");
  };

  if (loading) return null;
  if (dismissed) return null;
  if (!pendingPayments) return null;

  const hasSetupPending = pendingPayments.setup_fee.has_pending;
  const hasModulesPending = pendingPayments.modules.has_pending;

  if (!hasSetupPending && !hasModulesPending) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <Card className="border-primary/20 shadow-elevated bg-card/95 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning animate-pulse" />
            Payment Verification
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Your payment is currently being reviewed by system administrators. Access to related modules is pending approval.
          </p>

          {hasSetupPending && (
            <div className="p-3 bg-warning/5 border border-warning/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-warning">One-Time Setup Fee</span>
                <Badge variant="outline" className="bg-warning/10 text-warning border-none text-[10px]">
                  Pending
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-medium">K{Number(pendingPayments.setup_fee.amount).toLocaleString()}</span>
              </div>
              {pendingPayments.setup_fee.reference && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono">{pendingPayments.setup_fee.reference}</span>
                </div>
              )}
            </div>
          )}

          {hasModulesPending && (
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Active Modules Payment</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-none text-[10px]">
                  Pending
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-medium">K{Number(pendingPayments.modules.amount).toLocaleString()}</span>
              </div>
              {pendingPayments.modules.reference && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono">{pendingPayments.modules.reference}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={handleRefresh}>
              <RefreshCw className="h-3 w-3" />
              Refresh Status
            </Button>
            <Button size="sm" variant="default" className="flex-1 text-xs" onClick={handleDismiss}>
              I Understand
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
