import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { School, FileCheck, ClipboardCheck, CheckCircle2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SchoolState } from "@/hooks/useSchoolStatus";

interface SetupBannerProps {
  state: SchoolState;
}

const bannerConfig = {
  no_school: {
    icon: School,
    title: "Complete your school setup",
    description: "Set up your school to unlock all features and start managing your institution.",
    cta: "Set Up School",
    link: "/onboarding/school-setup",
    variant: "default" as const,
  },
  setup_complete: {
    icon: FileCheck,
    title: "Submit KYC to activate your school",
    description: "Complete the KYC verification process to activate your school account.",
    cta: "Complete KYC",
    link: "/onboarding/kyc",
    variant: "default" as const,
  },
  kyc_pending: {
    icon: ClipboardCheck,
    title: "KYC under review",
    description: "Your KYC documents are being reviewed. We'll notify you once approved.",
    cta: null,
    link: null,
    variant: "default" as const,
  },
  kyc_approved: {
    icon: CheckCircle2,
    title: "Choose your modules to finish setup",
    description: "Your KYC has been approved! Select the modules you need for your school.",
    cta: "Select Modules",
    link: "/onboarding/modules",
    variant: "default" as const,
  },
  active: {
    icon: null,
    title: null,
    description: null,
    cta: null,
    link: null,
    variant: "default" as const,
  },
};

export function SetupBanner({ state }: SetupBannerProps) {
  const navigate = useNavigate();
  const config = bannerConfig[state];

  // Don't render anything if state is active
  if (state === 'active' || !config.title) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div className="px-4 lg:px-8 pt-4">
      <Alert variant={config.variant} className="border-primary/20 bg-primary/5">
        <Icon className="h-5 w-5 text-primary" />
        <AlertTitle className="text-base font-semibold">{config.title}</AlertTitle>
        <AlertDescription className="mt-1">
          <p className="text-sm text-muted-foreground mb-3">{config.description}</p>
          {config.cta && config.link && (
            <Button
              size="sm"
              onClick={() => navigate(config.link!)}
              className="mt-2"
            >
              {config.cta}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}