import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAppStore } from "@/store/appStore";
import { supabase } from "@/lib/supabase/client";
import { getFeeSummary, getOutstandingFeesReport, getPaymentHistory } from "@/lib/services/feeService";

export function FeeReport() {
  const schoolId = useAppStore((s) => s.currentSchool?.id)!;
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [reportType, setReportType] = useState<"collection" | "outstanding" | "payment">("collection");

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

  const { data: grades } = useQuery({
    queryKey: ["grades", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("*")
        .eq("school_id", schoolId)
        .order("level");
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["fee-summary", schoolId, selectedTerm],
    queryFn: () => getFeeSummary(schoolId, selectedTerm || undefined),
    enabled: !!schoolId,
  });

  const { data: outstandingBills, isLoading: outstandingLoading } = useQuery({
    queryKey: ["outstanding-fees", schoolId, selectedTerm],
    queryFn: () => getOutstandingFeesReport(schoolId, selectedTerm || undefined),
    enabled: !!schoolId && reportType === "outstanding",
  });

  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payment-history", schoolId],
    queryFn: () => getPaymentHistory(schoolId),
    enabled: !!schoolId && reportType === "payment",
  });

  const { data: gradeCollection, isLoading: gradeLoading } = useQuery({
    queryKey: ["grade-collection", schoolId, selectedTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_bills")
        .select(`
          *,
          students!inner (
            grade_id,
            grades (name)
          )
        `)
        .eq("school_id", schoolId)
        .gte("created_at", selectedTerm ? undefined : new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString());

      if (error) throw error;

      // Group by grade
      const grouped = (data || []).reduce((acc: any, bill: any) => {
        const gradeName = bill.students?.grades?.name || "Unassigned";
        if (!acc[gradeName]) {
          acc[gradeName] = {
            grade: gradeName,
            totalBilled: 0,
            totalCollected: 0,
            outstanding: 0,
            studentCount: 0,
          };
        }
        acc[gradeName].totalBilled += Number(bill.total_amount);
        acc[gradeName].totalCollected += Number(bill.paid_amount);
        acc[gradeName].outstanding += Number(bill.balance);
        acc[gradeName].studentCount += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
    enabled: !!schoolId && reportType === "collection",
  });

  const handleExport = () => {
    // Export functionality would go here
    console.log("Exporting report...");
  };

  const collectionRate = summary?.totalFees > 0 
    ? ((summary.totalCollected / summary.totalFees) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Fee Reports</h1>
          <p className="text-sm text-muted-foreground">
            Financial reports and analytics
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="flex gap-4">
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Terms</SelectItem>
            {terms?.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {term.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Grades</SelectItem>
            {grades?.map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>
                {grade.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">ZK {summary?.totalFees.toFixed(2) || 0}</p>
                )}
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
                <p className="text-sm text-muted-foreground">Collected</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">ZK {summary?.totalCollected.toFixed(2) || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">ZK {summary?.pendingBalance.toFixed(2) || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                {summaryLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{collectionRate}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={(v: any) => setReportType(v)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="collection">Grade Collection</TabsTrigger>
          <TabsTrigger value="outstanding">Outstanding Fees</TabsTrigger>
          <TabsTrigger value="payment">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="collection" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Fee Collection by Grade</CardTitle>
            </CardHeader>
            <CardContent>
              {gradeLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : gradeCollection && gradeCollection.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Grade</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Total Billed</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Collection Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeCollection.map((grade: any) => {
                      const rate = grade.totalBilled > 0 
                        ? ((grade.totalCollected / grade.totalBilled) * 100).toFixed(1) 
                        : "0";
                      return (
                        <TableRow key={grade.grade}>
                          <TableCell className="font-medium">{grade.grade}</TableCell>
                          <TableCell>{grade.studentCount}</TableCell>
                          <TableCell>ZK {grade.totalBilled.toFixed(2)}</TableCell>
                          <TableCell className="text-green-600">ZK {grade.totalCollected.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600">ZK {grade.outstanding.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(rate) >= 80 ? "default" : "outline"}>
                              {rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No collection data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outstanding" className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Outstanding Fees</CardTitle>
            </CardHeader>
            <CardContent>
              {outstandingLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : outstandingBills && outstandingBills.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outstandingBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.student_name}</TableCell>
                        <TableCell>{bill.admission_number}</TableCell>
                        <TableCell>{bill.term_name}</TableCell>
                        <TableCell>ZK {bill.total_amount.toFixed(2)}</TableCell>
                        <TableCell>ZK {bill.paid_amount.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-red-600">
                          ZK {bill.balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{bill.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No outstanding fees
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
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
              ) : paymentHistory && paymentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.created_at!).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{payment.student_name}</TableCell>
                        <TableCell className="font-semibold">ZK {payment.amount.toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{payment.payment_method}</TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payment history
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
