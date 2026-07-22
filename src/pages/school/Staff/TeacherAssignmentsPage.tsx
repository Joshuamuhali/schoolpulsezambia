import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  BookOpen,
  GraduationCap,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as staffService from "@/lib/services/staffService";

export function TeacherAssignmentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [assignmentType, setAssignmentType] = useState("subject_teacher");

  const { data: teachers } = useQuery({
    queryKey: ["staff", currentSchool?.id],
    queryFn: () => staffService.getStaffProfiles(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id],
    queryFn: () => staffService.getTeacherAssignments(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", currentSchool?.id],
    queryFn: () => staffService.getTeacherAssignments(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["teacher-assignments", currentSchool?.id],
    queryFn: () => staffService.getTeacherAssignments(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.assignTeacherToClass(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      toast.success("Teacher assigned successfully");
      setShowForm(false);
      setSelectedTeacher("");
      setSelectedClass("");
      setSelectedSubject("");
      setAssignmentType("subject_teacher");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to assign teacher");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.removeTeacherAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments"] });
      toast.success("Assignment removed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to remove assignment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id || !selectedTeacher || !selectedClass || !selectedSubject) return;

    createMutation.mutate({
      school_id: currentSchool.id,
      teacher_id: selectedTeacher,
      class_id: selectedClass,
      subject_id: selectedSubject,
      assignment_type: assignmentType,
      is_active: true,
    });
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers?.find((t: any) => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Teacher Assignments</h1>
          <p className="text-muted-foreground mt-2">
            Assign teachers to classes and subjects
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
              <CardTitle>Assign Teacher</CardTitle>
              <CardDescription>
                Assign a teacher to a class and subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teacher *</label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers?.map((teacher: any) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assignment Type</label>
                    <Select value={assignmentType} onValueChange={setAssignmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="class_teacher">Class Teacher</SelectItem>
                        <SelectItem value="subject_teacher">Subject Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || !selectedTeacher || !selectedClass || !selectedSubject}>
                    {createMutation.isPending ? "Assigning..." : "Assign Teacher"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedTeacher("");
                      setSelectedClass("");
                      setSelectedSubject("");
                      setAssignmentType("subject_teacher");
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
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{getTeacherName(assignment.teacher_id)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.classes?.name} • {assignment.subjects?.name}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {assignment.assignment_type === "class_teacher" ? "Class Teacher" : "Subject Teacher"}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to remove this assignment?")) {
                        deleteMutation.mutate(assignment.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No assignments</h3>
              <p className="text-muted-foreground mb-4">
                Get started by assigning teachers to classes
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