import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CheckCircle2, ArrowRight, School, Settings, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WelcomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Log welcome page visit
    console.log('[WelcomePage] User confirmed email, starting onboarding');
  }, []);

  const steps = [
    {
      icon: School,
      title: "School Setup",
      description: "Configure your school profile and basic information"
    },
    {
      icon: Settings,
      title: "Module Selection",
      description: "Choose the features and tools your school needs"
    },
    {
      icon: FileCheck,
      title: "Verification",
      description: "Complete KYC verification and activate your account"
    }
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-success/5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-success"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                opacity: 0.15 + i * 0.08,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-6">
          <Activity className="mx-auto h-20 w-20 text-primary" />
          <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
          <p className="text-primary-foreground/70 max-w-sm">
            Multi-tenant school management — modular, transparent, and built for African schools.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success mb-4" />
            <h1 className="font-display text-4xl font-bold text-primary mb-2">
              Welcome to School Pulse!
            </h1>
            <p className="text-lg text-muted-foreground">
              Your email has been verified successfully. Let's get your school set up.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>
                Complete these three simple steps to activate your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 text-primary">
                        <step.icon className="h-6 w-6" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary mb-1">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/onboarding/school-registration')}
              className="gap-2"
            >
              Continue Setup
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;