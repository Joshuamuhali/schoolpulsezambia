import { AlertTriangle, ArrowRight, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, type AccessState } from "@/store/appStore";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const bannerConfig: Record<
  AccessState,
  { icon: typeof AlertTriangle; bg: string; text: string; cta: string | null; ctaPath: string | null }
> = {
  preview: {
    icon: AlertTriangle,
    bg: "bg-warning/10 border-warning/30 text-warning-foreground",
    text: "Preview Mode — Your school is not yet activated. All features are visible but locked.",
    cta: "Request Activation",
    ctaPath: "/onboarding/activate",
  },
  payment_pending: {
    icon: Clock,
    bg: "bg-blue-50 border-blue-200 text-blue-900",
    text: "Payment Pending — We are verifying your payment. Access will unlock once confirmed.",
    cta: null,
    ctaPath: null,
  },
  active: {
    icon: AlertTriangle,
    bg: "",
    text: "",
    cta: null,
    ctaPath: null,
  },
  suspended: {
    icon: Ban,
    bg: "bg-destructive/10 border-destructive/30 text-destructive",
    text: "Account Suspended — Your school account has been suspended. Please contact support.",
    cta: null,
    ctaPath: null,
  },
};

export function PreviewBanner() {
  const accessState = useAppStore((s) => s.currentSchool?.accessState);
  const navigate = useNavigate();

  if (!accessState || accessState === "active") return null;

  const config = bannerConfig[accessState];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b px-4 py-3 text-sm font-medium",
        config.bg
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{config.text}</span>
      </div>
      {config.cta && config.ctaPath && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1"
          onClick={() => navigate(config.ctaPath!)}
        >
          {config.cta}
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
