import { useQuery } from "@tanstack/react-query";
import * as staffService from "@/lib/services/staffService";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Edit, Mail, Phone, Calendar } from "lucide-react";

export function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => staffService.getStaffProfile(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !staff) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Staff member not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard/staff")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {staff.first_name} {staff.last_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {staff.position || "No position assigned"}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/dashboard/staff/${staff.id}/edit`)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">
                  {staff.first_name} {staff.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{staff.email || "Not provided"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{staff.phone || "Not provided"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{staff.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Employment Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">
                  {staff.position || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">
                  {staff.department || "Not assigned"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employment Status</p>
                <p className="font-medium capitalize">{staff.status}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}