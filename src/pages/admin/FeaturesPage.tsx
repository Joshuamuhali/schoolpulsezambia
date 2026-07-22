import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { fetchFeatureCatalog } from "@/lib/services/schools";
import { supabase } from "@/lib/supabase/client";

const FeaturesPage = () => {
  const qc = useQueryClient();

  const { data: features, isLoading, error } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: fetchFeatureCatalog,
    staleTime: 300_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("feature_catalog")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feature catalog updated");
      qc.invalidateQueries({ queryKey: ["feature-catalog"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Feature Catalog</h1>
        <p className="text-muted-foreground">Control which modules are available to schools.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load feature catalog.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="flex justify-between pt-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : !features || features.length === 0 ? (
          <p className="col-span-full py-12 text-center text-muted-foreground">No features in catalog.</p>
        ) : (
          features.map((f) => (
            <Card key={f.id} className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="outline" className={f.is_active ? "text-success border-success/30 bg-success/10" : "text-muted-foreground"}>
                    {f.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-display font-semibold">{f.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">K {f.monthly_price}/mo</span>
                    {f.setup_fee > 0 && <span> + K {f.setup_fee} setup</span>}
                  </div>
                  <Switch
                    checked={f.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: f.id, isActive: checked })}
                    disabled={toggleMutation.isPending}
                    aria-label={`Toggle ${f.name}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default FeaturesPage;
