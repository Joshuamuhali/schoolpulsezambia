import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "@/lib/services/finance";
import type { FeeStructure } from "@/lib/services/finance";

export function FeeStructure() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [formData, setFormData] = useState({
    gradeId: "",
    feeCategoryId: "",
    termId: "",
    amount: "",
    dueDate: "",
  });

  const { data: structures, isLoading } = useQuery({
    queryKey: ["fee-structures", schoolId],
    queryFn: () => getFeeStructures(schoolId),
    enabled: !!schoolId,
  });

  const { data: grades } = useQuery({
    queryKey: ["grades", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("school_id", schoolId)
        .order("level");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: feeCategories } = useQuery({
    queryKey: ["fee-categories", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fee_categories")
        .select("*")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_current", true);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createFeeStructure(
        schoolId,
        formData.gradeId,
        formData.feeCategoryId,
        formData.termId,
        Number(formData.amount),
        formData.dueDate || undefined
      ),
    onSuccess: () => {
      toast.success("Fee structure created successfully");
      setIsDialogOpen(false);
      setFormData({ gradeId: "", feeCategoryId: "", termId: "", amount: "", dueDate: "" });
      qc.invalidateQueries({ queryKey: ["fee-structures", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to create fee structure: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateFeeStructure(editingStructure!.id, {
        grade_id: formData.gradeId,
        fee_category_id: formData.feeCategoryId,
        term_id: formData.termId,
        amount: Number(formData.amount),
        due_date: formData.dueDate || null,
      }),
    onSuccess: () => {
      toast.success("Fee structure updated successfully");
      setIsDialogOpen(false);
      setEditingStructure(null);
      setFormData({ gradeId: "", feeCategoryId: "", termId: "", amount: "", dueDate: "" });
      qc.invalidateQueries({ queryKey: ["fee-structures", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to update fee structure: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeeStructure(id),
    onSuccess: () => {
      toast.success("Fee structure deleted successfully");
      qc.invalidateQueries({ queryKey: ["fee-structures", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete fee structure: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStructure) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleEdit = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setFormData({
      gradeId: structure.grade_id,
      feeCategoryId: structure.fee_category_id,
      termId: structure.term_id,
      amount: String(structure.amount),
      dueDate: structure.due_date || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fee structure?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingStructure(null);
    setFormData({ gradeId: "", feeCategoryId: "", termId: "", amount: "", dueDate: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Fee Structure</h1>
          <p className="text-sm text-muted-foreground">
            Configure fee amounts per grade and fee type
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStructure(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStructure ? "Edit Fee Structure" : "Add Fee Structure"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Select
                  value={formData.gradeId}
                  onValueChange={(value) => setFormData({ ...formData, gradeId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades?.map((grade: any) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        {grade.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="feeCategory">Fee Category</Label>
                <Select
                  value={formData.feeCategoryId}
                  onValueChange={(value) => setFormData({ ...formData, feeCategoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee category" />
                  </SelectTrigger>
                  <SelectContent>
                    {feeCategories?.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="term">Term</Label>
                <Select
                  value={formData.termId}
                  onValueChange={(value) => setFormData({ ...formData, termId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms?.map((term: any) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date (Optional)</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
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
                    : editingStructure
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
          <CardTitle className="font-display text-lg">Fee Structures</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : structures && structures.length > 0 ? (
            <div className="space-y-2">
              {structures.map((structure) => (
                <div
                  key={structure.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {structure.grades?.name} - {structure.fee_categories?.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{structure.terms?.name}</span>
                        <span>•</span>
                        <span className="font-semibold">ZK {structure.amount.toFixed(2)}</span>
                        {structure.due_date && (
                          <>
                            <span>•</span>
                            <span>Due: {new Date(structure.due_date).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(structure)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(structure.id)}
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
                No fee structures found. Add fee categories and grades first, then create fee structures.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
