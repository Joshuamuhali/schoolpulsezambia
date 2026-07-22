import { useState } from "react";
import { Search, Plus, Filter, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { fetchStudents } from "@/lib/services/studentService";

const StudentsPage = () => {
  const [search, setSearch] = useState("");
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: students, isLoading, error } = useQuery({
    queryKey: ["students", schoolId, search],
    queryFn: () => fetchStudents(schoolId!, search || undefined),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${students?.length ?? 0} student${students?.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load students. Please refresh.</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or admission number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Adm No.</th>
                  <th className="pb-3 font-medium text-muted-foreground">Grade / Class</th>
                  <th className="pb-3 font-medium text-muted-foreground">Gender</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-8" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    </tr>
                  ))
                ) : !students || students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {search ? "No students match your search." : "No students found. Add your first student."}
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                      <td className="py-3 font-medium">{s.full_name}</td>
                      <td className="py-3 text-muted-foreground">{s.admission_number}</td>
                      <td className="py-3 text-muted-foreground">
                        {s.grades?.name ?? "—"}
                        {s.classes?.name ? ` / ${s.classes.name}` : ""}
                      </td>
                      <td className="py-3 text-muted-foreground">{s.gender}</td>
                      <td className="py-3">
                        <Badge variant={s.status === "active" ? "default" : "secondary"}>
                          {s.status}
                        </Badge>
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

export default StudentsPage;
