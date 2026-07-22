import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  GraduationCap,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { academicService } from "@/lib/services/academicService";

export default function GradesPage() {
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    level: 1,
    description: "",
  });

  const { data: grades, isLoading } = useQuery({
    queryKey: ["grades", currentSchool?.id],
    queryFn: () => academicService.getGrades(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => academicService.createGrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Grade created successfully");
      setShowForm(false);
      setFormData({ name: "", level: 1, description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create grade");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => academicService.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      toast.success("Grade deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete grade");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id) return;

    createMutation.mutate({
      ...formData,
      school_id: currentSchool.id,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Grades</h1>
          <p className="text-muted-foreground mt-2">
            Manage grade levels (e.g., Grade 1, Grade 2, etc.)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Grade
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
              <CardTitle>Create Grade</CardTitle>
              <CardDescription>
                Add a new grade level to your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Grade Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Grade 1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="level">Grade Level *</Label>
                    <Input
                      id="level"
                      type="number"
                      min="1"
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: parseInt(e.target.value) })
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
                    {createMutation.isPending ? "Creating..." : "Create Grade"}
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

      {/* Grades List */}
      <Card>
        <CardHeader>
          <CardTitle>All Grades</CardTitle>
          <CardDescription>
            {grades?.length || 0} grade(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : grades && grades.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => (
                <motion.div
                  key={grade.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">{grade.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Level {grade.level}
                      </p>
                      {grade.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {grade.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(grade.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No grades</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first grade
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Grade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}