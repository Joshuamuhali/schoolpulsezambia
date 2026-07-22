/**
 * Staff Contracts Management Page
 * Manage staff contracts and employment terms
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Plus,
  Download,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { staffContractService } from "@/lib/services/staffContractService";
import { useAppStore } from "@/store/appStore";

const StaffContractsPage = () => {
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"all" | "active" | "expired" | "draft" | "terminated">("all");

  const { data: contracts, isLoading } = useQuery({
    queryKey: ["staff-contracts", currentSchool?.id, activeTab],
    queryFn: () => {
      if (!currentSchool?.id) return [];
      const status = activeTab === "all" ? undefined : activeTab;
      return staffContractService.getStaffContracts(currentSchool.id, { status });
    },
    enabled: !!currentSchool?.id,
  });

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    active: "bg-green-100 text-green-800 border-green-300",
    expired: "bg-red-100 text-red-800 border-red-300",
    terminated: "bg-red-100 text-red-800 border-red-300",
    renewed: "bg-blue-100 text-blue-800 border-blue-300",
  };

  const statusIcons: Record<string, any> = {
    draft: Clock,
    active: CheckCircle,
    expired: XCircle,
    terminated: XCircle,
    renewed: CheckCircle,
  };

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return end >= now && end <= thirtyDaysFromNow;
  };

  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Staff Contracts</h1>
          <p className="text-muted-foreground">
            Manage staff contracts and employment terms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="font-display text-2xl font-bold">{contracts?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="font-display text-2xl font-bold">
                  {contracts?.filter((c) => c.status === "active").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="font-display text-2xl font-bold">
                  {contracts?.filter((c) => c.status === "expired").length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="font-display text-2xl font-bold">
                  {contracts?.filter((c) => isExpiringSoon(c.end_date)).length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as "all" | "active" | "expired" | "draft" | "terminated")}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="terminated">Terminated</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading...
                </div>
              ) : contracts && contracts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Staff</th>
                        <th className="pb-3 font-medium text-muted-foreground">Contract #</th>
                        <th className="pb-3 font-medium text-muted-foreground">Type</th>
                        <th className="pb-3 font-medium text-muted-foreground">Start Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">End Date</th>
                        <th className="pb-3 font-medium text-muted-foreground">Status</th>
                        <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((contract, index) => {
                        const StatusIcon = statusIcons[contract.status] || Clock;
                        const daysRemaining = getDaysRemaining(contract.end_date);
                        const expiring = isExpiringSoon(contract.end_date);
                        return (
                          <motion.tr
                            key={contract.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                          >
                            <td className="py-3 font-medium">
                              {contract.staff_profiles?.first_name} {contract.staff_profiles?.last_name}
                              <span className="text-xs text-muted-foreground ml-2">
                                ({contract.staff_profiles?.employee_number})
                              </span>
                            </td>
                            <td className="py-3 text-muted-foreground font-mono">
                              {contract.contract_number}
                            </td>
                            <td className="py-3">
                              <Badge variant="outline" className="capitalize">
                                {contract.contract_type}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted-foreground">
                              {new Date(contract.start_date).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              {contract.end_date ? (
                                <div>
                                  <div className="text-muted-foreground">
                                    {new Date(contract.end_date).toLocaleDateString()}
                                  </div>
                                  {expiring && daysRemaining && (
                                    <div className="text-xs text-yellow-600 font-medium">
                                      {daysRemaining} days left
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Indefinite</span>
                              )}
                            </td>
                            <td className="py-3">
                              <Badge className={statusColors[contract.status] || ""}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {contract.status}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                  View
                                </Button>
                                {contract.status === "active" && contract.end_date && (
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                    Renew
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No contracts found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffContractsPage;