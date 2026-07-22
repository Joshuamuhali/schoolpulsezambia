import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileText, Download, Printer, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/appStore";
import { supabase } from "@/lib/supabase/client";
import { getStudentBills, getPayments } from "@/lib/services/feeService";
import { searchStudents } from "@/lib/services/studentService";
import type { StudentBill, Payment } from "@/lib/services/feeService";

export function StudentFees() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-search", schoolId, searchQuery],
    queryFn: () => searchStudents(schoolId, searchQuery),
    enabled: !!schoolId && searchQuery.length >= 2,
  });

  const { data: terms } = useQuery({
    queryKey: ["terms", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .eq("school_id", schoolId);
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: bills, isLoading: billsLoading, refetch } = useQuery({
    queryKey: ["student-bills", schoolId, selectedStudent?.id, selectedTerm],
    queryFn: () => getStudentBills(schoolId, {
      studentId: selectedStudent?.id,
      ...(selectedTerm && { termId: selectedTerm }),
    }),
    enabled: !!schoolId && !!selectedStudent?.id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["student-payments", schoolId, selectedStudent?.id],
    queryFn: () => getPayments(schoolId, { studentId: selectedStudent?.id }),
    enabled: !!schoolId && !!selectedStudent?.id,
  });

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(`${student.first_name} ${student.last_name}`);
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

  const totalBilled = bills?.reduce((sum, bill) => sum + bill.total_amount, 0) || 0;
  const totalPaid = bills?.reduce((sum, bill) => sum + bill.paid_amount, 0) || 0;
  const totalBalance = bills?.reduce((sum, bill) => sum + bill.balance, 0) || 0;
  const totalPayments = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Student Fees</h1>
        <p className="text-sm text-muted-foreground">
          View and manage student fee statements
        </p>
      </div>

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
                  onClick={() => handleSelectStudent(student)}
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

      {selectedStudent && (
        <>
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-lg">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Admission Number</p>
                  <p className="font-semibold">{selectedStudent.admission_number}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="font-semibold">{selectedStudent.classes?.name}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-semibold">{selectedStudent.classes?.grade?.name}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Billed</p>
                    <p className="text-2xl font-bold">ZK {totalBilled.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold">ZK {totalPaid.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                    <p className="text-2xl font-bold">ZK {totalBalance.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="bills" className="space-y-4">
            <TabsList>
              <TabsTrigger value="bills">Fee Bills</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
            </TabsList>

            <TabsContent value="bills" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Fee Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  {billsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : bills && bills.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Term</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell>{bill.term_name}</TableCell>
                            <TableCell>ZK {bill.total_amount.toFixed(2)}</TableCell>
                            <TableCell>ZK {bill.paid_amount.toFixed(2)}</TableCell>
                            <TableCell className="font-semibold">ZK {bill.balance.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(bill.status)}</TableCell>
                            <TableCell>
                              {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert>
                      <AlertDescription>No bills found for this student.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentsLoading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : payments && payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{new Date(payment.created_at!).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold">ZK {payment.amount.toFixed(2)}</TableCell>
                            <TableCell className="capitalize">{payment.payment_method}</TableCell>
                            <TableCell>{payment.reference || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={payment.status === 'verified' ? 'default' : 'outline'}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert>
                      <AlertDescription>No payments recorded for this student.</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
