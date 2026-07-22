import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Upload, Calendar, DollarSign, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { createExpense, getExpenseCategories, getVendors } from "@/lib/services/expenseService";
import { supabase } from "@/lib/supabase/client";

export function RecordExpense() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const userId = useAppStore((s) => s.user?.id)!;
  const qc = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    category_id: "",
    vendor_id: "",
    amount: "",
    currency: "ZMW",
    payment_method: "cash",
    payment_reference: "",
    payment_date: "",
    is_recurring: false,
    recurrence_pattern: "",
    next_due_date: "",
    notes: "",
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["expense-categories", schoolId],
    queryFn: () => getExpenseCategories(schoolId),
    enabled: !!schoolId,
  });

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ["vendors", schoolId],
    queryFn: () => getVendors(schoolId),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const expenseNumber = `EXP-${Date.now()}`;
      return createExpense(schoolId, userId, {
        expense_number: expenseNumber,
        title: formData.title,
        description: formData.description || undefined,
        expense_date: formData.expense_date,
        category_id: formData.category_id,
        vendor_id: formData.vendor_id || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        payment_method: formData.payment_method as any,
        payment_reference: formData.payment_reference || undefined,
        payment_date: formData.payment_date || undefined,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.recurrence_pattern as any,
        next_due_date: formData.next_due_date || undefined,
        notes: formData.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Expense recorded successfully");
      setFormData({
        title: "",
        description: "",
        expense_date: new Date().toISOString().split('T')[0],
        category_id: "",
        vendor_id: "",
        amount: "",
        currency: "ZMW",
        payment_method: "cash",
        payment_reference: "",
        payment_date: "",
        is_recurring: false,
        recurrence_pattern: "",
        next_due_date: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["expenses", schoolId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to record expense: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.category_id || !formData.expense_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Record Expense</h1>
        <p className="text-sm text-muted-foreground">
          Record new school expenses
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Electricity Bill"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate">Expense Date *</Label>
                <Input
                  id="expenseDate"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
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
                placeholder="Optional description of the expense"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                {categoriesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                {vendorsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={formData.vendor_id} onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}>
                    <SelectTrigger id="vendor">
                      <SelectValue placeholder="Select vendor (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No vendor</SelectItem>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ZK) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  placeholder="Transaction reference"
                  value={formData.payment_reference}
                  onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
                />
                <Label htmlFor="isRecurring" className="text-sm font-normal">
                  This is a recurring expense
                </Label>
              </div>

              {formData.is_recurring && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Recurrence Pattern</Label>
                    <Select value={formData.recurrence_pattern} onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}>
                      <SelectTrigger id="recurrencePattern">
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextDueDate">Next Due Date</Label>
                    <Input
                      id="nextDueDate"
                      type="date"
                      value={formData.next_due_date}
                      onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData({
                  title: "",
                  description: "",
                  expense_date: new Date().toISOString().split('T')[0],
                  category_id: "",
                  vendor_id: "",
                  amount: "",
                  currency: "ZMW",
                  payment_method: "cash",
                  payment_reference: "",
                  payment_date: "",
                  is_recurring: false,
                  recurrence_pattern: "",
                  next_due_date: "",
                  notes: "",
                })}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {createMutation.isPending ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
