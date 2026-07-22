import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureGate } from "@/components/FeatureGate";
import { getFeeStructures, createFeeStructure, updateFeeStructure, deleteFeeStructure } from "@/lib/services/financeService";
import { FeeStructure } from "@/lib/supabase/types";
import { toast } from "sonner";

const FEE_TYPES = [
  { value: "tuition", label: "Tuition" },
  { value: "boarding", label: "Boarding" },
  { value: "transport", label: "Transport" },
  { value: "uniform", label: "Uniform" },
  { value: "meals", label: "Meals" },
  { value: "activities", label: "Activities" },
  { value: "other", label: "Other" },
];

const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "term", label: "Per Term" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One Time" },
];

export default function FeeStructuresPage() {
  const { school } = useAuth();
  const { hasAccess } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fee_type: "tuition" as FeeStructure["fee_type"],
    amount: "",
    currency: "ZMW",
    billing_cycle: "term" as FeeStructure["billing_cycle"],
    is_mandatory: true,
  });

  const { data: feeStructures, isLoading } = useQuery({
    queryKey: ["fee-structures", school?.id],
    queryFn: () => getFeeStructures(school!.id),
    enabled: !!school?.id && hasAccess("finance"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<FeeStructure, "id" | "school_id" | "created_at" | "updated_at">) =>
      createFeeStructure(school!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Fee structure created successfully");
    },
    onError: (err: any) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FeeStructure> }) =>
      updateFeeStructure(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      setIsDialogOpen(false);
      setEditingFee(null);
      resetForm();
      toast.success("Fee structure updated successfully");
    },
    onError: (err: any) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeeStructure(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-structures"] });
      toast.success("Fee structure archived successfully");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      fee_type: "tuition",
      amount: "",
      currency: "ZMW",
      billing_cycle: "term",
      is_mandatory: true,
    });
    setEditingFee(null);
    setError(null);
  };

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      description: fee.description || "",
      fee_type: fee.fee_type,
      amount: fee.amount.toString(),
      currency: fee.currency,
      billing_cycle: fee.billing_cycle,
      is_mandatory: fee.is_mandatory,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      name: formData.name,
      description: formData.description || undefined,
      fee_type: formData.fee_type,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      billing_cycle: formData.billing_cycle,
      is_mandatory: formData.is_mandatory,
      status: "active" as const,
    };

    if (editingFee) {
      updateMutation.mutate({ id: editingFee.id, updates: data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getFeeTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      tuition: "bg-blue-100 text-blue-800",
      boarding: "bg-purple-100 text-purple-800",
      transport: "bg-green-100 text-green-800",
      uniform: "bg-orange-100 text-orange-800",
      meals: "bg-yellow-100 text-yellow-800",
      activities: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  return (
    <FeatureGate feature="finance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fee Structures</h1>
            <p className="text-muted-foreground">Manage school fee structures and pricing</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingFee ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
                <DialogDescription>
                  {editingFee ? "Update fee structure details" : "Create a new fee structure for your school"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Fee Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Grade 7 Tuition"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fee_type">Fee Type *</Label>
                    <Select
                      value={formData.fee_type}
                      onValueChange={(value: any) => setFormData({ ...formData, fee_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FEE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (K) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_cycle">Billing Cycle *</Label>
                    <Select
                      value={formData.billing_cycle}
                      onValueChange={(value: any) => setFormData({ ...formData, billing_cycle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BILLING_CYCLES.map((cycle) => (
                          <SelectItem key={cycle.value} value={cycle.value}>
                            {cycle.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_mandatory"
                    checked={formData.is_mandatory}
                    onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_mandatory" className="text-sm">
                    This is a mandatory fee
                  </Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingFee ? "Update" : "Create"} Fee Structure
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Fee Structures</CardTitle>
            <CardDescription>
              {feeStructures?.length || 0} fee structure(s) configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : feeStructures && feeStructures.length > 0 ? (
              <div className="space-y-4">
                {feeStructures.map((fee) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold">{fee.name}</h3>
                        <Badge className={getFeeTypeColor(fee.fee_type)}>
                          {fee.fee_type}
                        </Badge>
                        {fee.is_mandatory && (
                          <Badge variant="outline">Mandatory</Badge>
                        )}
                      </div>
                      {fee.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {fee.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="font-semibold text-primary">
                          K {fee.amount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          per {fee.billing_cycle}
                        </span>
                        <span className="text-muted-foreground">
                          Currency: {fee.currency}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(fee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to archive this fee structure?")) {
                            deleteMutation.mutate(fee.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No fee structures</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Get started by creating your first fee structure
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Fee Structure
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}