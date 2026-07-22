import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BookOpen, Calendar, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { examService } from "@/lib/services/exams";
import { toast } from "sonner";

export default function CreateExam() {
  const navigate = useNavigate();
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [examName, setExamName] = useState("");
  const [examType, setExamType] = useState("mid-term");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!schoolId) return;

    async function loadData() {
      setLoading(true);
      try {
        const fetchedTerms = await examService.fetchTerms(schoolId!);
        setTerms(fetchedTerms);
        const currentTerm = fetchedTerms.find((t: any) => t.is_current);
        if (currentTerm) {
          setSelectedTerm((currentTerm as any).id);
        } else if (fetchedTerms.length > 0) {
          setSelectedTerm((fetchedTerms[0] as any).id);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load school terms.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [schoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTerm || !examName.trim() || !startDate || !endDate) {
      toast.error("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await examService.createExam(schoolId!, {
        term_id: selectedTerm,
        name: examName,
        exam_type: examType,
        start_date: startDate,
        end_date: endDate,
        status: "scheduled",
      });

      toast.success("Exam scheduled successfully!");
      navigate("/dashboard/exams");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create exam: " + (err.message || err));
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Schedule Exam</h1>
          <p className="text-muted-foreground">Configure new school examination</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Exam Information
          </CardTitle>
          <CardDescription>Enter dates and metadata for this exam schedule.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="term">Academic Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.is_current ? "(Current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="examName">Exam Name</Label>
              <Input
                id="examName"
                placeholder="e.g. End of Term 1 Exams"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examType">Exam Type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid-term">Mid-Term Assessment</SelectItem>
                  <SelectItem value="final">Final Exam</SelectItem>
                  <SelectItem value="mock">Mock Exam</SelectItem>
                  <SelectItem value="quiz">Class Quiz / Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="startDate"
                    type="date"
                    className="pl-9"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="endDate"
                    type="date"
                    className="pl-9"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard/exams")}>
                Cancel
              </Button>
              <Button type="submit" variant="hero" disabled={submitting}>
                {submitting ? "Scheduling..." : "Schedule Exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
