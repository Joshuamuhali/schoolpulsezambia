import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Search,
  Filter,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useNavigate } from "react-router-dom";

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

interface School {
  id: string;
  name: string;
  subdomain: string;
  state: string;
}

const SchoolFeatureManagement = () => {
  const navigate = useNavigate();
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureLifecycle | null>(null);
  const [pauseReason, setPauseReason] = useState("");
  const queryClient = useQueryClient();

  // Fetch all schools
  const { data: schools, isLoading: loadingSchools } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .neq("state", "deleted")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as School[];
    },
  });

  // Fetch school's feature lifecycle
  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ["school-features-lifecycle", selectedSchool],
    queryFn: async () => {
      if (!selectedSchool) return [];

      const { data, error } = await supabase
        .from("school_feature_lifecycle")
        .select("*")
        .eq("school_id", selectedSchool)
        .order("category", { ascending: true })
        .order("feature_name", { ascending: true });

      if (error) throw error;
      return data as FeatureLifecycle[];
    },
    enabled: !!selectedSchool,
  });

  // Pause feature mutation
  const pauseMutation = useMutation({
    mutationFn: async (featureCode: string) => {
      const { data, error } = await supabase.rpc("pause_feature", {
        p_school_id: selectedSchool,
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
      const { data, error } = await supabase.rpc("reactivate_feature", {
        p_school_id: selectedSchool,
        p_feature_code: featureCode,
        p_activated_by: (await supabase.auth.getUser()).data.user?.id,
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
      const { data, error } = await supabase.rpc("remove_feature", {
        p_school_id: selectedSchool,
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

  const filteredFeatures = features?.filter((feature) => {
    const matchesSearch = 
      feature.feature_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feature.feature_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || feature.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const calculateTotalMonthly = () => {
    if (!features) return 0;
    return features
      .filter((f) => f.status === "active")
      .reduce((sum, f) => sum + (f.current_price || 0), 0);
  };

  if (loadingSchools) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">School Feature Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage features for individual schools
          </p>
        </div>
      </div>

      {/* School Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select School</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSchool || ""} onValueChange={setSelectedSchool}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a school to view their features" />
            </SelectTrigger>
            <SelectContent>
              {schools?.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name} ({school.subdomain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* School Features */}
      {selectedSchool && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{features?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  K{calculateTotalMonthly().toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {features?.filter((f) => f.status === "active").length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="removed">Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Features Table */}
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredFeatures.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No features found</p>
              ) : (
                <div className="space-y-3">
                  {filteredFeatures.map((feature) => (
                    <motion.div
                      key={feature.feature_code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{feature.feature_name}</h3>
                          <Badge className={getStatusColor(feature.status)} variant="outline">
                            {feature.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.category} • {feature.feature_code}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            K{feature.current_price?.toLocaleString()}/{feature.billing_frequency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total Paid: K{feature.total_paid?.toLocaleString()}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/features/${feature.feature_code}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {feature.status === "active" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedFeature(feature);
                                  setShowPauseDialog(true);
                                }}
                              >
                                <Pause className="w-4 h-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            )}
                            {feature.status === "paused" && (
                              <DropdownMenuItem
                                onClick={() => reactivateMutation.mutate(feature.feature_code)}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                            {feature.status !== "removed" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedFeature(feature);
                                  setShowRemoveDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Pause Dialog */}
      <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Feature</DialogTitle>
            <DialogDescription>
              Are you sure you want to pause {selectedFeature?.feature_name} for this school?
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
              Are you sure you want to remove {selectedFeature?.feature_name} from this school?
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

export default SchoolFeatureManagement;
