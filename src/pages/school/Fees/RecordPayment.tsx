import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Save, DollarSign, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import {
  getStudentBills,
  recordPayment,
  updateBillAfterPayment,
  getPayments,
} from "@/lib/services/finance";
import { searchStudents } from "@/lib/services/studentService";
import type { StudentBill, PaymentRecord } from "@/lib/services/finance";

export function RecordPayment() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const userId = useAppStore((s) => s.userId)!;
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBill, setSelectedBill] = useState<StudentBill | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [reference, setReference] = useState<string>("");

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-search", schoolId, searchQuery],
    queryFn: () => searchStudents(schoolId, searchQuery),
    enabled: !!schoolId && searchQuery.length >= 2,
  });

  const { data: bills, isLoading: billsLoading, refetch: refetchBills } = useQuery({
    queryKey: ["student-bills", schoolId, selectedBill?.student_id],
    queryFn: () => getStudentBills(schoolId, selectedBill?.student_id),
    enabled: !!schoolId && !!selectedBill?.student_id,
  });

  const { data: recentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", schoolId],
    queryFn: () => getPayments(schoolId),
    enabled: !!schoolId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBill) return;
      const paymentAmount = parseFloat(amount);
      await recordPayment(
        schoolId,
        selectedBill.student_id,
        selectedBill.id,
        paymentAmount,
        paymentMethod,
        reference || null,
        userId
      );
      await updateBillAfterPayment(selectedBill.id, paymentAmount);
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setAmount("");
      setReference("");
      setSelectedBill(null);
      setSearchQuery("");
      qc.invalidateQueries({ queryKey: ["payments", schoolId] });
      refetchBills();
    },
    onError: (err: Error) => {
      toast.error(`Failed to record payment: ${err.message}`);
    },
  });

  const handleRecordPayment = () => {
    if (!selectedBill || !amount || !paymentMethod) {
      toast.error("Please fill in all required fields");
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (paymentAmount > selectedBill.balance) {
      toast.error(`Payment amount cannot exceed balance of ZK ${selectedBill.balance.toFixed(2)}`);
      return;
    }

    createMutation.mutate();
  };

  const handleSelectStudent = (studentId: string) => {
    const student = students?.find(s => s.id === studentId);
    if (student) {
      setSearchQuery(student.first_name + " " + student.last_name);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      unpaid: "destructive",
      partial: "warning",
      paid: "success",
      overdue: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Record Payment</h1>
        <p className="text-sm text-muted-foreground">
          Record fee payments from students
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Payment Form */}
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Select Student</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {searchQuery.length >= 2 && studentsLoading && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && students && students.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedBill(null);
                        handleSelectStudent(student.id);
                      }}
                    >
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                      </div>
                      <div className="text-sm">
                        {student.classes?.name} - {student.classes?.grade?.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBill && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Student Bills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {billsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : bills && bills.length > 0 ? (
                  <div className="space-y-2">
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        className={`flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-colors ${
                          selectedBill?.id === bill.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedBill(bill)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bill.term_name}</span>
                            {getStatusBadge(bill.status)}
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span>Total: ZK {bill.total_amount.toFixed(2)}</span>
                            <span>Paid: ZK {bill.paid_amount.toFixed(2)}</span>
                            <span className="font-semibold text-primary">
                              Balance: ZK {bill.balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No bills found for this student.</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {selectedBill && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Record Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <DollarSign className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                    <p className="text-2xl font-bold">ZK {selectedBill.balance.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (ZK)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    max={selectedBill.balance}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference Number (Optional)</Label>
                  <Input
                    id="reference"
                    placeholder="Transaction reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleRecordPayment}
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createMutation.isPending ? "Recording..." : "Record Payment"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Recent Payments */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentPayments && recentPayments.length > 0 ? (
              <div className="space-y-3">
                {recentPayments.slice(0, 10).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.payment_method} • {new Date(payment.created_at!).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">ZK {payment.amount.toFixed(2)}</p>
                      {payment.reference && (
                        <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>No payments recorded yet.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
