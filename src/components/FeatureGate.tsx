import { type ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { type FeatureKey } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type FeatureGateProps = {
  featureKey: FeatureKey;
  children: ReactNode;
  /** If true, renders children greyed out with a lock overlay instead of blocking entirely */
  showPreview?: boolean;
};

/**
 * Wraps any module/component with feature-gating logic.
 * - If feature is active: renders children normally.
 * - If locked: renders children greyed out with overlay + lock modal on click.
 */
export function FeatureGate({ featureKey, children, showPreview = true }: FeatureGateProps) {
  const { enabled, locked, lockReason, mode } = useFeatureAccess(featureKey);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  if (enabled) return <>{children}</>;

  if (!showPreview) {
    // Don't render at all if not enabled and showPreview is false
    return null;
  }

  return (
    <>
      {/* Greyed-out children with click blocker */}
      <div
        className={cn(
          "relative select-none",
          locked && "opacity-50 grayscale pointer-events-none"
        )}
        aria-disabled="true"
      >
        {children}

        {/* Transparent click-capture overlay */}
        <div
          className="absolute inset-0 z-10 cursor-not-allowed pointer-events-auto"
          role="button"
          aria-label="Feature locked"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
        />
      </div>

      {/* Lock modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <DialogTitle className="text-center">Feature Not Activated</DialogTitle>
            <DialogDescription className="text-center">
              {lockReason}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 pt-2">
                      {mode === "preview" && (
                        <Button
                          onClick={() => {
                            setModalOpen(false);
                            navigate("/onboarding/activate");
                          }}
                        >
                          Activate School
                        </Button>
                      )}
                      {mode === "inactive" && (
                        <Button
                          onClick={() => {
                            setModalOpen(false);
                            navigate("/dashboard/setup");
                          }}
                        >
                          Configure Modules
                        </Button>
                      )}
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
