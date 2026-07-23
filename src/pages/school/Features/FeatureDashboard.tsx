import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  AlertTriangle,
  Pause,
  Play,
  Trash2,
  Calendar,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface FeatureLifecycle {
  school_id: string;
  school_name: string;
  feature_code: string;
  feature_name: string;
  category: string;
  status: "active" | "paused" | "expired" | "pending" | "removed";
  price_at_activation: number;
  billing_frequency: string;
  activated_at: string;
  expires_at: string | null;
  grace_period_ends_at: string | null;
  paused_at: string | null;
  paused_reason: string | null;
  reactivation_count: number;
  next_billing_date: string | null;
  total_paused_days: number;
  days_remaining: number | null;
  last_billing_status: string | null;
  total_paid: number;
  current_price: number;
}

const FeatureDashboard = () => {
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureLifecycle | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch school's feature lifecycle
  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ["feature-lifecycle"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("school_feature_lifecycle")
        .select("*")
        .eq("school_id", user.id)
        .order("category", { ascending: true })
        .order("feature_name", { ascending: true });

      if (error) throw error;
      return data as FeatureLifecycle[];
    },
  });

  // Pause feature mutation
  const pauseMutation = useMutation({
    mutationFn: async (featureCode: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("pause_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode,
        p_reason: pauseReason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feature paused successfully");
      setShowPauseDialog(false);
      setPauseReason("");
      setSelectedFeature(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to pause feature");
    },
  });

  // Reactivate feature mutation
  const reactivateMutation = useMutation({
    mutationFn: async (featureCode: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("reactivate_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode,
        p_activated_by: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feature reactivated successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reactivate feature");
    },
  });

  // Remove feature mutation
  const removeMutation = useMutation({
    mutationFn: async (featureCode: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("remove_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feature marked for removal");
      setShowRemoveDialog(false);
      setSelectedFeature(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove feature");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "removed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "paused":
        return <Pause className="w-4 h-4" />;
      case "expired":
        return <XCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "removed":
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const calculateTotalMonthly = () => {
    if (!features) return 0;
    return features
      .filter((f) => f.status === "active")
      .reduce((sum, f) => sum + (f.current_price || 0), 0);
  };

  const groupByCategory = (features: FeatureLifecycle[]) => {
    return features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = [];
      }
      acc[feature.category].push(feature);
      return acc;
    }, {} as Record<string, FeatureLifecycle[]>);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const groupedFeatures = features ? groupByCategory(features) : {};
  const totalMonthly = calculateTotalMonthly();
  const activeCount = features?.filter((f) => f.status === "active").length || 0;
  const pausedCount = features?.filter((f) => f.status === "paused").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your school's feature subscriptions
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{activeCount}</div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                K{totalMonthly.toLocaleString()}
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paused Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{pausedCount}</div>
              <Pause className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features by Category */}
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold capitalize">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryFeatures.map((feature) => (
              <motion.div
                key={feature.feature_code}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={feature.status === "paused" ? "opacity-75" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{feature.feature_name}</CardTitle>
                      <Badge className={getStatusColor(feature.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(feature.status)}
                          {feature.status}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-medium">K{feature.current_price?.toLocaleString()}/{feature.billing_frequency}</span>
                    </div>

                    {feature.status === "active" && (
                      <>
                        {feature.days_remaining !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Days Remaining</span>
                            <span className="font-medium">{feature.days_remaining} days</span>
                          </div>
                        )}
                        {feature.next_billing_date && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Next Billing</span>
                            <span className="font-medium">
                              {new Date(feature.next_billing_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {feature.status === "paused" && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Paused Since</span>
                          <span className="font-medium">
                            {feature.paused_at ? new Date(feature.paused_at).toLocaleDateString() : "Recently"}
                          </span>
                        </div>
                        {feature.paused_reason && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {feature.paused_reason}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}

                    {feature.reactivation_count > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reactivations</span>
                        <span className="font-medium">{feature.reactivation_count}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {feature.status === "active" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setSelectedFeature(feature);
                            setShowPauseDialog(true);
                          }}
                        >
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {feature.status === "paused" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => reactivateMutation.mutate(feature.feature_code)}
                          disabled={reactivateMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                      {feature.status !== "removed" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedFeature(feature);
                            setShowRemoveDialog(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause {selectedFeature?.feature_name}? 
              You will not be charged while the feature is paused.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Why are you pausing this feature?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedFeature && pauseMutation.mutate(selectedFeature.feature_code)}
              disabled={pauseMutation.isPending}
            >
              Pause Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedFeature?.feature_name}? 
              This will take effect at the end of your current billing cycle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedFeature && removeMutation.mutate(selectedFeature.feature_code)}
              disabled={removeMutation.isPending}
            >
              Remove Feature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeatureDashboard;
