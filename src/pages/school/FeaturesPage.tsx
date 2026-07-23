import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Filter,
  Search,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { Feature, FeatureStatus, getFeatureStatusColor, getFeatureStatusLabel, formatCurrency } from "@/types/feature";

const FeaturesPage = () => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Fetch available features
  const { data: availableFeatures, isLoading: loadingFeatures } = useQuery({
    queryKey: ["available-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_catalog")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Feature[];
    },
  });

  // Fetch school's current features
  const { data: schoolFeatures, isLoading: loadingSchoolFeatures } = useQuery({
    queryKey: ["school-features"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("school_modules")
        .select(`
          *,
          feature:module_catalog(*)
        `)
        .eq("school_id", user.id)
        .neq("status", "removed");

      if (error) throw error;
      return data;
    },
  });

  // Subscribe to features mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!paymentMethod || !referenceNumber) {
        throw new Error("Payment method and reference are required");
      }

      // Upload proof file if provided
      let proofUrl = null;
      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);

        if (uploadError) throw uploadError;
        proofUrl = uploadData.path;
      }

      // Call the Edge Function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("schools/features", {
        body: {
          feature_codes: selectedFeatures,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          proof_url: proofUrl,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment submitted! Features will be activated once approved.");
      setSelectedFeatures([]);
      setShowPaymentDialog(false);
      setPaymentMethod("");
      setReferenceNumber("");
      setProofFile(null);
      queryClient.invalidateQueries({ queryKey: ["school-features"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to subscribe to features");
    },
  });

  const handleSubscribe = () => {
    if (selectedFeatures.length === 0) {
      toast.error("Please select at least one feature");
      return;
    }
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = () => {
    subscribeMutation.mutate();
  };

  const toggleFeature = (featureCode: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureCode)
        ? prev.filter((c) => c !== featureCode)
        : [...prev, featureCode]
    );
  };

  // Calculate totals
  const selectedFeaturesData = availableFeatures?.filter((f) =>
    selectedFeatures.includes(f.code)
  ) || [];
  const totalMonthly = selectedFeaturesData.reduce((sum, f) => sum + f.monthly_price, 0);
  const totalSetup = selectedFeaturesData.reduce((sum, f) => sum + f.setup_fee, 0);

  // Filter features
  const filteredFeatures = availableFeatures?.filter((feature) => {
    const matchesSearch = feature.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || feature.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // Group features by category
  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      core: "Core Features",
      academic: "Academic",
      finance: "Finance",
      communication: "Communication",
      hr: "Human Resources",
      analytics: "Analytics",
      other: "Other",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Features</h1>
          <p className="text-muted-foreground">Subscribe to features for your school</p>
        </div>
      </div>

      {/* Current Features Summary */}
      {schoolFeatures && schoolFeatures.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Your Active Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {schoolFeatures.map((sf: any) => (
                <div
                  key={sf.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{sf.feature?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(sf.feature?.monthly_price || 0)}/month
                    </p>
                  </div>
                  <Badge className={getFeatureStatusColor(sf.status)}>
                    {getFeatureStatusLabel(sf.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Available Features */}
      {loadingFeatures ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeatures).map(([category, features]) => (
            <Card key={category} className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {getCategoryLabel(category)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {features.map((feature) => {
                    const isSelected = selectedFeatures.includes(feature.code);
                    const isActive = schoolFeatures?.some(
                      (sf: any) => sf.feature_code === feature.code && sf.status === "active"
                    );

                    return (
                      <div
                        key={feature.code}
                        className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFeature(feature.code)}
                            disabled={isActive}
                            className="mt-1 h-4 w-4 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{feature.name}</p>
                              {feature.is_core && (
                                <Badge variant="outline" className="text-xs">Core</Badge>
                              )}
                              {isActive && (
                                <Badge className="bg-success/10 text-success text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-medium text-primary">
                                {formatCurrency(feature.monthly_price)}/month
                              </span>
                              {feature.setup_fee > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  Setup: {formatCurrency(feature.setup_fee)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Subscription Summary */}
      {selectedFeatures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 left-6 sm:left-auto sm:w-96"
        >
          <Card className="shadow-lg border-primary">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Features</span>
                  <Badge>{selectedFeatures.length}</Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Total:</span>
                    <span className="font-bold">{formatCurrency(totalMonthly)}</span>
                  </div>
                  {totalSetup > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Setup Fees:</span>
                      <span className="font-bold">{formatCurrency(totalSetup)}</span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleSubscribe}
                  className="w-full"
                  disabled={subscribeMutation.isPending}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Subscribe to Selected
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Payment</DialogTitle>
            <DialogDescription>
              Complete your payment to activate the selected features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <strong>Total Amount: {formatCurrency(totalMonthly)}</strong>
                {totalSetup > 0 && (
                  <span className="block text-sm">
                    Plus setup fee: {formatCurrency(totalSetup)}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="airtel">Airtel Money</SelectItem>
                  <SelectItem value="mtn">MTN Money</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                id="reference"
                placeholder="Enter transaction reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="proof">Payment Proof (Optional)</Label>
              <Input
                id="proof"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={subscribeMutation.isPending || !paymentMethod || !referenceNumber}
            >
              {subscribeMutation.isPending ? "Submitting..." : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeaturesPage;