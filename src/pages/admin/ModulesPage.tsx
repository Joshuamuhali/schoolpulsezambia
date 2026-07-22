/**
 * Admin Modules & Pricing Page
 * Manage all platform modules and pricing. All modules require payment.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Edit,
  TrendingUp,
  DollarSign,
  Package,
  Settings,
  RefreshCw,
  Filter,
  Star,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { modulePricingService, type Feature, type SystemSettings } from "@/lib/services/modulePricingService";

const categoryColors: Record<string, string> = {
  Core: "bg-purple-100 text-purple-800 border-purple-200",
  Academic: "bg-blue-100 text-blue-800 border-blue-200",
  Financial: "bg-green-100 text-green-800 border-green-200",
  Communication: "bg-orange-100 text-orange-800 border-orange-200",
  Analytics: "bg-pink-100 text-pink-800 border-pink-200",
  Operations: "bg-gray-100 text-gray-800 border-gray-200",
};

const badgeColors: Record<string, string> = {
  REQUIRED: "bg-red-100 text-red-800 border-red-300",
  Popular: "bg-yellow-100 text-yellow-800 border-yellow-300",
  NEW: "bg-blue-100 text-blue-800 border-blue-300",
  BETA: "bg-purple-100 text-purple-800 border-purple-300",
};

const ModulesPage = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const qc = useQueryClient();

  const { data: features, isLoading, error } = useQuery({
    queryKey: ["admin-modules"],
    queryFn: modulePricingService.getAllFeatures,
    staleTime: 30_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: modulePricingService.getSystemSettings,
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["module-stats"],
    queryFn: modulePricingService.getModuleStats,
    staleTime: 60_000,
  });

  const filtered = (features ?? []).filter((f: Feature) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || f.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const grouped = filtered.reduce((acc: Record<string, Feature[]>, f: Feature) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const categories = Array.from(new Set(features?.map((f: Feature) => f.category) || []));

  const setupFee = settings?.setup_fee?.amount || 3500;

  // Calculate revenue stats
  const monthlyRevenue = stats?.schools_using_module
    ? Object.entries(stats.schools_using_module).reduce((sum, [featureId, count]) => {
        const feature = features?.find((f: Feature) => f.id === featureId);
        return sum + (feature?.monthly_price || 0) * count;
      }, 0)
    : 0;

  const yearlyRevenue = monthlyRevenue * 12;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Modules & Pricing</h1>
          <p className="text-muted-foreground">
            Manage all platform modules and pricing. All modules require payment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Module
          </Button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Setup Fee</p>
                <p className="font-display text-2xl font-bold">
                  K{setupFee.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">(configurable)</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="font-display text-2xl font-bold">
                  K{monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({stats?.schools_using_module ? Object.keys(stats.schools_using_module).length : 0} schools)
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Annual Revenue</p>
                <p className="font-display text-2xl font-bold">
                  K{yearlyRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  ({stats?.schools_using_module ? Object.keys(stats.schools_using_module).length : 0} schools)
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Statistics */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Module Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-3xl font-bold">{stats?.total_modules || 0}</p>
              <p className="text-sm text-muted-foreground">Total Modules</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{stats?.core_modules || 0}</p>
              <p className="text-sm text-muted-foreground">Core Modules</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{stats?.active_modules || 0}</p>
              <p className="text-sm text-muted-foreground">Active Modules</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {stats?.total_modules ? stats.total_modules - (stats.core_modules || 0) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Add-on Modules</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search modules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearch(""); setCategoryFilter("all"); setStatusFilter("active"); }}>
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <Skeleton className="h-4 w-96 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="shadow-card border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load modules.</p>
          </CardContent>
        </Card>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-display font-semibold">No modules found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, categoryFeatures], groupIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05 }}
            >
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${categoryColors[category] || "bg-gray-100 text-gray-800"}`}>
                      {category}
                    </span>
                    <span className="text-sm text-muted-foreground font-normal">
                      ({categoryFeatures.length} modules)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categoryFeatures.map((feature, index) => (
                      <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.05 + index * 0.02 }}
                      >
                        <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{feature.name}</h3>
                                {feature.badge && (
                                  <Badge className={badgeColors[feature.badge] || "bg-gray-100 text-gray-800"}>
                                    {feature.badge}
                                  </Badge>
                                )}
                                {feature.is_core && (
                                  <Badge className="bg-red-100 text-red-800 border-red-300">
                                    <Star className="h-3 w-3 mr-1" />
                                    REQUIRED
                                  </Badge>
                                )}
                                <Badge variant="outline" className="gap-1">
                                  <Lock className="h-3 w-3" />
                                  Paid
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Monthly:</span>
                                  <span className="font-semibold">K{feature.monthly_price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Quarterly:</span>
                                  <span className="font-semibold">K{feature.quarterly_price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Yearly:</span>
                                  <span className="font-semibold">K{feature.yearly_price.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={feature.status === "active" ? "default" : "secondary"}>
                                {feature.status}
                              </Badge>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                            <span>Schools using: {stats?.schools_using_module?.[feature.id] || 0}</span>
                            <span>Code: {feature.code}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ModulesPage;
