import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Printer,
  MessageSquare,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import * as examService from "@/lib/services/examService";

export default function ReportCardsPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [teacherComment, setTeacherComment] = useState("");
  const [principalComment, setPrincipalComment] = useState("");

  const { data: exams } = useQuery({
    queryKey: ["exams", currentSchool?.id],
    queryFn: () => examService.getExams(currentSchool!.id, { status: "published" }),
    enabled: !!currentSchool?.id,
  });

  const { data: results } = useQuery({
    queryKey: ["exam-results", selectedExam],
    queryFn: async () => {
      const data = await examService.getStudentExamResults(currentSchool!.id, selectedExam);
      return data as any;
    },
    enabled: !!selectedExam,
  });

  const { data: reportCards } = useQuery({
    queryKey: ["report-cards", currentSchool?.id, selectedExam],
    queryFn: () => examService.getReportCards(currentSchool!.id, { examId: selectedExam }),
    enabled: !!currentSchool?.id && !!selectedExam,
  });

  const selectedResult = results?.find((r: any) => r.student_id === selectedStudent);
  const selectedReportCard = reportCards?.find((rc: any) => rc.student_id === selectedStudent);
  const selectedStudentData = results?.find((r: any) => r.student_id === selectedStudent) as any;

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExam || !selectedStudent) return;

      const result = results?.find((r: any) => r.student_id === selectedStudent);
      if (!result) return;

      // Get student's attendance for the term
      // This would require additional query to attendance service

      await examService.createReportCard({
        school_id: currentSchool!.id,
        student_id: selectedStudent,
        term_id: "", // Would get from exam
        exam_id: selectedExam,
        teacher_comment: teacherComment,
        principal_comment: principalComment,
        attendance_percentage: 0, // Would calculate from attendance data
        status: "generated",
        generated_by: (await supabase.auth.getUser()).data.user?.id || "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-cards"] });
      toast.success("Report card generated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate report card");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (reportCardId: string) => {
      await examService.updateReportCard(reportCardId, {
        status: "published",
        published_by: (await supabase.auth.getUser()).data.user?.id || "",
        published_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-cards"] });
      toast.success("Report card published successfully");
    },
  });

  const handleGenerate = () => {
    if (!selectedExam || !selectedStudent) {
      toast.error("Please select exam and student");
      return;
    }
    generateMutation.mutate();
  };

  const selectedExamData = exams?.find((e: any) => e.id === selectedExam);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Report Cards</h1>
        <p className="text-muted-foreground mt-2">
          Generate and manage student report cards
        </p>
      </div>

      {/* Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student & Exam</CardTitle>
          <CardDescription>Choose an exam and student to generate report card</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam *</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams?.map((exam: any) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Student *</label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
              <SelectContent>
                  {results?.map((result: any) => (
                    <SelectItem key={result.student_id} value={result.student_id}>
                      {(result as any).students?.full_name} - {result.overall_grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && selectedResult && (
        <>
          {/* Report Card Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Report Card</CardTitle>
              <CardDescription>
                {selectedExamData?.name} | {(selectedStudentData as any)?.full_name || (selectedStudentData as any)?.students?.full_name}
              </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 space-y-6">
                {/* School Header */}
                <div className="text-center border-b pb-4">
                  <h2 className="text-2xl font-bold">School Pulse</h2>
                  <p className="text-sm text-muted-foreground">Student Report Card</p>
                </div>

                {/* Student Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Student Name</p>
                    <p className="text-lg">{(selectedStudentData as any)?.full_name || (selectedStudentData as any)?.students?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Admission Number</p>
                    <p className="text-lg">{(selectedStudentData as any)?.admission_number || (selectedStudentData as any)?.students?.admission_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Exam</p>
                    <p className="text-lg">{selectedExamData?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Academic Year</p>
                    <p className="text-lg">{selectedExamData?.academic_year_id}</p>
                  </div>
                </div>

                {/* Results Summary */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Academic Performance</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Score</p>
                      <p className="text-2xl font-bold">{selectedResult?.total_score?.toFixed(0) || 0}</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Average</p>
                      <p className="text-2xl font-bold text-green-600">{selectedResult?.average?.toFixed(1) || 0}%</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Overall Grade</p>
                      <p className="text-2xl font-bold">{selectedResult?.overall_grade || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Teacher Comment
                    </label>
                    <Textarea
                      placeholder="Enter teacher comment..."
                      value={teacherComment}
                      onChange={(e) => setTeacherComment(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Principal Comment
                    </label>
                    <Textarea
                      placeholder="Enter principal comment..."
                      value={principalComment}
                      onChange={(e) => setPrincipalComment(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  {!selectedReportCard ? (
                    <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="flex-1">
                      <FileText className="mr-2 h-4 w-4" />
                      {generateMutation.isPending ? "Generating..." : "Generate Report Card"}
                    </Button>
                  ) : (
                    <>
                      <Badge variant={selectedReportCard.status === "published" ? "default" : "secondary"}>
                        {selectedReportCard.status === "published" ? "Published" : "Draft"}
                      </Badge>
                      {selectedReportCard.status !== "published" && (
                        <Button
                          onClick={() => publishMutation.mutate(selectedReportCard.id)}
                          disabled={publishMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {publishMutation.isPending ? "Publishing..." : "Publish Report Card"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedStudent && selectedExam && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Student</h3>
              <p className="text-muted-foreground">
                Choose a student from the dropdown above to generate report card
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}