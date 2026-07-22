import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSetupWizard } from "@/hooks/useSetupWizard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Step1Profile } from "./Step1Profile";
import { Step2Grades } from "./Step2Grades";
import { Step3Fees } from "./Step3Fees";
import { Step4StaffTypes } from "./Step4StaffTypes";
import { Step5Staff } from "./Step5Staff";
import { Step6Pupils } from "./Step6Pupils";
import { Step7Review } from "./Step7Review";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { saveCompleteSetup } from "@/lib/services/schoolSetupService";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";


export function SetupWizard() {
  const navigate = useNavigate();
  const { currentStep, steps, progress, nextStep, prevStep, data, isComplete } = useSetupWizard();
  const [loading, setLoading] = useState(false);
  const currentSchool = useAppStore((s) => s.currentSchool);
  const setAccessState = useAppStore((s) => s.setAccessState);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Profile />;
      case 2:
        return <Step2Grades />;
      case 3:
        return <Step3Fees />;
      case 4:
        return <Step4StaffTypes />;
      case 5:
        return <Step5Staff />;
      case 6:
        return <Step6Pupils />;
      case 7:
        return <Step7Review />;
      default:
        return null;
    }
  };

  const handleComplete = async () => {
    if (!currentSchool) {
      toast.error("No active school session found.");
      return;
    }
    setLoading(true);
    try {
      // Save all setup data to database
      await saveCompleteSetup(currentSchool.id, data as any);

      // Update school state in database to 'active'
      const { error: dbError } = await supabase
        .from("schools")
        .update({ state: "active" as import("@/lib/supabase/types").AccessState })
        .eq("id", currentSchool.id);

      if (dbError) throw dbError;

      // Update access state in local store
      setAccessState("active");
      
      toast.success("School setup complete!");
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error completing setup:", error);
      toast.error("Failed to save setup: " + (error.message || error));
    } finally {
      setLoading(false);
    }
  };


  if (isComplete) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-success/10 p-4">
              <svg
                className="h-16 w-16 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold">Setup Complete!</h1>
          <p className="text-muted-foreground">
            Your school has been successfully configured.
          </p>
          <Button onClick={() => navigate("/dashboard")} size="lg">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Set Up Your School</h1>
        <p className="text-muted-foreground">
          Complete these steps to get your school fully configured
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep} of {steps.length}
          </span>
          <span className="font-medium">{steps[currentStep - 1]?.title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col items-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  currentStep >= step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs hidden sm:block ${
                  currentStep >= step.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-card rounded-lg border p-6">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            disabled={loading}
          >
            Skip for Now
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={nextStep} disabled={loading}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Completing..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}