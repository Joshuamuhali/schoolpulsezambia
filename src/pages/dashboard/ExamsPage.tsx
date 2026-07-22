import { BookOpen, AlertCircle, Plus, Edit3, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { fetchExams } from "@/lib/services/exams";

const statusColors: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary border-primary/20",
  ongoing: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-success/20 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground",
};

const ExamsPage = () => {
  const navigate = useNavigate();
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: exams, isLoading, error } = useQuery({
    queryKey: ["exams", schoolId],
    queryFn: () => fetchExams(schoolId!),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Exams</h1>
          <p className="text-muted-foreground">Manage examinations and results</p>
        </div>
        <Button variant="hero" size="lg" onClick={() => navigate("/dashboard/exams/new")}>
          <Plus className="h-4 w-4 mr-2" /> Schedule Exam
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load exams. Please refresh.</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Exam Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Type</th>
                  <th className="pb-3 font-medium text-muted-foreground">Start Date</th>
                  <th className="pb-3 font-medium text-muted-foreground">End Date</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[40, 20, 24, 24, 16, 16].map((w, j) => (
                        <td key={j} className="py-3"><Skeleton className={`h-4 w-${w}`} /></td>
                      ))}
                    </tr>
                  ))
                ) : !exams || exams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No exams scheduled yet.
                    </td>
                  </tr>
                ) : (
                  exams.map((exam) => (
                    <tr key={exam.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">{exam.name}</td>
                      <td className="py-3 text-muted-foreground capitalize">{exam.exam_type}</td>
                      <td className="py-3 text-muted-foreground">{new Date(exam.start_date).toLocaleDateString()}</td>
                      <td className="py-3 text-muted-foreground">{new Date(exam.end_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={statusColors[exam.status] ?? ""}>
                          {exam.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/exams/${exam.id}/marks`)}
                            className="h-8 gap-1"
                          >
                            <Edit3 className="h-3 w-3" /> Enter Marks
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/exams/${exam.id}/results`)}
                            className="h-8 gap-1"
                          >
                            <BarChart2 className="h-3 w-3" /> Results
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamsPage;
