import { Link, Outlet, useLocation } from "react-router-dom";
import { Receipt, Plus, TrendingUp, FileText, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const expenseNavItems = [
  {
    title: "Record Expense",
    description: "Record new school expenses",
    icon: Plus,
    path: "/school/expenses/record",
  },
  {
    title: "Expense List",
    description: "View and manage all expenses",
    icon: Receipt,
    path: "/school/expenses/list",
  },
  {
    title: "Categories",
    description: "Manage expense categories",
    icon: FileText,
    path: "/school/expenses/categories",
  },
  {
    title: "Vendors",
    description: "Manage vendors and suppliers",
    icon: Wallet,
    path: "/school/expenses/vendors",
  },
  {
    title: "Reports",
    description: "Expense reports and analytics",
    icon: TrendingUp,
    path: "/school/expenses/reports",
  },
];

export default function ExpensesIndex() {
  const location = useLocation();
  const isSubRoute = expenseNavItems.some(item => location.pathname.startsWith(item.path));

  if (isSubRoute) {
    return <Outlet />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Expense Management</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage school expenses
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {expenseNavItems.map((item) => {
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
