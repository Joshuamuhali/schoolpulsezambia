import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  ArrowLeft,
  Pause,
  Play,
  Trash2,
  History,
  TrendingUp,
  AlertTriangle,
  FileText,
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

interface BillingHistory {
  id: string;
  school_id: string;
  feature_code: string;
  amount: number;
  billing_month: string;
  status: string;
  created_at: string;
}

const FeatureDetail = () => {
  const { featureCode } = useParams<{ featureCode: string }>();
  const navigate = useNavigate();
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch feature lifecycle
  const { data: feature, isLoading, refetch } = useQuery({
    queryKey: ["feature-lifecycle", featureCode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("school_feature_lifecycle")
        .select("*")
        .eq("school_id", user.id)
        .eq("feature_code", featureCode)
        .single();

      if (error) throw error;
      return data as FeatureLifecycle;
    },
    enabled: !!featureCode,
  });

  // Fetch billing history
  const { data: billingHistory } = useQuery({
    queryKey: ["billing-history", featureCode],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("feature_billing_history")
        .select("*")
        .eq("school_id", user.id)
        .eq("feature_code", featureCode)
        .order("billing_month", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as BillingHistory[];
    },
    enabled: !!featureCode,
  });

  // Pause feature mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("pause_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode!,
        p_reason: pauseReason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feature paused successfully");
      setShowPauseDialog(false);
      setPauseReason("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to pause feature");
    },
  });

  // Reactivate feature mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("reactivate_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode!,
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
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("remove_feature", {
        p_school_id: user.id,
        p_feature_code: featureCode!,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Feature marked for removal");
      setShowRemoveDialog(false);
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

  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!feature) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Feature not found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{feature.feature_name}</h1>
          <p className="text-muted-foreground mt-1">
            {feature.category} • {feature.feature_code}
          </p>
        </div>
        <Badge className={getStatusColor(feature.status)} className="text-sm">
          {feature.status.toUpperCase()}
        </Badge>
      </div>

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">{feature.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-lg font-semibold">
                K{feature.current_price?.toLocaleString()}/{feature.billing_frequency}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price at Activation</p>
              <p className="text-lg font-semibold">
                K{feature.price_at_activation?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activated On</p>
              <p className="text-lg font-semibold">
                {feature.activated_at ? new Date(feature.activated_at).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="text-lg font-semibold">
                {feature.next_billing_date ? new Date(feature.next_billing_date).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className="text-lg font-semibold">
                {feature.days_remaining !== null ? `${feature.days_remaining} days` : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-lg font-semibold">
                K{feature.total_paid?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reactivation Count</p>
              <p className="text-lg font-semibold">{feature.reactivation_count}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paused Days</p>
              <p className="text-lg font-semibold">{feature.total_paused_days}</p>
            </div>
          </div>

          {feature.status === "paused" && feature.paused_reason && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Paused Reason:</strong> {feature.paused_reason}
              </AlertDescription>
            </Alert>
          )}

          {feature.grace_period_ends_at && (
            <Alert className="mt-4">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Grace Period Ends:</strong>{" "}
                {new Date(feature.grace_period_ends_at).toLocaleDateString()}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mt-6">
            {feature.status === "active" && (
              <Button
                variant="outline"
                onClick={() => setShowPauseDialog(true)}
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Feature
              </Button>
            )}
            {feature.status === "paused" && (
              <Button
                onClick={() => reactivateMutation.mutate()}
                disabled={reactivateMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Reactivate Feature
              </Button>
            )}
            {feature.status !== "removed" && (
              <Button
                variant="destructive"
                onClick={() => setShowRemoveDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Feature
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingHistory && billingHistory.length > 0 ? (
            <div className="space-y-3">
              {billingHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(record.billing_month).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-semibold">K{record.amount.toLocaleString()}</p>
                    <Badge className={getBillingStatusColor(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No billing history available</p>
          )}
        </CardContent>
      </Card>

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause {feature.feature_name}? 
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
              onClick={() => pauseMutation.mutate()}
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
              Are you sure you want to remove {feature.feature_name}? 
              This will take effect at the end of your current billing cycle.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeMutation.mutate()}
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

export default FeatureDetail;
