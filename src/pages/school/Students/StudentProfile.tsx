import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  Users,
  Activity,
  GraduationCap,
  Edit,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { studentService } from "@/lib/services/studentService";
import { useAppStore } from "@/store/appStore";

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch student details
  const { data: student, isLoading, error } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentService.getStudent(id!),
    enabled: !!id,
  });

  // Fetch student guardians
  const { data: guardians } = useQuery({
    queryKey: ["student-guardians", id],
    queryFn: () => studentService.getStudentGuardians(id!),
    enabled: !!id,
  });

  // Fetch student transfers
  const { data: transfers } = useQuery({
    queryKey: ["student-transfers", id],
    queryFn: () => studentService.getStudentTransfers(id!),
    enabled: !!id,
  });

  // Fetch attendance summary
  const { data: attendance } = useQuery({
    queryKey: ["student-attendance", id],
    queryFn: async () => {
      // This would call attendance service
      return { present: 0, absent: 0, late: 0, rate: 0 };
    },
    enabled: !!id,
  });

  // Fetch exam results
  const { data: results } = useQuery({
    queryKey: ["student-results", id],
    queryFn: async () => {
      // This would call exam service
      return [];
    },
    enabled: !!id,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      inactive: "secondary",
      transferred: "outline",
      graduated: "default",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load student details. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/students")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold">
                {student.first_name} {student.last_name}
              </h1>
              {getStatusBadge(student.status)}
            </div>
            <p className="text-muted-foreground mt-1">
              Admission: {student.admission_number || "Not assigned"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/dashboard/students/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {attendance?.rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {attendance?.present || 0} days present
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {results?.length > 0
                ? (results as any[]).reduce((sum, r) => sum + (r.average || 0), 0) / results.length
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {results?.length || 0} exams taken
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Grade Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {student.classes?.grades?.name || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {student.classes?.name || "Not assigned"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Guardians
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {guardians?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Linked contacts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Full Name</span>
                  <span className="text-sm font-medium">
                    {student.first_name} {student.last_name}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Gender</span>
                  <span className="text-sm font-medium capitalize">
                    {student.gender === "M" ? "Male" : "Female"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span className="text-sm font-medium">
                    {student.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Age</span>
                  <span className="text-sm font-medium">
                    {student.date_of_birth
                      ? Math.floor(
                          (Date.now() - new Date(student.date_of_birth).getTime()) /
                            (365.25 * 24 * 60 * 60 * 1000)
                        )
                      : "N/A"}{" "}
                    years
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <span className="text-sm font-medium text-right">
                    {student.address || "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Enrollment Date</span>
                  <span className="text-sm font-medium">
                    {student.enrollment_date
                      ? new Date(student.enrollment_date).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(student.status)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Admission Number</span>
                <span className="text-sm font-medium font-mono">
                  {student.admission_number || "Not assigned"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Grade</span>
                <span className="text-sm font-medium">
                  {student.classes?.grades?.name || "Not assigned"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Class</span>
                <span className="text-sm font-medium">
                  {student.classes?.name || "Not assigned"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Class Teacher</span>
                <span className="text-sm font-medium">
                  {student.classes?.staff_profiles
                    ? `${student.classes.staff_profiles.first_name} ${student.classes.staff_profiles.last_name}`
                    : "Not assigned"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Medical Information
              </CardTitle>
              <CardDescription>
                This information is kept confidential and used only for emergencies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Blood Group</span>
                <span className="text-sm font-medium">
                  {student.blood_group || "Not provided"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Medical Conditions</span>
                <span className="text-sm font-medium text-right max-w-md">
                  {student.medical_conditions || "None"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Allergies</span>
                <span className="text-sm font-medium text-right max-w-md">
                  {student.allergies || "None"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Emergency Contact</span>
                <span className="text-sm font-medium text-right">
                  {student.emergency_contact_name || "Not provided"}
                  {student.emergency_contact_phone && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({student.emergency_contact_phone})
                    </span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guardians & Parents
              </CardTitle>
              <CardDescription>
                {guardians?.length || 0} guardian(s) linked to this student
              </CardDescription>
            </CardHeader>
            <CardContent>
              {guardians && guardians.length > 0 ? (
                <div className="space-y-3">
                  {guardians.map((guardian: any) => (
                    <div
                      key={guardian.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{guardian.guardian?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {guardian.guardian?.phone}
                        </p>
                        {guardian.guardian?.email && (
                          <p className="text-sm text-muted-foreground">
                            {guardian.guardian.email}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {guardian.is_primary && (
                            <Badge variant="default">Primary</Badge>
                          )}
                          <Badge variant="outline">
                            {guardian.guardian?.relationship || "Guardian"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No guardians linked yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Transfer History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transfers && transfers.length > 0 ? (
                <div className="space-y-3">
                  {transfers.map((transfer: any) => (
                    <div
                      key={transfer.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {transfer.from_classes?.name || "N/A"} →{" "}
                          {transfer.to_classes?.name || "N/A"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transfer.transfer_date).toLocaleDateString()}
                        </p>
                        {transfer.reason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {transfer.reason}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={
                          transfer.status === "completed"
                            ? "default"
                            : transfer.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {transfer.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transfer history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Import Skeleton
import { Skeleton } from "@/components/ui/skeleton";