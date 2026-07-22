import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModuleSelector, type Module } from "@/components/modules/ModuleSelector";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

export function ActivationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentSchool } = useAppStore();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Fetch all available modules
  const { data: allModules, isLoading: modulesLoading } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("*")
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      return data as Module[];
    },
  });

  // Fetch current feature flags
  const { data: currentFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ["school-feature-flags", currentSchool?.id],
    queryFn: async () => {
      if (!currentSchool?.id) return [];
      const { data, error } = await (supabase as any)
        .from("school_feature_flags")
        .select("feature_id, status")
        .eq("school_id", currentSchool.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentSchool?.id,
  });

  // Get already active modules
  const activeModuleIds = currentFlags
    ?.filter((f) => f.status === "active")
    .map((f) => f.feature_id) || [];

  // Mutation to activate modules
  const activateMutation = useMutation({
    mutationFn: async (moduleIds: string[]) => {
      if (!currentSchool?.id) throw new Error("No school selected");

      // Create feature flags for selected modules
      const promises = moduleIds.map((id) =>
        (supabase as any)
          .from("school_feature_flags")
          .upsert({
            school_id: currentSchool.id,
            feature_id: id,
            status: "active",
            enabled_at: new Date().toISOString(),
          })
      );

      await Promise.all(promises);

      // Update school state to active
      await (supabase as any)
        .from("schools")
        .update({ state: "active" })
        .eq("id", currentSchool.id);

      // Refresh session for updated JWT
      await supabase.auth.refreshSession();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["current-school"] });
      navigate("/dashboard/setup");
    },
  });

  if (modulesLoading || flagsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Activate Your School</h1>
          <p className="text-muted-foreground mt-2">
            Select the modules you need to get started
          </p>
        </div>

        {currentSchool?.state === "preview" && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your school is in preview mode. Select modules to activate your
              account.
            </AlertDescription>
          </Alert>
        )}

        <ModuleSelector
          modules={allModules || []}
          selected={selectedModules}
          onSelectionChange={setSelectedModules}
          showPricing={true}
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => activateMutation.mutate(selectedModules)}
            disabled={selectedModules.length === 0 || activateMutation.isPending}
            className="flex-1"
          >
            {activateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Activate {selectedModules.length} Module
                {selectedModules.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}