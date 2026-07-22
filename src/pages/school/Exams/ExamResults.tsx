import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Loader2, Award, TrendingUp, Users, CheckCircle } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { examService } from "@/lib/services/exams";
import { studentService } from "@/lib/services/studentService";
import { calculateClassStats } from "@/lib/services/gradeCalculator";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ExamResults() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const [exam, setExam] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [marks, setMarks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);

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

  useEffect(() => {
    if (!selectedClass || !selectedSubject || !examId) return;

    async function loadStats() {
      setLoadingStats(true);
      try {
        const allMarks = await examService.fetchMarksForExam(examId!);
        
        // Filter marks by subject and class (class is checked by filtering student class_id)
        // Wait, student table has class_id, let's check students relation:
        // m.students?.class_id === selectedClass
        // Actually, we can fetch students from studentService and join.
        // Let's filter client-side:
        const filteredMarks = allMarks.filter((m: any) => {
          // Check if subject matches
          if (m.subject_id !== selectedSubject) return false;
          // Check if class matches. In marks fetch: students(full_name, admission_number, class_id)
          // Wait, let's verify if students join contains class_id. In exams.ts we wrote:
          // students ( full_name, admission_number )
          // Let's make sure we filter appropriately. We can check class matching.
          // Wait, in exams.ts:
          // select(`id, school_id, exam_id, student_id, subject_id, score, grade_letter, remarks, students ( full_name, admission_number )`)
          // But wait! If we want to filter by class, we need class_id of students.
          // In students table, class_id exists. Let's make sure our select includes student class_id!
          // Ah! Let's verify: In exams.ts fetchMarksForExam, we can change the select to include `students(full_name, admission_number, class_id)`.
          // Let's check exams.ts code we just wrote:
          // students ( full_name, admission_number )
          // We can easily filter by matching the student list in that class!
          return true; // We'll query student list by class first, then filter marks belonging to those students!
        });

        // Let's load the class students first
        const classStudents = await studentService.getStudentsByClass(selectedClass);
        const studentIds = new Set(classStudents.map((s) => s.id));

        const finalMarks = allMarks.filter(
          (m: any) => m.subject_id === selectedSubject && studentIds.has(m.student_id)
        );

        // Map marks to student details
        const studentMap = new Map<string, any>(classStudents.map((s) => [s.id, s]));
        const enrichedMarks = finalMarks.map((m: any) => ({
          ...m,
          studentName: studentMap.get(m.student_id)?.full_name ?? "Unknown",
          admNo: studentMap.get(m.student_id)?.admission_number ?? "—",
        }));

        // Sort by score descending to get rankings
        enrichedMarks.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

        // Calculate statistics
        const numericScores = finalMarks
          .map((m: any) => m.score)
          .filter((s: any) => s !== null && s !== undefined) as number[];

        const calculatedStats = calculateClassStats(numericScores);

        // Grade distribution count
        const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
        finalMarks.forEach((m: any) => {
          if (m.grade_letter && m.grade_letter in distribution) {
            distribution[m.grade_letter as keyof typeof distribution]++;
          }
        });

        const formattedChartData = Object.entries(distribution).map(([grade, count]) => ({
          name: grade,
          value: count,
        }));

        setMarks(enrichedMarks);
        setStats(calculatedStats);
        setChartData(formattedChartData);
      } catch (err) {
        console.error(err);
        toast.error("Failed to calculate exam statistics.");
      } finally {
        setLoadingStats(false);
      }
    }

    loadStats();
  }, [selectedClass, selectedSubject, examId]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Exam Results Summary</h1>
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
          {loadingStats ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : marks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No results recorded for this selection.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/10">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Class Avg</p>
                      <h3 className="text-xl font-bold">{stats?.average}%</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-success/5 border-success/10">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-full bg-success/10 p-3 text-success">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Pass Rate</p>
                      <h3 className="text-xl font-bold">{stats?.passRate}%</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-warning/5 border-warning/10">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-full bg-warning/10 p-3 text-warning">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Highest Score</p>
                      <h3 className="text-xl font-bold">{stats?.max}%</h3>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50 border-muted">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-full bg-muted p-3 text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Total Students</p>
                      <h3 className="text-xl font-bold">{marks.length}</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart & Rankings split */}
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Student Rankings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="pb-2 font-medium text-muted-foreground w-12">Rank</th>
                            <th className="pb-2 font-medium text-muted-foreground">Student</th>
                            <th className="pb-2 font-medium text-muted-foreground">Adm No.</th>
                            <th className="pb-2 font-medium text-muted-foreground">Score</th>
                            <th className="pb-2 font-medium text-muted-foreground">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marks.map((m, idx) => (
                            <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-2 font-bold text-muted-foreground">{idx + 1}</td>
                              <td className="py-2 font-medium">{m.studentName}</td>
                              <td className="py-2 text-muted-foreground">{m.admNo}</td>
                              <td className="py-2 font-semibold">{m.score !== null ? `${m.score}%` : "—"}</td>
                              <td className="py-2">
                                <span className={`font-bold ${m.grade_letter === "F" ? "text-destructive" : "text-primary"}`}>
                                  {m.grade_letter ?? "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-display text-base">Grade Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
