import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { fetchAllSchools, updateSchoolState } from "@/lib/services/schools";
import { formatDistanceToNow } from "date-fns";
import type { School } from "@/lib/supabase/types";

const ActivationQueuePage = () => {
  const qc = useQueryClient();

  // Activation queue = schools in preview or payment_pending state
  const { data: allSchools, isLoading, error } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAllSchools,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const queue = (allSchools ?? []).filter((s: School) =>
    s.state === "preview" || s.state === "payment_pending"
  );

  const activateMutation = useMutation({
    mutationFn: (schoolId: string) => updateSchoolState(schoolId, "active"),
    onSuccess: () => {
      toast.success("School activated successfully");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const suspendMutation = useMutation({
    mutationFn: (schoolId: string) => updateSchoolState(schoolId, "suspended"),
    onSuccess: () => {
      toast.success("School rejected / suspended");
      qc.invalidateQueries({ queryKey: ["admin-schools"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Activation Queue</h1>
        <p className="text-muted-foreground">
          {isLoading ? "Loading…" : `${queue.length} school${queue.length !== 1 ? "s" : ""} pending activation`}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load activation queue.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-56" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-24 rounded" />
                  <Skeleton className="h-8 w-24 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="py-16 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-success/40 mb-3" />
            <p className="font-display font-semibold">All clear</p>
            <p className="text-sm text-muted-foreground mt-1">No schools pending activation.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((school: School) => (
            <Card key={school.id} className="shadow-card border-l-4 border-l-warning">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold">{school.name}</h3>
                      <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 text-xs">
                        {school.state.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{school.subdomain}</p>
                    <p className="text-xs text-muted-foreground">
                      Registered {formatDistanceToNow(new Date(school.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="gap-1 bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => activateMutation.mutate(school.id)}
                      disabled={activateMutation.isPending || suspendMutation.isPending}
                    >
                      {activateMutation.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <CheckCircle className="h-3 w-3" />}
                      Activate
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="gap-1 text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => suspendMutation.mutate(school.id)}
                      disabled={activateMutation.isPending || suspendMutation.isPending}
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivationQueuePage;
