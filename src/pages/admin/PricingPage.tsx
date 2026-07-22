import { useQuery } from "@tanstack/react-query";
import { DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchFeatureCatalog } from "@/lib/services/schools";

const PricingPage = () => {
  const { data: features, isLoading, error } = useQuery({
    queryKey: ["feature-catalog"],
    queryFn: fetchFeatureCatalog,
    staleTime: 300_000,
  });

  const monthlyTotal = (features ?? []).reduce((sum, f) => sum + Number(f.monthly_price), 0);
  const setupTotal = (features ?? []).reduce((sum, f) => sum + Number(f.setup_fee), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pricing</h1>
        <p className="text-muted-foreground">Module pricing — sourced from feature_catalog table.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load pricing data.</AlertDescription>
        </Alert>
      )}

      {!isLoading && features && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card bg-gradient-primary border-0 text-primary-foreground">
            <CardContent className="p-6">
              <DollarSign className="h-6 w-6 opacity-70 mb-2" />
              <p className="text-3xl font-bold">K {monthlyTotal.toLocaleString()}</p>
              <p className="text-sm opacity-80">Total if all modules enabled / month</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="p-6">
              <DollarSign className="h-6 w-6 text-primary mb-2" />
              <p className="text-3xl font-bold">K {setupTotal.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total setup fees (one-time)</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Module Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Module</th>
                  <th className="pb-3 font-medium text-muted-foreground">Key</th>
                  <th className="pb-3 font-medium text-muted-foreground">Monthly (K)</th>
                  <th className="pb-3 font-medium text-muted-foreground">Setup (K)</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[40, 24, 16, 16, 14].map((w, j) => (
                        <td key={j} className="py-3"><Skeleton className={`h-4 w-${w}`} /></td>
                      ))}
                    </tr>
                  ))
                ) : (features ?? []).map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium">{f.name}</td>
                    <td className="py-3 text-muted-foreground font-mono text-xs">{f.key}</td>
                    <td className="py-3">{f.monthly_price > 0 ? f.monthly_price.toLocaleString() : "Free"}</td>
                    <td className="py-3">{f.setup_fee > 0 ? f.setup_fee.toLocaleString() : "—"}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium ${f.is_active ? "text-success" : "text-muted-foreground"}`}>
                        {f.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingPage;
