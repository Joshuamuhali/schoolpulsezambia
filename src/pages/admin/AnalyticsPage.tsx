import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  School,
  DollarSign,
  Activity,
  Download,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

// Define types for analytics data
interface SchoolRegistration {
  created_at: string;
}

interface Payment {
  amount: number;
  verified_at: string;
}

interface UserRegistration {
  created_at: string;
}

interface AnalyticsData {
  schoolRegistrations: SchoolRegistration[];
  payments: Payment[];
  users: UserRegistration[];
  totalRevenue: number;
  totalSchools: number;
  totalUsers: number;
}

const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState("30d");

  // Fetch analytics data
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ["admin-analytics", timeRange],
    queryFn: async () => {
      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString();

      // Get school registrations over time
      const { data: schoolRegistrations, error: schoolError } = await supabase
        .from("schools")
        .select("created_at")
        .gte("created_at", startDate)
        .order("created_at");

      if (schoolError) throw schoolError;

      // Get revenue over time
      const { data: payments, error: paymentError } = await supabase
        .from("subscription_payments")
        .select("amount, verified_at")
        .eq("status", "verified")
        .gte("verified_at", startDate)
        .order("verified_at");

      if (paymentError) throw paymentError;

      // Get user growth
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startDate)
        .order("created_at");

      if (userError) throw userError;

      // Calculate totals with proper typing
      const paymentsList = (payments || []) as Payment[];
      const totalRevenue = paymentsList.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalSchools = schoolRegistrations?.length || 0;
      const totalUsers = users?.length || 0;

      return {
        schoolRegistrations: schoolRegistrations || [],
        payments: payments || [],
        users: users || [],
        totalRevenue,
        totalSchools,
        totalUsers,
      } as AnalyticsData;
    },
    staleTime: 60_000,
  });

  const handleExport = () => {
    toast.success("Exporting analytics data...");
    // TODO: Implement CSV export
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Platform-wide insights and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">
                  K{analytics?.totalRevenue.toLocaleString() || 0}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Schools</p>
                <p className="text-2xl font-bold text-primary">
                  {analytics?.totalSchools || 0}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span>+8.2%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <School className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Users</p>
                <p className="text-2xl font-bold text-primary">
                  {analytics?.totalUsers || 0}
                </p>
                <div className="flex items-center gap-1 mt-2 text-sm text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span>+15.3%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rate</p>
                <p className="text-2xl font-bold text-primary">87.5%</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                  <TrendingDown className="h-4 w-4" />
                  <span>-2.1%</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Revenue Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Revenue chart visualization
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total: K{analytics?.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* School Growth Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              School Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      School growth chart
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {analytics?.totalSchools} new schools
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Platform Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.schoolRegistrations.slice(0, 5).map((school, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <School className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">New School Registration</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(school.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success">
                  Active
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;