import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type WizardStep = {
  title: string;
  description?: string;
  content: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (n: number) => void;
  onComplete: () => void;
  completed?: boolean;
};

export const Wizard = ({ title, subtitle, steps, currentStep, onStepChange, onComplete, completed }: Props) => {
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const done = i < currentStep || completed;
          const active = i === currentStep && !completed;
          return (
            <button
              key={i}
              onClick={() => onStepChange(i)}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <span
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  done && "bg-success border-success text-success-foreground",
                  active && "bg-primary border-primary text-primary-foreground",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium hidden md:inline", active ? "text-foreground" : "text-muted-foreground")}>
                {s.title}
              </span>
              {i < steps.length - 1 && <span className="h-px w-6 bg-border" />}
            </button>
          );
        })}
      </div>

      <motion.div key={currentStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
        <Card className="shadow-card">
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold">{step.title}</h2>
              {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
            </div>
            {step.content}
          </CardContent>
        </Card>
      </motion.div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => onStepChange(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {isLast ? (
          <Button variant="hero" onClick={onComplete}>
            <Check className="h-4 w-4" /> {completed ? "Saved" : "Complete Setup"}
          </Button>
        ) : (
          <Button variant="hero" onClick={() => onStepChange(currentStep + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
