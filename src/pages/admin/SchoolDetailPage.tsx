import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, School, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchSchoolById } from "@/lib/services/schools";
import type { School } from "@/lib/supabase/types";
import FeatureFlagAssignment from "@/components/admin/FeatureFlagAssignment";

const SchoolDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: school, isLoading: schoolLoading, error: schoolError } = useQuery({
    queryKey: ["school", id],
    queryFn: () => fetchSchoolById(id!),
    enabled: !!id,
  });

  // Feature flags are now handled by the FeatureFlagAssignment component

  if (schoolError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load school details. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/schools")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">
            {schoolLoading ? <Skeleton className="h-8 w-64" /> : school?.name}
          </h1>
          <p className="text-muted-foreground">
            {schoolLoading ? <Skeleton className="h-4 w-48 mt-1" /> : `School Details & Configuration`}
          </p>
        </div>
      </div>

      {schoolLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      ) : school ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* School Information */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">School Name</p>
                <p className="font-medium">{school.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subdomain</p>
                <p className="font-mono text-sm">{school.subdomain}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline" className={getStateBadgeClass(school.state)}>
                  {school.state.replace("_", " ")}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">School ID</p>
                <p className="font-mono text-xs text-muted-foreground">{school.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="font-medium">
                  {new Date(school.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {new Date(school.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Flags Assignment */}
          <FeatureFlagAssignment schoolId={id!} />
        </div>
      ) : null}
    </div>
  );
};

// Helper functions
const getStateBadgeClass = (state: string): string => {
  const stateClasses: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    preview: "bg-primary/10 text-primary border-primary/20",
    payment_pending: "bg-warning/20 text-warning border-warning/30",
    active: "bg-success/20 text-success border-success/30",
    suspended: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return stateClasses[state] || "bg-muted text-muted-foreground";
};


export default SchoolDetailPage;