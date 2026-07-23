import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Users,
  Package,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase/client";

interface FeatureLifecycle {
  school_id: string;
  school_name: string;
  feature_code: string;
  feature_name: string;
  category: string;
  status: "active" | "paused" | "expired" | "pending" | "removed";
  price_at_activation: number;
  billing_frequency: string;
  current_price: number;
  total_paid: number;
  days_remaining: number | null;
}

const FeatureStatusOverview = () => {
  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ["all-features-lifecycle"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_feature_lifecycle")
        .select("*")
        .order("school_name", { ascending: true })
        .order("category", { ascending: true })
        .order("feature_name", { ascending: true });

      if (error) throw error;
      return data as FeatureLifecycle[];
    },
  });

  const calculateStats = () => {
    if (!features) return null;

    const totalFeatures = features.length;
    const activeFeatures = features.filter((f) => f.status === "active").length;
    const pausedFeatures = features.filter((f) => f.status === "paused").length;
    const expiredFeatures = features.filter((f) => f.status === "expired").length;
    const pendingFeatures = features.filter((f) => f.status === "pending").length;
    const removedFeatures = features.filter((f) => f.status === "removed").length;

    const totalRevenue = features
      .filter((f) => f.status === "active")
      .reduce((sum, f) => sum + (f.current_price || 0), 0);

    const totalCollected = features.reduce((sum, f) => sum + (f.total_paid || 0), 0);

    const uniqueSchools = new Set(features.map((f) => f.school_id)).size;

    const featuresExpiringSoon = features.filter(
      (f) => f.status === "active" && f.days_remaining !== null && f.days_remaining <= 7
    ).length;

    const featuresInGracePeriod = features.filter(
      (f) => f.status === "active" && f.days_remaining !== null && f.days_remaining < 0
    ).length;

    const categoryBreakdown = features.reduce((acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = { total: 0, active: 0, revenue: 0 };
      }
      acc[feature.category].total++;
      if (feature.status === "active") {
        acc[feature.category].active++;
        acc[feature.category].revenue += feature.current_price || 0;
      }
      return acc;
    }, {} as Record<string, { total: number; active: number; revenue: number }>);

    return {
      totalFeatures,
      activeFeatures,
      pausedFeatures,
      expiredFeatures,
      pendingFeatures,
      removedFeatures,
      totalRevenue,
      totalCollected,
      uniqueSchools,
      featuresExpiringSoon,
      featuresInGracePeriod,
      categoryBreakdown,
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Status Overview</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide feature subscription status
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.totalFeatures}</div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {stats.uniqueSchools} schools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{stats.activeFeatures}</div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.activeFeatures / stats.totalFeatures) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                K{stats.totalRevenue.toLocaleString()}
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From active features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                K{stats.totalCollected.toLocaleString()}
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.activeFeatures}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-800">
              Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{stats.pausedFeatures}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.expiredFeatures}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.pendingFeatures}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">
              Removed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.removedFeatures}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats.featuresExpiringSoon > 0 || stats.featuresInGracePeriod > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.featuresExpiringSoon > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expiring Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">
                  {stats.featuresExpiringSoon}
                </div>
                <p className="text-xs text-orange-700 mt-1">
                  Features expiring within 7 days
                </p>
              </CardContent>
            </Card>
          )}

          {stats.featuresInGracePeriod > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  In Grace Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">
                  {stats.featuresInGracePeriod}
                </div>
                <p className="text-xs text-red-700 mt-1">
                  Features in grace period
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold capitalize">{category}</h3>
                  <p className="text-sm text-muted-foreground">
                    {data.active} of {data.total} features active
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">K{data.revenue.toLocaleString()}/mo</p>
                  <Badge
                    variant="outline"
                    className={
                      data.active === data.total
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-yellow-100 text-yellow-800 border-yellow-200"
                    }
                  >
                    {((data.active / data.total) * 100).toFixed(0)}% active
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Recent Feature Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {features && features.length > 0 ? (
            <div className="space-y-3">
              {features.slice(0, 10).map((feature) => (
                <div
                  key={`${feature.school_id}-${feature.feature_code}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{feature.feature_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {feature.school_name} • {feature.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-medium">
                      K{feature.current_price?.toLocaleString()}/{feature.billing_frequency}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        feature.status === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : feature.status === "paused"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                          : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {feature.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No features to display</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureStatusOverview;
