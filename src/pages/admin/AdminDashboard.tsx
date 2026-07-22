import { motion } from "framer-motion";
import {
  School,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  AlertCircle,
  Users,
  CreditCard,
  BarChart3,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchAdminStats, fetchRecentAuditLogs, fetchAllSchools } from "@/lib/services/schools";
import { fetchPlatformUserStats, fetchPaymentStats } from "@/lib/services/adminService";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: fetchPlatformUserStats,
    staleTime: 60_000,
  });

  const { data: paymentStats, isLoading: paymentStatsLoading } = useQuery({
    queryKey: ["admin-payment-stats"],
    queryFn: fetchPaymentStats,
    staleTime: 60_000,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => fetchRecentAuditLogs(10),
    staleTime: 30_000,
  });

  const { data: schools, isLoading: schoolsLoading } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAllSchools,
    staleTime: 30_000,
  });

  if (statsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load admin data. Please refresh.</AlertDescription>
      </Alert>
    );
  }

  const statCards = [
    {
      label: "Total Schools",
      value: stats?.totalSchools,
      sub: "All registered",
      icon: School,
    },
    {
      label: "Active Schools",
      value: stats?.activeSchools,
      sub: stats ? `${Math.round((stats.activeSchools / Math.max(stats.totalSchools, 1)) * 100)}% activation rate` : "—",
      icon: CheckCircle,
    },
    {
      label: "Total Users",
      value: userStats?.totalUsers,
      sub: userStats ? `${userStats.activeUsers} active` : "Loading...",
      icon: Users,
    },
    {
      label: "Monthly Revenue",
      value: paymentStats ? `K ${paymentStats.totalRevenue.toLocaleString()}` : "K 0",
      sub: paymentStats ? `${paymentStats.pendingPayments} pending approval` : "All verified payments",
      icon: DollarSign,
    },
  ];

  // Calculate alerts
  const overdueSchools = schools?.filter(s => s.state === "suspended").length || 0;
  const expiringTrials = schools?.filter(s => s.state === "preview").length || 0;
  const pendingPayments = paymentStats?.pendingPayments || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Platform Command Center</h1>
        <p className="text-muted-foreground">Platform-wide overview — all schools and system health.</p>
      </div>

      {/* Critical Alerts */}
      {(overdueSchools > 0 || expiringTrials > 0 || pendingPayments > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          {overdueSchools > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{overdueSchools}</strong> overdue school{overdueSchools !== 1 ? "s" : ""} requiring attention
              </AlertDescription>
            </Alert>
          )}
          {expiringTrials > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{expiringTrials}</strong> trial{expiringTrials !== 1 ? "s" : ""} expiring soon
              </AlertDescription>
            </Alert>
          )}
          {pendingPayments > 0 && (
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                <strong>{pendingPayments}</strong> pending payment{pendingPayments !== 1 ? "s" : ""} awaiting approval
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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
                  <TrendingUp className="h-3 w-3 text-success" />
                </div>
                <div className="mt-4">
                  {statsLoading ? (
                    <Skeleton className="h-7 w-20 mb-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value ?? "—"}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-3 w-32 mt-1" />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{stat.sub}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={() => navigate("/admin/schools")}
              className="justify-start"
              variant="outline"
            >
              <School className="h-4 w-4 mr-2" />
              Create School
            </Button>
            <Button
              onClick={() => navigate("/admin/activation")}
              className="justify-start"
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Payments
            </Button>
            <Button
              onClick={() => navigate("/admin/schools")}
              className="justify-start"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              View All Schools
            </Button>
            <Button
              onClick={() => navigate("/admin/analytics")}
              className="justify-start"
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Schools */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              Recent Schools
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/schools")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schoolsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : !schools || schools.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No schools registered yet.
            </p>
          ) : (
            <div className="space-y-3">
              {schools.slice(0, 5).map((school) => (
                <div
                  key={school.id}
                  className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{school.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {school.subdomain} • Registered {formatDistanceToNow(new Date(school.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant="outline" className={accessStateBadge[school.state] ?? ""}>
                    {school.state.replace("_", " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent audit activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Platform Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start justify-between border-b pb-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No platform activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {logs.map((log: {
                id: string;
                action: string;
                table_name: string | null;
                created_at: string;
                schools?: { name: string } | null;
              }) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {log.schools?.name ?? "Platform"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.action}{log.table_name ? ` — ${log.table_name}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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

const accessStateBadge: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  preview: "bg-primary/10 text-primary border-primary/20",
  payment_pending: "bg-warning/20 text-warning border-warning/30",
  active: "bg-success/20 text-success border-success/30",
  suspended: "bg-destructive/10 text-destructive border-destructive/30",
};

export default AdminDashboard;
