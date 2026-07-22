import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Calendar,
  CheckCircle2,
  Archive,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { academicService } from "@/lib/services/academicService";

export default function TermsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    term_number: 1,
    start_date: "",
    end_date: "",
    description: "",
  });

  const yearId = searchParams.get("year");

  const { data: years } = useQuery({
    queryKey: ["academic-years", currentSchool?.id],
    queryFn: () => academicService.getAcademicYears(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: terms, isLoading } = useQuery({
    queryKey: ["terms", yearId],
    queryFn: () => academicService.getTerms(yearId!),
    enabled: !!yearId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => academicService.createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terms"] });
      toast.success("Term created successfully");
      setShowForm(false);
      setFormData({
        name: "",
        term_number: 1,
        start_date: "",
        end_date: "",
        description: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create term");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id || !yearId) return;

    createMutation.mutate({
      ...formData,
      school_id: currentSchool.id,
      academic_year_id: yearId,
      status: "upcoming",
      is_current: false,
    });
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800">Current</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!yearId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Terms</h1>
          <p className="text-muted-foreground mt-2">
            Select an academic year to manage its terms
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {years?.map((year) => (
                <Button
                  key={year.id}
                  variant="outline"
                  className="justify-start"
                  onClick={() => navigate(`/dashboard/academic/terms?year=${year.id}`)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {year.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Terms</h1>
          <p className="text-muted-foreground mt-2">
            Manage terms for the selected academic year
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Term
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Create Term</CardTitle>
              <CardDescription>
                Add a new term to the academic year
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Term Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Term 1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="term_number">Term Number *</Label>
                    <Input
                      id="term_number"
                      type="number"
                      min="1"
                      value={formData.term_number}
                      onChange={(e) =>
                        setFormData({ ...formData, term_number: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Term"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Terms List */}
      <Card>
        <CardHeader>
          <CardTitle>Terms</CardTitle>
          <CardDescription>
            {terms?.length || 0} term(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : terms && terms.length > 0 ? (
            <div className="space-y-4">
              {terms.map((term) => (
                <motion.div
                  key={term.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">
                          {term.name} (Term {term.term_number})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(term.start_date).toLocaleDateString()} -{" "}
                          {new Date(term.end_date).toLocaleDateString()}
                        </p>
                        {term.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {term.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(term.status, term.is_current)}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No terms</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first term
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Term
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}