import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Archive,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { academicService } from "@/lib/services/academicService";

export default function AcademicYearsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  const { data: years, isLoading } = useQuery({
    queryKey: ["academic-years", currentSchool?.id],
    queryFn: () => academicService.getAcademicYears(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => academicService.createAcademicYear(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year created successfully");
      setShowForm(false);
      setFormData({ name: "", start_date: "", end_date: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create academic year");
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: (yearId: string) =>
      academicService.setCurrentAcademicYear(currentSchool!.id, yearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year set as current");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to set current year");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (yearId: string) => academicService.archiveAcademicYear(yearId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
      toast.success("Academic year archived");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive year");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool?.id) return;

    createMutation.mutate({
      ...formData,
      school_id: currentSchool.id,
      status: "upcoming",
      is_current: false,
    });
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800">Current</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Academic Years</h1>
          <p className="text-muted-foreground mt-2">
            Manage academic years and terms
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Academic Year
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Create Academic Year</CardTitle>
              <CardDescription>
                Set up a new academic year for your school
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Academic Year Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="2026 Academic Year"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData({ ...formData, end_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Academic Year"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Academic Years List */}
      <Card>
        <CardHeader>
          <CardTitle>All Academic Years</CardTitle>
          <CardDescription>
            {years?.length || 0} academic year(s) configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : years && years.length > 0 ? (
            <div className="space-y-4">
              {years.map((year) => (
                <motion.div
                  key={year.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-medium">{year.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(year.start_date).toLocaleDateString()} -{" "}
                          {new Date(year.end_date).toLocaleDateString()}
                        </p>
                        {year.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {year.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(year.status, year.is_current)}
                    
                    {!year.is_current && year.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentMutation.mutate(year.id)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Set Current
                      </Button>
                    )}

                    {year.status !== "archived" && !year.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveMutation.mutate(year.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/dashboard/academic/terms?year=${year.id}`)}
                    >
                      View Terms
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No academic years</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first academic year
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Academic Year
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}