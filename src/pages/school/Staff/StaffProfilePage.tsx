import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  MapPin,
  GraduationCap,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/appStore";
import { useQuery } from "@tanstack/react-query";
import * as staffService from "@/lib/services/staffService";

export function StaffProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentSchool = useAppStore((s) => s.currentSchool);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffService.getStaffProfile(id!),
    enabled: !!id,
  });

  const { data: assignments } = useQuery({
    queryKey: ["teacher-assignments", currentSchool?.id, id],
    queryFn: () => staffService.getTeacherWorkload(id!, currentSchool!.id),
    enabled: !!id && !!currentSchool?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "on_leave":
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>;
      case "terminated":
        return <Badge className="bg-red-100 text-red-800">Terminated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Staff member not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Staff Profile</h1>
          <p className="text-muted-foreground mt-2">
            View staff member details and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/dashboard/staff/list")}>
            Back to List
          </Button>
          <Button onClick={() => navigate(`/dashboard/staff/${id}/edit`)}>
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Staff Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {staff.first_name} {staff.last_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {staff.position || "No position"} {staff.department && `• ${staff.department}`}
                </CardDescription>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(staff.status)}
                  {staff.employee_number && (
                    <span className="text-sm text-muted-foreground">
                      ID: {staff.employee_number}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {staff.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{staff.email}</span>
              </div>
            )}
            {staff.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{staff.phone}</span>
              </div>
            )}
            {staff.employment_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Employed: {new Date(staff.employment_date).toLocaleDateString()}</span>
              </div>
            )}
            {staff.experience_years && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{staff.experience_years} years of experience</span>
              </div>
            )}
            {staff.qualifications && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span>{staff.qualifications}</span>
              </div>
            )}
            {staff.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{staff.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="assignments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assignments">Teaching Assignments</TabsTrigger>
          <TabsTrigger value="employment">Employment Details</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
        </TabsList>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teaching Assignments</CardTitle>
              <CardDescription>
                {assignments?.length || 0} assignment(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-4">
                  {assignments.map((assignment: any) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{assignment.subjects?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {assignment.classes?.name} • {assignment.classes?.grades?.name}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {assignment.assignment_type === "class_teacher" ? "Class Teacher" : "Subject Teacher"}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No teaching assignments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Details Tab */}
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Employment Type</Label>
                  <p className="font-medium capitalize">{staff.employment_type || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(staff.status)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Employment Date</Label>
                  <p className="font-medium">
                    {staff.employment_date ? new Date(staff.employment_date).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Termination Date</Label>
                  <p className="font-medium">
                    {staff.termination_date ? new Date(staff.termination_date).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                {staff.termination_reason && (
                  <div className="md:col-span-2">
                    <Label className="text-sm text-muted-foreground">Termination Reason</Label>
                    <p className="font-medium">{staff.termination_reason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Contact Tab */}
        <TabsContent value="emergency">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.emergency_contact_name || staff.emergency_contact_phone ? (
                <div className="space-y-4">
                  {staff.emergency_contact_name && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Contact Name</Label>
                      <p className="font-medium">{staff.emergency_contact_name}</p>
                    </div>
                  )}
                  {staff.emergency_contact_phone && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Contact Phone</Label>
                      <p className="font-medium">{staff.emergency_contact_phone}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No emergency contact information</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}