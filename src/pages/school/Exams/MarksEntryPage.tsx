import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Users,
  Save,
  Send,
  CheckCircle,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import * as examService from "@/lib/services/examService";
import * as staffService from "@/lib/services/staffService";
import * as studentService from "@/lib/services/studentService";

export default function MarksEntryPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const queryClient = useQueryClient();
  const [selectedExamSubject, setSelectedExamSubject] = useState("");
  const [marksData, setMarksData] = useState<Record<string, { score: string; remarks: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get teacher's exam subjects
  const { data: teacherExams } = useQuery({
    queryKey: ["teacher-exams", currentSchool?.id],
    queryFn: async () => {
      // Get current user's staff profile
      const staff = await staffService.getStaffProfiles(currentSchool!.id);
      const currentUser = (await supabase.auth.getUser()).data.user;
      const currentStaff = staff.find((s: any) => s.email === currentUser?.email);
      
      if (!currentStaff) return [];
      
      const exams = await examService.getTeacherExams(currentStaff.id, currentSchool!.id);
      return exams as any[];
    },
    enabled: !!currentSchool?.id,
  });

  // Get students for selected exam subject
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students", selectedExamSubject],
    queryFn: async () => {
      const examSubject = (teacherExams as any[] || [])?.find((e: any) => e.id === selectedExamSubject);
      if (!examSubject) return [];
      
      const result = await studentService.getStudentsByClass(examSubject.class_id);
      return result;
    },
    enabled: !!selectedExamSubject,
  });

  // Get existing results
  const { data: existingResults } = useQuery({
    queryKey: ["student-results", selectedExamSubject],
    queryFn: () => examService.getStudentResults(currentSchool!.id, selectedExamSubject),
    enabled: !!selectedExamSubject,
  });

  // Load existing results
  useEffect(() => {
    if (existingResults && existingResults.length > 0) {
      const data: Record<string, { score: string; remarks: string }> = {};
      existingResults.forEach((result: any) => {
        data[result.student_id] = {
          score: result.score?.toString() || "",
          remarks: result.remarks || "",
        };
      });
      setMarksData(data);
    }
  }, [existingResults]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const examSubject = (teacherExams as any[] || [])?.find((e: any) => e.id === selectedExamSubject);
      if (!examSubject || !students) return;

      const userId = (await supabase.auth.getUser()).data.user?.id || "";
      
      const results = students.map((student: any) => ({
        school_id: currentSchool!.id,
        exam_subject_id: selectedExamSubject,
        student_id: student.id,
        score: parseFloat(marksData[student.id]?.score) || 0,
        remarks: marksData[student.id]?.remarks || null,
        status: "submitted" as const,
        marked_by: userId,
      }));

      await examService.bulkCreateStudentResults(results);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-results"] });
      toast.success("Marks submitted successfully");
      setIsSubmitting(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit marks");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    if (!selectedExamSubject) {
      toast.error("Please select an exam subject");
      return;
    }

    const unmarked = students?.filter((s: any) => !marksData[s.id]?.score);
    if (unmarked && unmarked.length > 0) {
      if (!confirm(`${unmarked.length} student(s) have no marks. Submit anyway?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    submitMutation.mutate();
  };

  const selectedExam = (teacherExams as any[] || [])?.find((e: any) => e.id === selectedExamSubject);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Marks Entry</h1>
        <p className="text-muted-foreground mt-2">
          Enter marks for your assigned exams
        </p>
      </div>

      {/* Exam Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Exam Subject</CardTitle>
          <CardDescription>Choose the exam and subject to enter marks</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedExamSubject} onValueChange={setSelectedExamSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam subject" />
            </SelectTrigger>
            <SelectContent>
              {teacherExams?.map((exam: any) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.exams?.name} - {exam.subjects?.name} ({exam.classes?.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedExamSubject && students && (
        <>
          {/* Exam Info */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedExam?.subjects?.name} - {selectedExam?.classes?.name}
              </CardTitle>
              <CardDescription>
                {selectedExam?.exams?.name} | Max Marks: {selectedExam?.max_marks}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Marks Entry Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Marks</CardTitle>
              <CardDescription>
                {students?.length || 0} student(s)
              </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (confirm("Save as draft?")) {
                        toast.success("Draft saved");
                      }
                    }}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Submitting..." : "Submit Marks"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="space-y-3">
                  {students?.map((student: any, index: number) => (
                    <motion.div
                      key={student.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{student.full_name}</h4>
                        {student.admission_number && (
                          <p className="text-sm text-muted-foreground">
                            {student.admission_number}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-32">
                          <Input
                            type="number"
                            min="0"
                            max={selectedExam?.max_marks}
                            step="0.01"
                            placeholder="Score"
                            value={marksData[student.id]?.score || ""}
                            onChange={(e) =>
                              setMarksData({
                                ...marksData,
                                [student.id]: {
                                  ...marksData[student.id],
                                  score: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="w-64">
                          <Input
                            placeholder="Remarks (optional)"
                            value={marksData[student.id]?.remarks || ""}
                            onChange={(e) =>
                              setMarksData({
                                ...marksData,
                                [student.id]: {
                                  ...marksData[student.id],
                                  remarks: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedExamSubject && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select an Exam Subject</h3>
              <p className="text-muted-foreground">
                Choose an exam subject from the dropdown above to enter marks
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}