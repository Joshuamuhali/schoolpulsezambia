import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";
import * as examService from "@/lib/services/examService";

export default function ResultsPage() {
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [selectedExam, setSelectedExam] = useState("");

  const { data: exams } = useQuery({
    queryKey: ["exams", currentSchool?.id],
    queryFn: () => examService.getExams(currentSchool!.id, { status: "published" }),
    enabled: !!currentSchool?.id,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["exam-results", selectedExam],
    queryFn: () => examService.getStudentExamResults(currentSchool!.id, selectedExam),
    enabled: !!selectedExam,
  });

  const getGradeBadge = (grade?: string) => {
    if (!grade) return <Badge variant="outline">N/A</Badge>;
    
    const colors: Record<string, string> = {
      "A": "bg-green-100 text-green-800",
      "B": "bg-blue-100 text-blue-800",
      "C": "bg-yellow-100 text-yellow-800",
      "D": "bg-orange-100 text-orange-800",
      "F": "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[grade] || "bg-gray-100 text-gray-800"}>
        {grade}
      </Badge>
    );
  };

  const getPositionBadge = (position?: number) => {
    if (!position) return null;
    
    if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (position === 2) return <Award className="h-5 w-5 text-gray-400" />;
    if (position === 3) return <Award className="h-5 w-5 text-orange-600" />;
    
    return <span className="text-sm font-medium">#{position}</span>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">Exam Results</h1>
        <p className="text-muted-foreground mt-2">
          View published exam results
        </p>
      </div>

      {/* Exam Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Exam</CardTitle>
          <CardDescription>Choose an exam to view results</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {exams?.map((exam: any) => (
                <SelectItem key={exam.id} value={exam.id}>
                  {exam.name} - {new Date(exam.start_date).toLocaleDateString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedExam && results && (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Class Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {results.length > 0 
                    ? (results.reduce((sum: number, r: any) => sum + (r.average || 0), 0) / results.length).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Highest Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {results.length > 0 
                    ? Math.max(...results.map((r: any) => r.average || 0)).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lowest Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {results.length > 0 
                    ? Math.min(...results.map((r: any) => r.average || 0)).toFixed(1)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results List */}
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
              <CardDescription>
                {results.length} student(s) results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result: any, index: number) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center justify-center w-12">
                          {getPositionBadge(result.position)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{result.students?.full_name}</h4>
                          {result.students?.admission_number && (
                            <p className="text-sm text-muted-foreground">
                              {result.students.admission_number}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-bold">{result.total_score?.toFixed(0) || 0}</div>
                            <div className="text-xs text-muted-foreground">Score</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold">{result.total_marks}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-lg font-bold">{result.average?.toFixed(1) || 0}%</div>
                          </div>
                          {getGradeBadge(result.overall_grade)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results available</h3>
                  <p className="text-muted-foreground">
                    Results will appear here once published
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedExam && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select an Exam</h3>
              <p className="text-muted-foreground">
                Choose an exam from the dropdown above to view results
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}