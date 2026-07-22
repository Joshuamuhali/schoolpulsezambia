import { useState } from "react";
import { Plus, Search, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { fetchTeachers } from "@/lib/services/teachers";

const TeachersPage = () => {
  const [search, setSearch] = useState("");
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: teachers, isLoading, error } = useQuery({
    queryKey: ["teachers", schoolId, search],
    queryFn: () => fetchTeachers(schoolId!, search || undefined),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Teachers</h1>
          <p className="text-muted-foreground">
            {isLoading ? "Loading…" : `${teachers?.length ?? 0} staff member${teachers?.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="h-4 w-4" /> Add Teacher
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load teachers. Please refresh.</AlertDescription>
        </Alert>
      )}

      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Subjects</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-44" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    </tr>
                  ))
                ) : !teachers || teachers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                      {search ? "No teachers match your search." : "No teachers found. Add your first teacher."}
                    </td>
                  </tr>
                ) : (
                  teachers.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                      <td className="py-3 font-medium">{t.full_name}</td>
                      <td className="py-3 text-muted-foreground">{t.email}</td>
                      <td className="py-3 text-muted-foreground">
                        {t.subjects?.join(", ") || "—"}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={t.status === "active" ? "default" : "secondary"}
                          className={t.status === "on_leave" ? "bg-warning/20 text-warning border-warning/30" : ""}
                        >
                          {t.status.replace("_", " ")}
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

export default TeachersPage;
