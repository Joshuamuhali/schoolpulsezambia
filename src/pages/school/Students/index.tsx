import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studentService } from "@/lib/services/studentService";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Plus, UserPlus } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { toast } from "sonner";

export function StudentsPage() {
  const navigate = useNavigate();
  const { currentSchool } = useAppStore();
  const [search, setSearch] = useState("");

  const { data: students, isLoading, error } = useQuery({
    queryKey: ["students", currentSchool?.id],
    queryFn: () => studentService.getStudents(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const filteredStudents = students?.filter((student) => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) || 
           student.admission_number?.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load students. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <FeatureGate featureKey="students">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground">
              Manage your student records
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard/students/add")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Admission #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        {search ? "No students found matching your search" : "No students added yet"}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents?.map((student) => (
                      <tr key={student.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-mono">
                          {student.admission_number || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {student.classes ? `${student.classes.grade?.name || ""} - ${student.classes.name}` : "Not assigned"}
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {student.gender || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/students/${student.id}`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/students/${student.id}/edit`)}
                            >
                              Edit
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

        <div className="text-sm text-muted-foreground">
          Showing {filteredStudents?.length || 0} of {students?.length || 0} students
        </div>
      </div>
    </FeatureGate>
  );
}

// Re-export related components
export { AddStudent } from "./AddStudent";
export { EditStudent } from "./EditStudent";
export { StudentProfile } from "./StudentProfile";