import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Loader2, Save } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { examService } from "@/lib/services/exams";
import { studentService } from "@/lib/services/studentService";
import { calculateGrade } from "@/lib/services/gradeCalculator";
import { toast } from "sonner";

export default function EnterMarks() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [exam, setExam] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { score: string; remarks: string }>>({});

  // 1. Load exam details, classes, and subjects
  useEffect(() => {
    if (!schoolId || !examId) return;

    async function loadData() {
      setLoading(true);
      try {
        const [fetchedExam, fetchedClasses, fetchedSubjects] = await Promise.all([
          examService.fetchExamById(examId!),
          examService.fetchClasses(schoolId!),
          examService.fetchSubjects(schoolId!),
        ]);

        setExam(fetchedExam);
        setClasses(fetchedClasses);
        setSubjects(fetchedSubjects);

        if (fetchedClasses.length > 0) setSelectedClass((fetchedClasses[0] as any).id);
        if (fetchedSubjects.length > 0) setSelectedSubject((fetchedSubjects[0] as any).id);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load exam context.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId, examId]);

  // 2. Load students & existing marks when class or subject changes
  useEffect(() => {
    if (!selectedClass || !selectedSubject || !examId) return;

    async function loadStudentsAndMarks() {
      setLoadingStudents(true);
      try {
        // Fetch active students in class
        const studentsList = await studentService.getStudentsByClass(selectedClass);
        // Fetch existing marks
        const existingMarks = await examService.fetchMarksForExam(examId!);

        // Create map of existing marks
        const marksMap = new Map(
          existingMarks.map((m: any) => [
            `${m.student_id}_${m.subject_id}`,
            { score: String(m.score ?? ""), remarks: m.remarks ?? "" },
          ])
        );

        // Prepopulate scores state
        const initialScores: Record<string, { score: string; remarks: string }> = {};
        studentsList.forEach((s) => {
          const key = `${s.id}_${selectedSubject}`;
          initialScores[s.id] = marksMap.get(key) ?? { score: "", remarks: "" };
        });

        setStudents(studentsList);
        setScores(initialScores);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load students list.");
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudentsAndMarks();
  }, [selectedClass, selectedSubject, examId]);

  const handleScoreChange = (studentId: string, value: string) => {
    // Validate value (0-100)
    if (value !== "") {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0 || num > 100) return;
    }

    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: value,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!schoolId || !examId || !selectedSubject) return;

    setSubmitting(true);
    try {
      const recordsToUpsert = students.map((student) => {
        const scoreStr = scores[student.id]?.score;
        const scoreVal = scoreStr !== "" ? parseFloat(scoreStr) : null;
        const remarksVal = scores[student.id]?.remarks || null;

        // Auto calculate grade letter
        let gradeLetter = null;
        if (scoreVal !== null) {
          gradeLetter = calculateGrade(scoreVal).letter;
        }

        return {
          school_id: schoolId,
          exam_id: examId,
          student_id: student.id,
          subject_id: selectedSubject,
          score: scoreVal,
          grade_letter: gradeLetter,
          remarks: remarksVal,
        };
      });

      await examService.upsertMarks(recordsToUpsert);
      toast.success("Marks saved successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save marks: " + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Enter Marks</h1>
          <p className="text-muted-foreground">
            {exam?.name} • {exam?.exam_type}
          </p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-4 border-b">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.grades?.name ?? "No Grade"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code ?? "No Code"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingStudents ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No students enrolled in this class.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Student Name</th>
                      <th className="pb-3 font-medium text-muted-foreground">Adm No.</th>
                      <th className="pb-3 font-medium text-muted-foreground w-28">Score (0-100)</th>
                      <th className="pb-3 font-medium text-muted-foreground w-20">Grade</th>
                      <th className="pb-3 font-medium text-muted-foreground">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const currentVal = scores[student.id]?.score ?? "";
                      const currentRemarks = scores[student.id]?.remarks ?? "";
                      const grade = currentVal !== "" ? calculateGrade(parseFloat(currentVal)) : null;

                      return (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{student.full_name}</td>
                          <td className="py-3 text-muted-foreground">{student.admission_number}</td>
                          <td className="py-3">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="0.0"
                              value={currentVal}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              className="h-9 w-24"
                            />
                          </td>
                          <td className="py-3">
                            {grade ? (
                              <span className={`font-bold ${grade.letter === "F" ? "text-destructive" : "text-primary"}`}>
                                {grade.letter}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3">
                            <Input
                              placeholder="e.g. Good performance"
                              value={currentRemarks}
                              onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                              className="h-9"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => navigate("/dashboard/exams")}>
                  Back
                </Button>
                <Button onClick={handleSave} disabled={submitting} className="gap-2">
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Marks
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
