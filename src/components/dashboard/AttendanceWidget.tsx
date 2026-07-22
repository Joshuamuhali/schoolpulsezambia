import { useNavigate } from "react-router-dom";
import { Check, X, Clock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/appStore";
import { fetchDailyAttendanceSummary } from "@/lib/services/attendance";

const today = new Date().toISOString().split("T")[0];

export function AttendanceWidget() {
  const navigate = useNavigate();
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["attendance-summary", schoolId, today],
    queryFn: () => fetchDailyAttendanceSummary(schoolId!, today),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-display text-sm font-medium">
          Today's Attendance
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => navigate("/dashboard/attendance")}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-2xl font-bold">{summary?.total ?? 0}</div>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center p-2 rounded-lg bg-success/10">
                <Check className="h-4 w-4 text-success mb-1" />
                <span className="text-lg font-bold text-success">{summary?.present ?? 0}</span>
                <span className="text-xs text-muted-foreground">Present</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10">
                <X className="h-4 w-4 text-destructive mb-1" />
                <span className="text-lg font-bold text-destructive">{summary?.absent ?? 0}</span>
                <span className="text-xs text-muted-foreground">Absent</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-warning/10">
                <Clock className="h-4 w-4 text-warning mb-1" />
                <span className="text-lg font-bold text-warning">{summary?.late ?? 0}</span>
                <span className="text-xs text-muted-foreground">Late</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
