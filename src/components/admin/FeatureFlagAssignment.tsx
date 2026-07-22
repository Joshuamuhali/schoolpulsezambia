import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { fetchFeatureCatalog, fetchSchoolFeatureFlags, upsertFeatureFlag } from "@/lib/services/schools";
import type { FeatureCatalog, SchoolFeatureFlag } from "@/lib/supabase/types";

interface FeatureFlagAssignmentProps {
  schoolId: string;
  onUpdate?: () => void;
}

const FeatureFlagAssignment = ({ schoolId, onUpdate }: FeatureFlagAssignmentProps) => {
  const qc = useQueryClient();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { data: allFeatures, isLoading: featuresLoading } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: fetchFeatureCatalog,
    staleTime: 300_000,
  });

  const { data: schoolFlags, isLoading: flagsLoading } = useQuery({
    queryKey: ["school-feature-flags", schoolId],
    queryFn: () => fetchSchoolFeatureFlags(schoolId),
    enabled: !!schoolId,
  }) as { data: SchoolFeatureFlag[] | undefined; isLoading: boolean };

  const toggleMutation = useMutation({
    mutationFn: async ({ featureId, isActive }: { featureId: string; isActive: boolean }) => {
      setIsUpdating(featureId);
      try {
        await upsertFeatureFlag(schoolId, featureId, isActive ? "active" : "inactive");
      } finally {
        setIsUpdating(null);
      }
    },
    onSuccess: () => {
      toast.success("Feature flag updated");
      qc.invalidateQueries({ queryKey: ["school-feature-flags", schoolId] });
      onUpdate?.();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getFeatureStatus = (featureId: string): SchoolFeatureFlag | undefined => {
    return schoolFlags?.find((flag) => flag.feature_id === featureId);
  };

  const isFeatureActive = (featureId: string): boolean => {
    const flag = getFeatureStatus(featureId);
    return flag?.status === "active";
  };

  if (featuresLoading || flagsLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allFeatures || allFeatures.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            No features available in the catalog.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allFeatures.map((feature: FeatureCatalog) => {
            const isActive = isFeatureActive(feature.id);
            const isPending = isUpdating === feature.id;

            return (
              <div
                key={feature.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{feature.name}</p>
                    <Badge variant="outline" className={isActive ? "text-success border-success/30" : "text-muted-foreground"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{feature.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Switch
                    checked={isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ featureId: feature.id, isActive: checked })
                    }
                    disabled={isPending || toggleMutation.isPending}
                    aria-label={`Toggle ${feature.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureFlagAssignment;