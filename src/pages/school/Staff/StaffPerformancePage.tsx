/**
 * Staff Performance Management Page
 * Manage staff performance reviews and evaluations
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Plus,
  Download,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { staffPerformanceService } from "@/lib/services/staffPerformanceService";
import { useAppStore } from "@/store/appStore";

const StaffPerformancePage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "submitted" | "acknowledged" | "completed">("all");

  const { data: performanceReviews, isLoading } = useQuery({
    queryKey: ["staff-performance", currentSchool?.id, activeTab],
    queryFn: () => {
      if (!currentSchool?.id) return [];
      const status = activeTab === "all" ? undefined : activeTab;
      return staffPerformanceService.getStaffPerformanceReviews(currentSchool.id, { status });
    },
    enabled: !!currentSchool?.id,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    submitted: "bg-blue-100 text-blue-800 border-blue-300",
    acknowledged: "bg-yellow-100 text-yellow-800 border-yellow-300",
    completed: "bg-green-100 text-green-800 border-green-300",
  };

  const statusIcons: Record<string, any> = {
    draft: Clock,
    submitted: CheckCircle,
    acknowledged: AlertCircle,
    completed: CheckCircle,
  };

  const renderStars = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">N/A</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Performance</h1>
          <p className="text-muted-foreground">
            Manage staff performance reviews and evaluations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="font-display text-2xl font-bold">{performanceReviews?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="font-display text-2xl font-bold">
                  {performanceReviews?.filter((r) => r.status === "draft").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-display text-2xl font-bold">
                  {performanceReviews?.filter((r) => r.status === "submitted").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="font-display text-2xl font-bold">
                  {performanceReviews?.filter((r) => r.status === "completed").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "all" | "draft" | "submitted" | "acknowledged" | "completed")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="acknowledged">Acknowledged</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Performance Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : performanceReviews && performanceReviews.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Staff</th>
                        <th className="pb-3 font-medium text-muted-foreground">Review Period</th>
                        <th className="pb-3 font-medium text-muted-foreground">Overall Rating</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceReviews.map((review, index) => {
                        const StatusIcon = statusIcons[review.status] || Clock;
                        return (
                          <motion.tr
                            key={review.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {review.staff_profiles?.first_name} {review.staff_profiles?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({review.staff_profiles?.employee_number})
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(review.review_period_start).toLocaleDateString()} -{" "}
                              {new Date(review.review_period_end).toLocaleDateString()}
                            </td>
                            <td className="py-3">{renderStars(review.overall_rating)}</td>
                            <td className="py-3">
                              <Badge className={statusColors[review.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {review.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                  View
                                </Button>
                                {review.status === "draft" && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No performance reviews found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffPerformancePage;