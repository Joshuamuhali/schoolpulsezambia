/**
 * Subscriptions Management Page
 * Admin page for managing school subscriptions and payments
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";
import { subscriptionService, type SubscriptionPlan, type TenantSubscription, type SubscriptionPayment } from "@/lib/services/subscriptionService";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  Eye
} from "lucide-react";

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<(TenantSubscription & {
    tenants: { name: string; slug: string };
    subscription_plans: { name: string; price: number };
  })[]>([]);
  const [pendingPayments, setPendingPayments] = useState<SubscriptionPayment[]>([]);
  const [stats, setStats] = useState({
    total_schools: 0,
    active_schools: 0,
    trial_schools: 0,
    expired_schools: 0,
    pending_payments: 0,
    total_revenue: 0,
  });
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [subscriptionsData, paymentsData, statsData] = await Promise.all([
        subscriptionService.getAllSubscriptions(),
        subscriptionService.getPendingPayments(),
        subscriptionService.getSubscriptionStats(),
      ]);

      setSubscriptions(subscriptionsData);
      setPendingPayments(paymentsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "trial": return "bg-blue-100 text-blue-800";
      case "pending_payment": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      case "suspended": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await subscriptionService.approvePayment(paymentId, user.id);
      await loadData();
      setShowPaymentModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error("Error approving payment:", error);
    }
  };

  const handleRejectPayment = async (paymentId: string, reason: string) => {
    try {
      await subscriptionService.rejectPayment(paymentId, reason);
      await loadData();
      setShowPaymentModal(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error("Error rejecting payment:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
                <p className="text-sm text-gray-600">Manage school subscriptions and payments</p>
              </div>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Schools</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_schools}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active_schools}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trial</p>
                <p className="text-2xl font-bold text-blue-600">{stats.trial_schools}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired_schools}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending_payments}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  K{stats.total_revenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <Card className="p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Payments ({pendingPayments.length})
            </h3>
            <div className="space-y-3">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {payment.tenant_id}
                      </p>
                      <Badge className={getPaymentStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Amount: K{payment.amount.toLocaleString()} | Method: {payment.payment_method}
                    </p>
                    <p className="text-sm text-gray-600">
                      Reference: {payment.reference} | Submitted: {new Date(payment.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setShowPaymentModal(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All Subscriptions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Subscriptions</h3>
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {subscription.tenants?.name || subscription.tenant_id}
                    </p>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Plan: {subscription.subscription_plans?.name || "None"} | 
                    Price: K{subscription.subscription_plans?.price?.toLocaleString() || 0}/month
                  </p>
                  {subscription.expiry_date && (
                    <p className="text-sm text-gray-600">
                      Expires: {new Date(subscription.expiry_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Payment Review Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Payment</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">School</p>
                <p className="font-semibold text-gray-900">{selectedPayment.tenant_id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-2xl font-bold text-gray-900">K{selectedPayment.amount.toLocaleString()}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900 capitalize">{selectedPayment.payment_method}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Reference</p>
                <p className="font-semibold text-gray-900">{selectedPayment.reference}</p>
              </div>

              {selectedPayment.proof_url && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Payment Proof</p>
                  <img
                    src={selectedPayment.proof_url}
                    alt="Payment proof"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="font-semibold text-gray-900">
                  {new Date(selectedPayment.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <Button
                onClick={() => handleApprovePayment(selectedPayment.id)}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const reason = prompt("Rejection reason:");
                  if (reason) {
                    handleRejectPayment(selectedPayment.id, reason);
                  }
                }}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPayment(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}