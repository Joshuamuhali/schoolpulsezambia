import { motion } from "framer-motion";
import { Users, GraduationCap, ClipboardCheck, CreditCard, TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { fetchSchoolDashboardStats, fetchRecentActivity } from "@/lib/services/dashboard";
import { formatDistanceToNow } from "date-fns";

const DashboardOverview = () => {
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats", schoolId],
    queryFn: () => fetchSchoolDashboardStats(schoolId!),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard-activity", schoolId],
    queryFn: () => fetchRecentActivity(schoolId!, 8),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  if (statsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load dashboard data. Please refresh.</AlertDescription>
      </Alert>
    );
  }

  const statCards = [
    {
      label: "Total Students",
      value: stats?.totalStudents,
      sub: `${stats?.activeStudents ?? 0} active`,
      icon: GraduationCap,
      up: true,
    },
    {
      label: "Teachers",
      value: stats?.totalTeachers,
      sub: "Active staff",
      icon: Users,
      up: true,
    },
    {
      label: "Attendance Today",
      value: stats ? `${stats.attendanceToday}%` : undefined,
      sub: `${stats?.attendanceTodayPresent ?? 0} / ${stats?.attendanceTodayTotal ?? 0} marked`,
      icon: ClipboardCheck,
      up: (stats?.attendanceToday ?? 0) >= 80,
    },
    {
      label: "Revenue (All Time)",
      value: stats ? `K ${stats.revenueCurrentTerm.toLocaleString()}` : undefined,
      sub: `K ${stats?.pendingBillsAmount.toLocaleString() ?? 0} outstanding`,
      icon: CreditCard,
      up: true,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="shadow-card hover:shadow-elevated transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`text-xs font-medium ${stat.up ? "text-success" : "text-destructive"}`}>
                    {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </span>
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-7 w-24 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value ?? "—"}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-3 w-16 mt-1" />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{stat.sub}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : !activity || activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
