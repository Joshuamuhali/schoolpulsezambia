import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Package,
  DollarSign,
  Settings,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
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

const FeaturesManagementPage = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "academic" as FeatureCategory,
    monthly_price: 0,
    setup_fee: 0,
    is_core: false,
    is_active: true,
  });
  const queryClient = useQueryClient();

  // Fetch all features
  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ["admin-features"],
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

  // Create/Update feature mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingFeature) {
        // Update
        const { data, error } = await supabase
          .from("module_catalog")
          .update({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            monthly_price: formData.monthly_price,
            setup_fee: formData.setup_fee,
            is_core: formData.is_core,
            is_active: formData.is_active,
          })
          .eq("code", editingFeature.code)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create
        const { data, error } = await supabase
          .from("module_catalog")
          .insert({
            code: formData.code,
            name: formData.name,
            description: formData.description,
            category: formData.category,
            monthly_price: formData.monthly_price,
            setup_fee: formData.setup_fee,
            is_core: formData.is_core,
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast.success(editingFeature ? "Feature updated" : "Feature created");
      setShowDialog(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save feature");
    },
  });

  // Toggle feature status
  const toggleMutation = useMutation({
    mutationFn: async ({ code, is_active }: { code: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("module_catalog")
        .update({ is_active: !is_active })
        .eq("code", code);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feature status updated");
      refetch();
    },
  });

  // Delete feature
  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      const { error } = await supabase
        .from("module_catalog")
        .delete()
        .eq("code", code);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feature deleted");
      refetch();
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category: "academic",
      monthly_price: 0,
      setup_fee: 0,
      is_core: false,
      is_active: true,
    });
    setEditingFeature(null);
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      code: feature.code,
      name: feature.name,
      description: feature.description,
      category: feature.category,
      monthly_price: feature.monthly_price,
      setup_fee: feature.setup_fee,
      is_core: feature.is_core,
      is_active: feature.is_active,
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast.error("Code and name are required");
      return;
    }
    saveMutation.mutate();
  };

  const handleDelete = (code: string) => {
    if (confirm("Are you sure you want to delete this feature?")) {
      deleteMutation.mutate(code);
    }
  };

  // Group features by category
  const groupedFeatures = features?.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>) || {};

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
          <h1 className="font-display text-2xl font-bold">Feature Catalog</h1>
          <p className="text-muted-foreground">Manage features and pricing</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      {/* Stats */}
      {features && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Features</div>
              <div className="text-2xl font-bold">{features.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Active</div>
              <div className="text-2xl font-bold text-success">
                {features.filter(f => f.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Core Features</div>
              <div className="text-2xl font-bold text-primary">
                {features.filter(f => f.is_core).length}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Monthly Revenue</div>
              <div className="text-2xl font-bold">
                {formatCurrency(features.reduce((sum, f) => sum + f.monthly_price, 0))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {getCategoryLabel(category)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryFeatures.map((feature) => (
                    <div
                      key={feature.code}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        !feature.is_active ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{feature.name}</p>
                          {feature.is_core && (
                            <Badge variant="outline" className="text-xs">Core</Badge>
                          )}
                          <Badge className={feature.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                            {feature.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {feature.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm font-medium text-primary">
                            {formatCurrency(feature.monthly_price)}/month
                          </span>
                          {feature.setup_fee > 0 && (
                            <span className="text-sm text-muted-foreground">
                              Setup: {formatCurrency(feature.setup_fee)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            {feature.code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate({ code: feature.code, is_active: feature.is_active })}
                        >
                          {feature.is_active ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(feature)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(feature.code)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Add New Feature"}</DialogTitle>
            <DialogDescription>
              {editingFeature ? "Update feature details and pricing" : "Create a new feature in the catalog"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Feature Code *</Label>
              <Input
                id="code"
                placeholder="e.g., attendance, homework"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                disabled={!!editingFeature}
              />
            </div>
            <div>
              <Label htmlFor="name">Feature Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Attendance Management"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the feature"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value: FeatureCategory) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price">Monthly Price (K)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  placeholder="0"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="setup_fee">Setup Fee (K)</Label>
                <Input
                  id="setup_fee"
                  type="number"
                  placeholder="0"
                  value={formData.setup_fee}
                  onChange={(e) => setFormData({ ...formData, setup_fee: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_core"
                checked={formData.is_core}
                onChange={(e) => setFormData({ ...formData, is_core: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="is_core" className="cursor-pointer">Core Feature (always included)</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active (visible to schools)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editingFeature ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeaturesManagementPage;