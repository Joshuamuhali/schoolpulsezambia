import { useState } from "react";
import { Search, CreditCard, AlertCircle, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAppStore } from "@/store/appStore";
import { fetchInvoices, fetchFinanceSummary } from "@/lib/services/finance";

const statusColors: Record<string, string> = {
  paid: "bg-success/20 text-success border-success/30",
  partial: "bg-warning/20 text-warning border-warning/30",
  unpaid: "bg-destructive/10 text-destructive border-destructive/30",
  overdue: "bg-destructive/20 text-destructive border-destructive/40",
};

const FinancePage = () => {
  const [search, setSearch] = useState("");
  const schoolId = useAppStore((s) => s.currentSchool?.id);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["finance-summary", schoolId],
    queryFn: () => fetchFinanceSummary(schoolId!),
    enabled: !!schoolId,
    staleTime: 60_000,
  });

  const { data: bills, isLoading: billsLoading, error } = useQuery({
    queryKey: ["student-bills", schoolId, search],
    queryFn: () => fetchInvoices(schoolId!, search || undefined),
    enabled: !!schoolId,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Finance</h1>
        <p className="text-muted-foreground">Fee management, payments, and billing</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Revenue",
            value: summary ? `K ${summary.totalRevenue.toLocaleString()}` : undefined,
            icon: DollarSign,
            sub: "All verified payments",
          },
          {
            label: "Outstanding Balance",
            value: summary ? `K ${summary.pendingBalance.toLocaleString()}` : undefined,
            icon: TrendingDown,
            sub: "Unpaid + partial bills",
          },
          {
            label: "Overdue Bills",
            value: summary ? String(summary.overdueCount) : undefined,
            icon: AlertTriangle,
            sub: "Require follow-up",
          },
        ].map((card) => (
          <Card key={card.label} className="shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <card.icon className="h-4 w-4 text-primary" />
                </div>
              </div>
              {summaryLoading ? (
                <Skeleton className="h-7 w-28 mb-1" />
              ) : (
                <p className="text-2xl font-bold">{card.value ?? "—"}</p>
              )}
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-xs text-muted-foreground/60">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load billing data. Please refresh.</AlertDescription>
        </Alert>
      )}

      {/* Bills table */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg">Student Bills</CardTitle>
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Student</th>
                  <th className="pb-3 font-medium text-muted-foreground">Term</th>
                  <th className="pb-3 font-medium text-muted-foreground">Total</th>
                  <th className="pb-3 font-medium text-muted-foreground">Paid</th>
                  <th className="pb-3 font-medium text-muted-foreground">Balance</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {billsLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[36, 20, 20, 20, 20, 14].map((w, j) => (
                        <td key={j} className="py-3"><Skeleton className={`h-4 w-${w}`} /></td>
                      ))}
                    </tr>
                  ))
                ) : !bills || bills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      {search ? "No bills match your search." : "No billing records found."}
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 font-medium">
                        {b.students?.full_name ?? "—"}
                        <span className="ml-1 text-xs text-muted-foreground">{b.students?.admission_number}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{b.terms?.name ?? "—"}</td>
                      <td className="py-3">K {Number(b.total_amount).toLocaleString()}</td>
                      <td className="py-3 text-success">K {Number(b.paid_amount).toLocaleString()}</td>
                      <td className="py-3 font-medium">K {Number(b.balance).toLocaleString()}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={statusColors[b.status] ?? ""}>
                          {b.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancePage;
