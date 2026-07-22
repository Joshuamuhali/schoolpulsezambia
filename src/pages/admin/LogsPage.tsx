import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Activity,
  Calendar,
  User,
  School,
  RefreshCw,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { fetchSystemLogs } from "@/lib/services/adminService";
import { formatDistanceToNow, format } from "date-fns";

const LogsPage = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-logs", search, actionFilter, tableFilter],
    queryFn: () =>
      fetchSystemLogs({
        action: actionFilter === "all" ? undefined : actionFilter,
        tableName: tableFilter === "all" ? undefined : tableFilter,
        limit: 100,
      }),
    staleTime: 30_000,
  });

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      create: "bg-success/10 text-success border-success/20",
      update: "bg-info/10 text-info border-info/20",
      delete: "bg-destructive/10 text-destructive border-destructive/20",
      approve: "bg-success/10 text-success border-success/20",
      reject: "bg-warning/10 text-warning border-warning/20",
      login: "bg-primary/10 text-primary border-primary/20",
      logout: "bg-muted text-muted-foreground",
    };

    return (
      <Badge variant="outline" className={actionColors[action] || "bg-muted text-muted-foreground"}>
        {action}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (!logs || logs.length === 0) return;

    const headers = ["Timestamp", "Action", "Table", "School", "User", "Email"];
    const rows = logs.map((log: any) => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.action,
      log.table_name || "N/A",
      log.schools?.name || "Platform",
      log.profiles?.first_name && log.profiles?.last_name
        ? `${log.profiles.first_name} ${log.profiles.last_name}`
        : "System",
      log.profiles?.email || "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load audit logs. Please refresh the page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Audit trail of all platform activities</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" disabled={!logs || logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                <SelectItem value="schools">Schools</SelectItem>
                <SelectItem value="payments">Payments</SelectItem>
                <SelectItem value="users">Users</SelectItem>
                <SelectItem value="students">Students</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Audit Logs ({logs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audit logs found matching your criteria.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">{log.table_name || "N/A"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <School className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{log.schools?.name || "Platform"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.profiles ? (
                          <div>
                            <p className="text-sm">
                              {log.profiles.first_name} {log.profiles.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.profiles.email}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <details className="cursor-pointer">
                          <summary className="text-xs text-primary hover:underline">View Details</summary>
                          <pre className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded overflow-auto max-w-md">
                            {JSON.stringify(log.after_state, null, 2)}
                          </pre>
                        </details>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsPage;