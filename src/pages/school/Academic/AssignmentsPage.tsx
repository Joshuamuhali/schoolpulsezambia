import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  BookOpen,
  Users,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { academicService } from "@/lib/services/academicService";

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  const selectedYearId = searchParams.get("year");

  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id, selectedYearId],
    queryFn: () => academicService.getClasses(currentSchool!.id, selectedYearId || undefined),
    enabled: !!currentSchool?.id,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", currentSchool?.id],
    queryFn: () => academicService.getSubjects(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["class-subjects", currentSchool?.id, selectedYearId],
    queryFn: () => academicService.getSchoolClassSubjects(currentSchool!.id, selectedYearId || undefined),
    enabled: !!currentSchool?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => academicService.assignSubjectToClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects"] });
      toast.success("Subject assigned successfully");
      setShowForm(false);
      setSelectedClass("");
      setSelectedSubject("");
      setSelectedTeacher("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign subject");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => academicService.removeSubjectFromClass(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects"] });
      toast.success("Assignment removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove assignment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id || !selectedClass || !selectedSubject) return;

    createMutation.mutate({
      school_id: currentSchool.id,
      class_id: selectedClass,
      subject_id: selectedSubject,
      teacher_id: selectedTeacher || undefined,
      is_compulsory: true,
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Subject Assignments</h1>
          <p className="text-muted-foreground mt-2">
            Assign subjects to classes and teachers
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
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
              <CardTitle>Assign Subject to Class</CardTitle>
              <CardDescription>
                Link a subject to a class with an optional teacher
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Class *</label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes?.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject *</label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects?.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Teacher (Optional)</label>
                    <Input
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      placeholder="Teacher name"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || !selectedClass || !selectedSubject}>
                    {createMutation.isPending ? "Assigning..." : "Assign Subject"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedClass("");
                      setSelectedSubject("");
                      setSelectedTeacher("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>
            {assignments?.length || 0} assignment(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : assignments && assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment: any) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-medium">{assignment.subjects?.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Class: {assignment.classes?.name}
                      </p>
                      {assignment.profiles?.full_name && (
                        <p className="text-sm text-muted-foreground">
                          Teacher: {assignment.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={assignment.is_compulsory ? "default" : "outline"}>
                      {assignment.is_compulsory ? "Compulsory" : "Optional"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No assignments</h3>
              <p className="text-muted-foreground mb-4">
                Get started by assigning subjects to classes
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}