import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, CheckCircle, XCircle, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { FeatureGate } from "@/components/FeatureGate";
import {
  getStudentPayments,
  getStudentPayment,
  createStudentPayment,
  approveStudentPayment,
  rejectStudentPayment,
} from "@/lib/services/financeService";
import { StudentPayment } from "@/lib/supabase/types";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "mtn_money", label: "MTN Money" },
  { value: "zamtel_money", label: "Zamtel Money" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const RELATIONSHIPS = [
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "sponsor", label: "Sponsor" },
  { value: "other", label: "Other" },
];

export default function StudentPaymentsPage() {
  const { school, user } = useAuth();
  const { hasAccess } = useFeatureAccess();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<StudentPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formData, setFormData] = useState({
    student_id: "",
    invoice_id: "",
    amount: "",
    payment_method: "cash" as StudentPayment["payment_method"],
    reference_number: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_time: new Date().toTimeString().split(" ")[0].substring(0, 5),
    payer_name: "",
    payer_phone: "",
    payer_email: "",
    relationship: "parent" as StudentPayment["relationship"],
    notes: "",
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["student-payments", school?.id, statusFilter],
    queryFn: () => getStudentPayments(school!.id, {
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    enabled: !!school?.id && hasAccess("finance"),
  });

  const { data: paymentDetail } = useQuery({
    queryKey: ["student-payment", viewingPayment?.id],
    queryFn: () => getStudentPayment(viewingPayment!.id),
    enabled: !!viewingPayment?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<StudentPayment, "id" | "school_id" | "status" | "submitted_by" | "created_at" | "updated_at">) =>
      createStudentPayment(school!.id, data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-payments"] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Payment submitted successfully. Awaiting approval.");
    },
    onError: (err: any) => {
      setError(err.message);
      toast.error(err.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ paymentId, approvedBy }: { paymentId: string; approvedBy: string }) =>
      approveStudentPayment(paymentId, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-payments"] });
      toast.success("Payment approved successfully");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      rejectStudentPayment(paymentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-payments"] });
      toast.success("Payment rejected");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      invoice_id: "",
      amount: "",
      payment_method: "cash",
      reference_number: "",
      payment_date: new Date().toISOString().split("T")[0],
      payment_time: new Date().toTimeString().split(" ")[0].substring(0, 5),
      payer_name: "",
      payer_phone: "",
      payer_email: "",
      relationship: "parent",
      notes: "",
    });
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      student_id: formData.student_id,
      invoice_id: formData.invoice_id || undefined,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      reference_number: formData.reference_number || undefined,
      payment_date: formData.payment_date,
      payment_time: formData.payment_time,
      payer_name: formData.payer_name,
      payer_phone: formData.payer_phone || undefined,
      payer_email: formData.payer_email || undefined,
      relationship: formData.relationship,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(data);
  };

  const handleApprove = (paymentId: string) => {
    if (confirm("Are you sure you want to approve this payment?")) {
      approveMutation.mutate({ paymentId, approvedBy: user!.id });
    }
  };

  const handleReject = (paymentId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      rejectMutation.mutate({ paymentId, reason });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredPayments = payments?.filter((payment) =>
    payment.payer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <FeatureGate feature="finance">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Student Payments</h1>
            <p className="text-muted-foreground">Record and manage student fee payments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Student Payment</DialogTitle>
                <DialogDescription>
                  Record a new payment from a student or parent
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_id">Student ID *</Label>
                    <Input
                      id="student_id"
                      placeholder="Student UUID"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoice_id">Invoice ID (Optional)</Label>
                    <Input
                      id="invoice_id"
                      placeholder="Invoice UUID"
                      value={formData.invoice_id}
                      onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (K) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method *</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment_date">Payment Date *</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_time">Payment Time *</Label>
                    <Input
                      id="payment_time"
                      type="time"
                      value={formData.payment_time}
                      onChange={(e) => setFormData({ ...formData, payment_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payer_name">Payer Name *</Label>
                  <Input
                    id="payer_name"
                    placeholder="Name of person making payment"
                    value={formData.payer_name}
                    onChange={(e) => setFormData({ ...formData, payer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payer_phone">Payer Phone</Label>
                    <Input
                      id="payer_phone"
                      placeholder="+260 97 123 4567"
                      value={formData.payer_phone}
                      onChange={(e) => setFormData({ ...formData, payer_phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payer_email">Payer Email</Label>
                    <Input
                      id="payer_email"
                      type="email"
                      placeholder="payer@example.com"
                      value={formData.payer_email}
                      onChange={(e) => setFormData({ ...formData, payer_email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="relationship">Relationship *</Label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(value: any) => setFormData({ ...formData, relationship: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel.value} value={rel.value}>
                            {rel.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference_number">Reference Number</Label>
                    <Input
                      id="reference_number"
                      placeholder="Transaction reference"
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Submitting..." : "Submit Payment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              {payments?.length || 0} payment(s) recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredPayments && filteredPayments.length > 0 ? (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{payment.payer_name}</h3>
                        <Badge className={getStatusColor(payment.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(payment.status)}
                            {payment.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm">
                        <span className="font-semibold text-primary">
                          K {payment.amount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {payment.payment_method.replace("_", " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {payment.payment_date}
                        </span>
                      </div>
                      {payment.receipt_number && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Receipt: {payment.receipt_number}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {payment.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(payment.id)}
                            disabled={approveMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReject(payment.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No payments found</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter"
                    : "Get started by recording your first payment"}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Payment Dialog */}
        <Dialog open={!!viewingPayment} onOpenChange={() => setViewingPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                {paymentDetail ? `Receipt: ${paymentDetail.receipt_number || "Pending"}` : "Loading..."}
              </DialogDescription>
            </DialogHeader>
            {paymentDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payer Name</p>
                    <p className="font-semibold">{paymentDetail.payer_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Amount</p>
                    <p className="font-semibold text-primary">K {paymentDetail.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                    <p className="font-semibold">{paymentDetail.payment_method.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(paymentDetail.status)}>
                      {paymentDetail.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Date</p>
                    <p className="font-semibold">{paymentDetail.payment_date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Payment Time</p>
                    <p className="font-semibold">{paymentDetail.payment_time}</p>
                  </div>
                  {paymentDetail.reference_number && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                      <p className="font-semibold">{paymentDetail.reference_number}</p>
                    </div>
                  )}
                  {paymentDetail.receipt_number && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Receipt Number</p>
                      <p className="font-semibold">{paymentDetail.receipt_number}</p>
                    </div>
                  )}
                </div>
                {paymentDetail.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{paymentDetail.notes}</p>
                  </div>
                )}
                {paymentDetail.rejection_reason && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rejection Reason</p>
                    <p className="text-sm text-red-600">{paymentDetail.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}