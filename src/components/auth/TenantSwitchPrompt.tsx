import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/appStore";
import { supabase } from "@/lib/supabase/client";

export const TenantSwitchPrompt = () => {
  const mismatch = useAppStore((s) => s.contextMismatch);
  const currentSchool = useAppStore((s) => s.currentSchool);
  const setContextMismatch = useAppStore((s) => s.setContextMismatch);
  const [loading, setLoading] = useState(false);

  if (!mismatch) return null;

  const handleSwitch = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("set_active_school", {
        p_school_id: mismatch.targetSchoolId,
      });
      if (error) throw error;

      // Refresh session to get new JWT claims
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (refreshErr) throw refreshErr;

      // useAuth will catch the session change and reload context, 
      // which calls setCurrentSchool and clears the mismatch.
    } catch (err) {
      console.error("Failed to switch school context:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setContextMismatch(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md"
        >
          <Card className="border-warning/50 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3 text-warning mb-2">
                <AlertTriangle className="h-6 w-6" />
                <CardTitle>Switch School Context?</CardTitle>
              </div>
              <CardDescription>
                You are currently visiting <strong>{mismatch.targetSubdomain}.schoolpulse.com</strong>, 
                but your active session is set to <strong>{currentSchool?.name || "another school"}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Would you like to switch your active session to <strong>{mismatch.targetSchoolName}</strong>? 
                This will allow you to access data for this school.
              </p>
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleDismiss}
                disabled={loading}
              >
                Keep Current
              </Button>
              <Button 
                variant="primary" 
                className="flex-1" 
                onClick={handleSwitch}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Switch Context"}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
