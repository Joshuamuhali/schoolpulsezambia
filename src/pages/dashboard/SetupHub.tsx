import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard, BookOpen, ClipboardCheck, Users2, MessageSquare, ArrowRight, CheckCircle2, Circle, Clock, Lock, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSetupStore, ModuleKey } from "@/store/setupStore";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { modulePricingService, type Feature } from "@/lib/services/modulePricingService";
import { useAppStore } from "@/store/appStore";

const moduleIcons: Record<string, any> = {
  finance: CreditCard,
  exams: BookOpen,
  attendance: ClipboardCheck,
  parent: Users2,
  communication: MessageSquare,
};

const SetupHub = () => {
  const navigate = useNavigate();
  const state = useSetupStore((s) => s.modules);
  const { currentSchool } = useAppStore();

  const { data: schoolFeatures, isLoading } = useQuery({
    queryKey: ["school-features", currentSchool?.id],
    queryFn: () => currentSchool?.id ? modulePricingService.getSchoolFeatures(currentSchool.id) : Promise.resolve([]),
    enabled: !!currentSchool?.id,
  });

  const { data: allFeatures } = useQuery({
    queryKey: ["all-features"],
    queryFn: modulePricingService.getActiveFeatures,
  });

  // Get enabled features for current school
  const enabledFeatures = schoolFeatures?.map((sf: any) => sf.feature_id) || [];

  // Map features to setup modules
  const modules = allFeatures
    ?.filter((f: Feature) => enabledFeatures.includes(f.id))
    .map((f: Feature) => ({
      key: f.code as ModuleKey,
      name: f.name,
      description: f.description,
      icon: moduleIcons[f.code] || CreditCard,
      steps: 4,
      isCore: f.is_core,
      monthlyPrice: f.monthly_price,
    })) || [];

  const completed = modules.filter((m) => state[m.key]?.status === "complete").length;
  const progress = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Module Setup</h1>
        <p className="text-muted-foreground">Configure each activated module before going live.</p>
      </div>

      <Card className="shadow-card bg-gradient-primary text-primary-foreground border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm opacity-80">Overall setup progress</p>
              <p className="font-display text-3xl font-bold">{completed} / {modules.length} modules</p>
            </div>
            <div className="text-right">
              <p className="font-display text-4xl font-bold">{progress}%</p>
              <p className="text-xs opacity-80">{progress === 100 ? "Ready to go live" : "In progress"}</p>
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-primary-foreground/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary-foreground"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading modules...</p>
        </div>
      ) : modules.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Lock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-display font-semibold">No modules activated</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please select and activate modules from the onboarding process
            </p>
            <Button className="mt-4" onClick={() => navigate("/onboarding/modules")}>
              Select Modules
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {modules.map((m, i) => {
            const ms = state[m.key];
            const StatusIcon = ms?.status === "complete" ? CheckCircle2 : ms?.status === "in_progress" ? Clock : Circle;
            const statusLabel = ms?.status === "complete" ? "Complete" : ms?.status === "in_progress" ? "In Progress" : "Not Started";
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="shadow-card hover:shadow-elevated transition-all cursor-pointer h-full" onClick={() => navigate(`/dashboard/setup/${m.key}`)}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center">
                        <m.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {m.isCore && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                            <Star className="h-3 w-3 mr-1" />
                            Required
                          </Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Paid
                        </Badge>
                        <Badge
                          variant={ms?.status === "complete" ? "default" : "secondary"}
                          className={cn(
                            "gap-1",
                            ms?.status === "complete" && "bg-success text-success-foreground hover:bg-success",
                            ms?.status === "in_progress" && "bg-warning/20 text-warning border border-warning/30"
                          )}
                        >
                          <StatusIcon className="h-3 w-3" /> {statusLabel}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold">{m.name}</h3>
                      <p className="text-sm text-muted-foreground">{m.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Step {Math.min(ms?.currentStep + 1 || 1, m.steps)} of {m.steps}
                        </span>
                        {m.monthlyPrice && (
                          <span className="text-xs font-semibold text-primary">
                            K{m.monthlyPrice.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary">
                        {ms?.status === "complete" ? "Review" : ms?.status === "in_progress" ? "Continue" : "Start"}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SetupHub;
