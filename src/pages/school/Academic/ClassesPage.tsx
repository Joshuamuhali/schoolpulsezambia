import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  GraduationCap,
  Trash2,
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

export default function ClassesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    grade_id: "",
    academic_year_id: "",
    stream: "",
    capacity: "",
    class_teacher_id: "",
    description: "",
  });

  const selectedGradeId = searchParams.get("grade");
  const selectedYearId = searchParams.get("year");

  const { data: grades } = useQuery({
    queryKey: ["grades", currentSchool?.id],
    queryFn: () => academicService.getGrades(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: years } = useQuery({
    queryKey: ["academic-years", currentSchool?.id],
    queryFn: () => academicService.getAcademicYears(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes", currentSchool?.id, selectedYearId],
    queryFn: () => academicService.getClasses(currentSchool!.id, selectedYearId || undefined),
    enabled: !!currentSchool?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => academicService.createClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class created successfully");
      setShowForm(false);
      setFormData({
        name: "",
        grade_id: "",
        academic_year_id: "",
        stream: "",
        capacity: "",
        class_teacher_id: "",
        description: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create class");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id) return;

    createMutation.mutate({
      ...formData,
      school_id: currentSchool.id,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      is_active: true,
    });
  };

  const getCurrentYear = () => {
    return years?.find((y) => y.is_current) || years?.[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground mt-2">
            Manage classes and streams
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Class
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
              <CardTitle>Create Class</CardTitle>
              <CardDescription>
                Add a new class to your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="grade_id">Grade *</Label>
                    <Select
                      value={formData.grade_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, grade_id: value })
                      }
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="5A"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="academic_year_id">Academic Year *</Label>
                    <Select
                      value={formData.academic_year_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, academic_year_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years?.map((year) => (
                          <SelectItem key={year.id} value={year.id}>
                            {year.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stream">Stream</Label>
                    <Input
                      id="stream"
                      value={formData.stream}
                      onChange={(e) =>
                        setFormData({ ...formData, stream: e.target.value })
                      }
                      placeholder="e.g., A, B, C"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      placeholder="Maximum students"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class_teacher_id">Class Teacher</Label>
                    <Input
                      id="class_teacher_id"
                      value={formData.class_teacher_id}
                      onChange={(e) =>
                        setFormData({ ...formData, class_teacher_id: e.target.value })
                      }
                      placeholder="Teacher name"
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
                    {createMutation.isPending ? "Creating..." : "Create Class"}
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

      {/* Classes List */}
      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {classes?.length || 0} class(es) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : classes && classes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">{cls.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {grades?.find((g) => g.id === cls.grade_id)?.name}
                        {cls.stream && ` - ${cls.stream}`}
                      </p>
                      {cls.capacity && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Capacity: {cls.capacity}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No classes</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first class
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Class
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}