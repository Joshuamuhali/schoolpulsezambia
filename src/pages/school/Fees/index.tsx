import { Link, Outlet, useLocation } from "react-router-dom";
import { DollarSign, FileText, CreditCard, BarChart3, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/appStore";

const feeNavItems = [
  {
    title: "Fee Types",
    description: "Manage fee categories (Tuition, Sports, etc.)",
    icon: DollarSign,
    path: "/school/fees/types",
  },
  {
    title: "Assign Fees",
    description: "Assign fee structures to grades and terms",
    icon: FileText,
    path: "/school/fees/assign",
  },
  {
    title: "Record Payment",
    description: "Record fee payments from students",
    icon: CreditCard,
    path: "/school/fees/payment",
  },
  {
    title: "Student Fees",
    description: "View student fee statements and history",
    icon: LayoutDashboard,
    path: "/school/fees/students",
  },
  {
    title: "Reports",
    description: "Financial reports and analytics",
    icon: BarChart3,
    path: "/school/fees/reports",
  },
];

export default function FeesIndex() {
  const location = useLocation();
  const isSubRoute = feeNavItems.some(item => location.pathname.startsWith(item.path));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Finance Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage fees, payments, and financial reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {feeNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}>
              <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
