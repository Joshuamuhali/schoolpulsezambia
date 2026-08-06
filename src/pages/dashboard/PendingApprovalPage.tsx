import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  CreditCard,
  Mail,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { format } from "date-fns";
import { kycService } from "@/lib/services/kycService";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: {
    color: "bg-gray-100 text-gray-800",
    icon: Clock,
    title: "Pending Review",
    description: "Your KYC is waiting to be reviewed by our team.",
  },
  in_review: {
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    title: "Under Review",
    description: "Our team is currently reviewing your KYC documents.",
  },
  verified: {
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    title: "KYC Verified",
    description: "Your KYC has been approved! Please proceed with setup fee payment.",
  },
  rejected: {
    color: "bg-red-100 text-red-800",
    icon: XCircle,
    title: "KYC Rejected",
    description: "Your KYC was rejected. Please review the feedback and resubmit.",
  },
};

export function PendingApprovalPage() {
  const { user } = useAuth();
  const schoolId = user?.user_metadata?.school_id;
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [setupFeeStatus, setSetupFeeStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch KYC status
  const { data: kycData, refetch: refetchKYC } = useQuery({
    queryKey: ["kyc-status", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      return kycService.getStatus(schoolId);
    },
    enabled: !!schoolId,
  });

  // Fetch setup fee status
  const { data: setupFeeData, refetch: refetchSetupFee } = useQuery({
    queryKey: ["setup-fee-status", schoolId],
    queryFn: async () => {
      if (!schoolId) return null;
      return kycService.getSetupFeeStatus(schoolId);
    },
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (kycData) {
      setKycStatus(kycData);
    }
    if (setupFeeData) {
      setSetupFeeStatus(setupFeeData);
    }
    setLoading(false);
  }, [kycData, setupFeeData]);

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([refetchKYC(), refetchSetupFee()]);
    setLoading(false);
    alert("Status refreshed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const kycOverallStatus = kycStatus?.overall || "pending";
  const statusConfig = STATUS_CONFIG[kycOverallStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  // Calculate overall progress
  const getOverallProgress = () => {
    if (kycOverallStatus === "verified") return 100;
    if (kycOverallStatus === "rejected") return 50;
    if (kycOverallStatus === "in_review") return 75;
    
    // Calculate based on completed sections
    const sections = [
      kycStatus?.registration,
      kycStatus?.business,
      kycStatus?.ownership,
      kycStatus?.head_teacher,
      kycStatus?.address,
      kycStatus?.statistics,
    ];
    
    const completed = sections.filter((s) => s === "verified").length;
    return Math.round((completed / sections.length) * 50); // Max 50% before submission
  };

  const progress = getOverallProgress();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className={`p-4 rounded-full ${statusConfig.color}`}>
              <StatusIcon className="w-12 h-12" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {statusConfig.title}
          </h1>
          <p className="text-gray-500">{statusConfig.description}</p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Progress
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* KYC Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                KYC Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge className={statusConfig.color}>
                    {kycOverallStatus}
                  </Badge>
                </div>
                {kycStatus?.kyc_submitted_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Submitted</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(kycStatus.kyc_submitted_at), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                )}
                {kycStatus?.kyc_verified_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Verified</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(kycStatus.kyc_verified_at), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                )}
                {kycStatus?.kyc_rejection_reason && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-600">
                      {kycStatus.kyc_rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Setup Fee Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Setup Fee Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Amount</span>
                  <span className="text-sm font-medium text-gray-900">
                    K3,500
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge
                    className={
                      setupFeeStatus?.status === "paid" || setupFeeStatus?.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : setupFeeStatus?.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {setupFeeStatus?.status || "pending"}
                  </Badge>
                </div>
                {setupFeeStatus?.requested_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Requested</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(setupFeeStatus.requested_at), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                {setupFeeStatus?.paid_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Paid</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(setupFeeStatus.paid_at), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kycOverallStatus === "pending" && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Complete Your KYC
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Please complete all required sections in your KYC application.
                    </p>
                  </div>
                </div>
              )}

              {kycOverallStatus === "in_review" && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      Awaiting Review
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Our team is reviewing your documents. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>
              )}

              {kycOverallStatus === "verified" && !setupFeeStatus && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">
                      KYC Approved! Pay Setup Fee
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Your KYC has been verified. Please pay the setup fee of K3,500 to activate your account.
                    </p>
                    <Button
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      onClick={() => window.location.href = "/school/setup-fee-payment"}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay Setup Fee
                    </Button>
                  </div>
                </div>
              )}

              {kycOverallStatus === "verified" && setupFeeStatus?.status === "pending" && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <CreditCard className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      Setup Fee Payment Pending
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your setup fee payment is being verified. Please wait for confirmation.
                    </p>
                  </div>
                </div>
              )}

              {kycOverallStatus === "verified" && 
               (setupFeeStatus?.status === "paid" || setupFeeStatus?.status === "approved") && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">
                      Almost There!
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Your setup fee has been verified. You can now select modules and start using School Pulse.
                    </p>
                    <Button
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      onClick={() => window.location.href = "/onboarding/modules"}
                    >
                      Select Modules
                    </Button>
                  </div>
                </div>
              )}

              {kycOverallStatus === "rejected" && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">
                      KYC Rejected
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      Please review the rejection reason and resubmit your KYC with corrections.
                    </p>
                    <Button
                      className="mt-3 bg-red-600 hover:bg-red-700"
                      onClick={() => window.location.href = "/onboarding/kyc"}
                    >
                      Resubmit KYC
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex-1 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "mailto:support@schoolpulse.com"}
            className="flex-1 gap-2"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/help"}
            className="flex-1 gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Get Help
          </Button>
        </div>

        {/* Estimated Time */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Estimated review time: 1-2 business days
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}