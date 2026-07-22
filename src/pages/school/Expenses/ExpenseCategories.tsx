import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "@/lib/services/expenseService";
import type { ExpenseCategory } from "@/lib/supabase/types";

export function ExpenseCategories() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    monthly_budget: "",
    annual_budget: "",
    requires_approval: false,
    approval_threshold: "",
  });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["expense-categories", schoolId],
    queryFn: () => getExpenseCategories(schoolId),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: () => createExpenseCategory(schoolId, {
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : undefined,
      annual_budget: formData.annual_budget ? parseFloat(formData.annual_budget) : undefined,
      requires_approval: formData.requires_approval,
      approval_threshold: formData.approval_threshold ? parseFloat(formData.approval_threshold) : undefined,
    }),
    onSuccess: () => {
      toast.success("Expense category created successfully");
      setIsDialogOpen(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ["expense-categories", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create expense category: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateExpenseCategory(editingCategory!.id, {
      name: formData.name,
      code: formData.code,
      description: formData.description || undefined,
      monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : undefined,
      annual_budget: formData.annual_budget ? parseFloat(formData.annual_budget) : undefined,
      requires_approval: formData.requires_approval,
      approval_threshold: formData.approval_threshold ? parseFloat(formData.approval_threshold) : undefined,
    }),
    onSuccess: () => {
      toast.success("Expense category updated successfully");
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      qc.invalidateQueries({ queryKey: ["expense-categories", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update expense category: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpenseCategory(id),
    onSuccess: () => {
      toast.success("Expense category deleted successfully");
      qc.invalidateQueries({ queryKey: ["expense-categories", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete expense category: ${err.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      monthly_budget: "",
      annual_budget: "",
      requires_approval: false,
      approval_threshold: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || "",
      monthly_budget: category.monthly_budget?.toString() || "",
      annual_budget: category.annual_budget?.toString() || "",
      requires_approval: category.requires_approval || false,
      approval_threshold: category.approval_threshold?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense category?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Expense Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage expense categories for tracking school expenses
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCategory(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Expense Category" : "Add Expense Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Utilities"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., UTIL"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="monthlyBudget">Monthly Budget (ZK)</Label>
                  <Input
                    id="monthlyBudget"
                    type="number"
                    placeholder="0.00"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualBudget">Annual Budget (ZK)</Label>
                  <Input
                    id="annualBudget"
                    type="number"
                    placeholder="0.00"
                    value={formData.annual_budget}
                    onChange={(e) => setFormData({ ...formData, annual_budget: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approvalThreshold">Approval Threshold (ZK)</Label>
                <Input
                  id="approvalThreshold"
                  type="number"
                  placeholder="Amount requiring approval"
                  value={formData.approval_threshold}
                  onChange={(e) => setFormData({ ...formData, approval_threshold: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requiresApproval"
                  checked={formData.requires_approval}
                  onChange={(e) => setFormData({ ...formData, requires_approval: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="requiresApproval" className="text-sm font-normal">
                  Requires approval for expenses in this category
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingCategory
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Expense Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{category.name}</p>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">{category.code}</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        {category.monthly_budget && <span>Monthly: ZK {category.monthly_budget}</span>}
                        {category.annual_budget && <span>Annual: ZK {category.annual_budget}</span>}
                        {category.requires_approval && (
                          <span className="text-orange-600">Requires Approval</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No expense categories found. Create your first category to get started.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
