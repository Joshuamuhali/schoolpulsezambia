import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ban, AlertCircle, ShieldAlert, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

export function BlockedAccessPage() {
  const navigate = useNavigate();
  const [blockReason, setBlockReason] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkBlockStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth/login", { replace: true });
          return;
        }

        const { data, error } = await supabase.rpc("get_user_block_status", {
          p_user_id: user.id,
        });

        if (error) throw error;

        if (data) {
          // @ts-ignore
          setBlockReason(data.reason || "Terms violation or pending administration review.");
        }
      } catch (err: any) {
        console.error("Failed to check block status", err);
      } finally {
        setLoading(false);
      }
    }

    checkBlockStatus();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logged out successfully");
      navigate("/auth/login", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to log out");
    }
  };

  const handlePaySetupFee = () => {
    navigate("/school/setup-fee-payment");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Checking account status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 font-sans selection:bg-destructive/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="border-destructive/20 shadow-elevated overflow-hidden bg-card">
          <div className="bg-gradient-to-br from-destructive to-destructive/80 p-8 text-center text-destructive-foreground relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldAlert className="h-32 w-32" />
            </div>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 border border-white/20"
            >
              <Ban className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Access Blocked</h1>
            <p className="text-destructive-foreground/80 text-sm mt-1">Your school account access is suspended</p>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="bg-destructive/5 border border-destructive/10 rounded-xl p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-destructive">Administrator Notice</h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Your access to the system has been blocked by the system administrator.
                </p>
                {blockReason && (
                  <div className="mt-3 text-xs bg-destructive/10 border border-destructive/20 rounded-md p-2 text-destructive font-mono">
                    Reason: {blockReason}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-sm text-amber-600 dark:text-amber-400">
              <strong>To regain access:</strong> Pay the setup fee of <strong>K3,500.00</strong> and select your modules to activate the account.
            </div>

            <div className="space-y-3">
              <Button
                onClick={handlePaySetupFee}
                variant="hero"
                className="w-full h-12 text-base flex items-center justify-center gap-2"
              >
                Pay Setup Fee (K3,500.00)
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full h-11 flex items-center justify-center gap-2 border-input hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              Need assistance? Contact support at{" "}
              <a
                href="mailto:support@schoolpulse.com"
                className="text-primary hover:underline font-medium"
              >
                support@schoolpulse.com
              </a>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          School Pulse Platform &bull; Version 2.0
        </p>
      </motion.div>
    </div>
  );
}
