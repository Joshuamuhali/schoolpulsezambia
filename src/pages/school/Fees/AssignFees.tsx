import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
  getFeeStructures,
  createFeeStructure,
  getFeeCategories,
} from "@/lib/services/finance";
import type { FeeStructure } from "@/lib/services/finance";

export function AssignFees() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const qc = useQueryClient();
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  const { data: grades, isLoading: gradesLoading } = useQuery({
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

  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ["terms", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["fee-categories", schoolId],
    queryFn: () => getFeeCategories(schoolId),
    enabled: !!schoolId,
  });

  const { data: feeStructures, isLoading: structuresLoading, refetch } = useQuery({
    queryKey: ["fee-structures", schoolId],
    queryFn: () => getFeeStructures(schoolId),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createFeeStructure(
        schoolId,
        selectedGrade,
        selectedCategory,
        selectedTerm,
        parseFloat(amount),
        dueDate || undefined
      ),
    onSuccess: () => {
      toast.success("Fee structure created successfully");
      setAmount("");
      setDueDate("");
      refetch();
    },
    onError: (err: Error) => {
      toast.error(`Failed to create fee structure: ${err.message}`);
    },
  });

  const handleAssign = () => {
    if (!selectedGrade || !selectedTerm || !selectedCategory || !amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      school_id: schoolId,
      grade_id: selectedGrade,
      term_id: selectedTerm,
      fee_category_id: selectedCategory,
      amount: parseFloat(amount),
      due_date: dueDate || undefined,
    });
  };

  const isLoading = gradesLoading || termsLoading || categoriesLoading || structuresLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Assign Fees to Grades</h1>
        <p className="text-sm text-muted-foreground">
          Set fee amounts for each grade and term
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Assign Fee Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades?.map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger id="term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Fee Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZK)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleAssign}
            disabled={createMutation.isPending}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Saving..." : "Assign Fee"}
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Fee Structures {selectedTerm ? `- ${terms?.find(t => t.id === selectedTerm)?.name}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : feeStructures && feeStructures.length > 0 ? (
            <div className="space-y-2">
              {feeStructures.map((structure) => (
                <div
                  key={structure.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{structure.grades?.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm">{structure.fee_categories?.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Term: {structure.terms?.name}</span>
                      <span className="font-semibold text-primary">
                        ZK {structure.amount.toFixed(2)}
                      </span>
                      {structure.due_date && (
                        <span>Due: {new Date(structure.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {selectedTerm
                  ? "No fee structures assigned for this term yet."
                  : "Select a term to view fee structures."}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
