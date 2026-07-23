import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Edit,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  Save,
  X,
  History,
  AlertTriangle,
  CheckCircle,
  School,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Feature, FeatureCategory, formatCurrency } from "@/types/feature";

interface PriceChange {
  feature_code: string;
  feature_name: string;
  old_price: number;
  new_price: number;
  difference: number;
  percentage_change: number;
}

const FeaturePricingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedFeatureForHistory, setSelectedFeatureForHistory] = useState<string | null>(null);
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([]);
  const [notifySchools, setNotifySchools] = useState(true);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    price_monthly: 0,
    price_termly: 0,
    price_annual: 0,
    billing_frequency: "monthly" as "monthly" | "termly" | "annual",
    price_change_reason: "",
  });

  // Fetch all features with pricing
  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ["admin-features-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_catalog")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Feature[];
    },
  });

  // Fetch price history
  const { data: priceHistory } = useQuery({
    queryKey: ["price-history", selectedFeatureForHistory],
    queryFn: async () => {
      if (!selectedFeatureForHistory) return [];

      const { data, error } = await supabase
        .from("feature_price_history")
        .select("*")
        .eq("feature_code", selectedFeatureForHistory)
        .order("changed_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedFeatureForHistory,
  });

  // Calculate totals
  const totalMonthly = features?.reduce((sum, f) => sum + (f.price_monthly || 0), 0) || 0;
  const totalTermly = features?.reduce((sum, f) => sum + (f.price_termly || 0), 0) || 0;
  const totalAnnual = features?.reduce((sum, f) => sum + (f.price_annual || 0), 0) || 0;

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async (updates: any[]) => {
      // Update each feature
      for (const update of updates) {
        const { error } = await supabase
          .from("module_catalog")
          .update({
            price_monthly: update.price_monthly,
            price_termly: update.price_termly,
            price_annual: update.price_annual,
            billing_frequency: update.billing_frequency,
            last_price_update_by: (await supabase.auth.getUser()).data.user?.id,
            last_price_update_at: new Date().toISOString(),
            price_change_reason: update.price_change_reason,
          })
          .eq("code", update.code);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pricing updated successfully across all schools");
      setShowEditDialog(false);
      setPriceChanges([]);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update pricing");
    },
  });

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      price_monthly: feature.price_monthly || 0,
      price_termly: feature.price_termly || 0,
      price_annual: feature.price_annual || 0,
      billing_frequency: feature.billing_frequency || "monthly",
      price_change_reason: "",
    });
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!editingFeature) return;

    const oldPrice = editingFeature.price_monthly || 0;
    const newPrice = formData.price_monthly;

    // Calculate impact
    const priceChange: PriceChange = {
      feature_code: editingFeature.code,
      feature_name: editingFeature.name,
      old_price: oldPrice,
      new_price: newPrice,
      difference: newPrice - oldPrice,
      percentage_change: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
    };

    setPriceChanges([priceChange]);

    // Update pricing
    updatePricingMutation.mutate([
      {
        code: editingFeature.code,
        ...formData,
      },
    ]);
  };

  const handleViewHistory = (featureCode: string) => {
    setSelectedFeatureForHistory(featureCode);
    setShowHistoryDialog(true);
  };

  // Filter features
  const filteredFeatures = features?.filter((feature) => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feature.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || feature.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // Group features by category
  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      core: "Core Features",
      academic: "Academic",
      finance: "Finance",
      communication: "Communication",
      hr: "Human Resources",
      analytics: "Analytics",
      other: "Other",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Feature Pricing</h1>
          <p className="text-muted-foreground">Manage feature pricing across all schools</p>
        </div>
      </div>

      {/* Revenue Stats */}
      {features && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Monthly Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
                </div>
                <DollarSign className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Termly Revenue (3mo)</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalTermly)}</div>
                </div>
                <Calendar className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Annual Revenue</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalAnnual)}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-success opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
            <Card key={category} className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  {getCategoryLabel(category)} ({categoryFeatures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryFeatures.map((feature) => (
                    <div
                      key={feature.code}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{feature.name}</p>
                          <Badge variant="outline" className="text-xs font-mono">
                            {feature.code}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 mt-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Monthly: </span>
                            <span className="text-sm font-medium text-primary">
                              {formatCurrency(feature.price_monthly || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Termly: </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(feature.price_termly || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Annual: </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(feature.price_annual || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Frequency: </span>
                            <Badge variant="outline" className="text-xs">
                              {feature.billing_frequency || "monthly"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(feature.code)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(feature)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Pricing Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Pricing - {editingFeature?.name}</DialogTitle>
            <DialogDescription>
              Update pricing for this feature. Changes will apply to ALL schools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Price changes will be enforced across ALL schools using this feature.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price_monthly">Monthly Price (K)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="price_termly">Termly Price (K)</Label>
                <Input
                  id="price_termly"
                  type="number"
                  value={formData.price_termly}
                  onChange={(e) => setFormData({ ...formData, price_termly: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="price_annual">Annual Price (K)</Label>
                <Input
                  id="price_annual"
                  type="number"
                  value={formData.price_annual}
                  onChange={(e) => setFormData({ ...formData, price_annual: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="billing_frequency">Billing Frequency</Label>
              <Select
                value={formData.billing_frequency}
                onValueChange={(value: "monthly" | "termly" | "annual") =>
                  setFormData({ ...formData, billing_frequency: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="termly">Termly (3 months)</SelectItem>
                  <SelectItem value="annual">Annual (12 months)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Price Change</Label>
              <Input
                id="reason"
                placeholder="e.g., Increased price due to new features"
                value={formData.price_change_reason}
                onChange={(e) => setFormData({ ...formData, price_change_reason: e.target.value })}
              />
            </div>

            {priceChanges.length > 0 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Impact:</strong> +{formatCurrency(priceChanges[0].difference)}/month per school
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updatePricingMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updatePricingMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Price History - {selectedFeatureForHistory}</DialogTitle>
            <DialogDescription>
              Complete audit trail of all price changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {priceHistory && priceHistory.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Field</th>
                      <th className="pb-3 font-medium text-muted-foreground">Old Value</th>
                      <th className="pb-3 font-medium text-muted-foreground">New Value</th>
                      <th className="pb-3 font-medium text-muted-foreground">Schools Affected</th>
                      <th className="pb-3 font-medium text-muted-foreground">Revenue Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceHistory.map((record) => (
                      <tr key={record.id} className="border-b last:border-0">
                        <td className="py-3">
                          {new Date(record.changed_at).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <Badge variant="outline">{record.field_changed}</Badge>
                        </td>
                        <td className="py-3">{record.old_value}</td>
                        <td className="py-3">{record.new_value}</td>
                        <td className="py-3">{record.schools_affected || 0}</td>
                        <td className="py-3">
                          {record.additional_revenue_impact ? (
                            <span className={record.additional_revenue_impact > 0 ? "text-success" : "text-destructive"}>
                              {formatCurrency(record.additional_revenue_impact)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                No price history available
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeaturePricingPage;