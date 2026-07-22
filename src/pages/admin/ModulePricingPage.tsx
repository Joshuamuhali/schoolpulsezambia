import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Save,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AlertCircle, CheckCircle } from "lucide-react";
import { fetchSubscriptionPlans, createSubscriptionPlan, updateSubscriptionPlan, deleteSubscriptionPlan } from "@/lib/services/adminService";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

interface ModulePricing {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  setup_fee: number;
  category: string;
  is_active: boolean;
}

const ModulePricingPage = () => {
  const queryClient = useQueryClient();
  const [editingModule, setEditingModule] = useState<ModulePricing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthly_price: 0,
    setup_fee: 0,
    category: "general",
    is_active: true,
  });

  const { data: modules = [], isLoading, error, refetch } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: async () => {
      // Fetch from feature_catalog table
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("*")
        .order("category");
      
      if (error) throw error;
      return data as ModulePricing[];
    },
    staleTime: 300_000,
  });

  const createMutation = useMutation({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      toast.success("Module created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create module");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }: ModulePricing) =>
      updateSubscriptionPlan(id, updates),
    onSuccess: () => {
      toast.success("Module updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to update module");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      toast.success("Module deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-modules"] });
    },
    onError: () => {
      toast.error("Failed to delete module");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      monthly_price: 0,
      setup_fee: 0,
      category: "general",
      is_active: true,
    });
    setEditingModule(null);
  };

  const handleEdit = (module: ModulePricing) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      description: module.description,
      monthly_price: module.monthly_price,
      setup_fee: module.setup_fee,
      category: module.category,
      is_active: module.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Module name is required");
      return;
    }

    if (editingModule) {
      updateMutation.mutate({ ...formData, id: editingModule.id });
    } else {
      createMutation.mutate(formData as any);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load modules. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Module Pricing</h1>
          <p className="text-muted-foreground">Manage module prices and setup fees</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {/* Setup Fee Configuration */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Platform Setup Fee
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="setupFee">One-time Setup Fee (K)</Label>
              <Input
                id="setupFee"
                type="number"
                placeholder="3500"
                className="mt-2"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Configured in System Settings
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Current: <span className="font-bold text-primary">K3,500</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Available Modules ({modules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ))}
            </div>
          ) : modules.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No modules configured yet.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Monthly Price</TableHead>
                    <TableHead>Setup Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => (
                    <TableRow key={module.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{module.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{module.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          K{module.monthly_price.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          K{module.setup_fee.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {module.is_active ? (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(module)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(module.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Module Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Module" : "Add New Module"}
            </DialogTitle>
            <DialogDescription>
              Configure module pricing and details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Module Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="monthly_price">Monthly Price (K)</Label>
                <Input
                  id="monthly_price"
                  type="number"
                  value={formData.monthly_price}
                  onChange={(e) => setFormData({ ...formData, monthly_price: Number(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="setup_fee">Setup Fee (K)</Label>
                <Input
                  id="setup_fee"
                  type="number"
                  value={formData.setup_fee}
                  onChange={(e) => setFormData({ ...formData, setup_fee: Number(e.target.value) })}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingModule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModulePricingPage;