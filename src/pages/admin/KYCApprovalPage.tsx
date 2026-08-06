import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Building2,
  User,
  MapPin,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import type { KYCSchool } from "@/types/kyc";
import { kycService } from "@/lib/services/kycService";

const STATUS_COLORS = {
  pending: "bg-gray-100 text-gray-800",
  in_review: "bg-yellow-100 text-yellow-800",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_ICONS = {
  pending: Clock,
  in_review: Clock,
  verified: CheckCircle,
  rejected: XCircle,
};

export function KYCApprovalPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSchool, setSelectedSchool] = useState<KYCSchool | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [kycDetails, setKycDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch KYC submissions
  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ["kyc-submissions", statusFilter],
    queryFn: async () => {
      const status = statusFilter === "all" ? undefined : statusFilter;
      return kycService.getSubmissions(status);
    },
  });

  // Approve KYC mutation
  const approveMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return kycService.approveKYC(schoolId, "KYC approved by admin");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-submissions"] });
      toast.success("KYC approved successfully!");
      setShowDetailsDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve KYC");
    },
  });

  // Reject KYC mutation
  const rejectMutation = useMutation({
    mutationFn: async (schoolId: string) => {
      return kycService.rejectKYC(schoolId, rejectReason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-submissions"] });
      toast.success("KYC rejected");
      setShowRejectDialog(false);
      setShowDetailsDialog(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject KYC");
    },
  });

  // Load KYC details
  const loadKYCDetails = async (schoolId: string) => {
    setLoadingDetails(true);
    try {
      const details = await kycService.getKYCDetails(schoolId);
      setKycDetails(details);
    } catch (error) {
      toast.error("Failed to load KYC details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle view details
  const handleViewDetails = async (school: KYCSchool) => {
    setSelectedSchool(school);
    setShowDetailsDialog(true);
    await loadKYCDetails(school.id);
  };

  // Handle approve
  const handleApprove = () => {
    if (selectedSchool) {
      approveMutation.mutate(selectedSchool.id);
    }
  };

  // Handle reject
  const handleReject = () => {
    if (selectedSchool && rejectReason.trim()) {
      rejectMutation.mutate(selectedSchool.id);
    } else {
      toast.error("Please provide a rejection reason");
    }
  };

  // Stats
  const stats = {
    total: submissions?.length || 0,
    pending: submissions?.filter((s) => s.kyc_status === "pending").length || 0,
    in_review: submissions?.filter((s) => s.kyc_status === "in_review").length || 0,
    verified: submissions?.filter((s) => s.kyc_status === "verified").length || 0,
    rejected: submissions?.filter((s) => s.kyc_status === "rejected").length || 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🏫 KYC Approval</h1>
        <p className="text-gray-500 mt-1">
          Review and verify school registrations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">In Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.in_review}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Filter by Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : submissions?.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No KYC submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      School
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Admin
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Submitted
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions?.map((school) => {
                    const StatusIcon = STATUS_ICONS[school.kyc_status as keyof typeof STATUS_ICONS] || Clock;
                    return (
                      <tr key={school.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {school.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {school.subdomain}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-sm text-gray-900">
                              {school.admin_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {school.admin_email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {school.kyc_submitted_at
                            ? format(new Date(school.kyc_submitted_at), "MMM d, yyyy HH:mm")
                            : "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={STATUS_COLORS[school.kyc_status as keyof typeof STATUS_COLORS] || STATUS_COLORS.pending}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {school.kyc_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(school)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Review
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KYC Review - {selectedSchool?.name}</DialogTitle>
          </DialogHeader>

          {loadingDetails ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : kycDetails ? (
            <div className="space-y-6">
              {/* School Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>School Type</Label>
                    <p className="text-sm">{kycDetails.school_info?.school_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Education Level</Label>
                    <p className="text-sm">{kycDetails.school_info?.education_level || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Year Established</Label>
                    <p className="text-sm">{kycDetails.school_info?.year_established || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Motto</Label>
                    <p className="text-sm">{kycDetails.school_info?.motto || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Ministry Registration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    Ministry Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Registration Number</Label>
                    <p className="text-sm">{kycDetails.registration?.registration_number || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Date Registered</Label>
                    <p className="text-sm">{kycDetails.registration?.date_registered || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Certificate</Label>
                    {kycDetails.registration?.certificate_url ? (
                      <a
                        href={kycDetails.registration.certificate_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        View Certificate
                      </a>
                    ) : (
                      <p className="text-sm text-gray-400">Not uploaded</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Business Registration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="w-5 h-5" />
                    Business Registration
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>PACRA Number</Label>
                    <p className="text-sm">{kycDetails.business?.pacra_number || "N/A"}</p>
                  </div>
                  <div>
                    <Label>TPIN</Label>
                    <p className="text-sm">{kycDetails.business?.tpin || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <p className="text-sm">{kycDetails.business?.company_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Business Licence</Label>
                    <p className="text-sm">{kycDetails.business?.business_licence_number || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Ownership */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    School Ownership
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Ownership Type</Label>
                    <p className="text-sm">{kycDetails.ownership?.ownership_type || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Proprietor Name</Label>
                    <p className="text-sm">{kycDetails.ownership?.proprietor_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>NRC Number</Label>
                    <p className="text-sm">{kycDetails.ownership?.proprietor_nrc || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <p className="text-sm">{kycDetails.ownership?.proprietor_position || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{kycDetails.ownership?.proprietor_phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{kycDetails.ownership?.proprietor_email || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Head Teacher */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Head Teacher
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="text-sm">{kycDetails.head_teacher?.full_name || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{kycDetails.head_teacher?.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{kycDetails.head_teacher?.email || "N/A"}</p>
                  </div>
                  <div>
                    <Label>TCZ Number</Label>
                    <p className="text-sm">{kycDetails.head_teacher?.tcz_number || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5" />
                    School Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Province</Label>
                    <p className="text-sm">{kycDetails.address?.province || "N/A"}</p>
                  </div>
                  <div>
                    <Label>District</Label>
                    <p className="text-sm">{kycDetails.address?.district || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Physical Address</Label>
                    <p className="text-sm">{kycDetails.address?.physical_address || "N/A"}</p>
                  </div>
                  <div>
                    <Label>GPS Location</Label>
                    <p className="text-sm">{kycDetails.address?.gps_location || "N/A"}</p>
                  </div>
                  <div>
                    <Label>Postal Address</Label>
                    <p className="text-sm">{kycDetails.address?.postal_address || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5" />
                    School Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Students</Label>
                    <p className="text-2xl font-bold">{kycDetails.statistics?.number_of_students || 0}</p>
                  </div>
                  <div>
                    <Label>Teachers</Label>
                    <p className="text-2xl font-bold">{kycDetails.statistics?.number_of_teachers || 0}</p>
                  </div>
                  <div>
                    <Label>Classrooms</Label>
                    <p className="text-2xl font-bold">{kycDetails.statistics?.number_of_classrooms || 0}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {selectedSchool?.kyc_status !== "verified" && selectedSchool?.kyc_status !== "rejected" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {approveMutation.isPending ? "Approving..." : "Approve KYC"}
                  </Button>
                  <Button
                    onClick={() => setShowRejectDialog(true)}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject KYC
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p>No details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rejection Reason *</Label>
              <Textarea
                placeholder="Please provide a reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject KYC"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}