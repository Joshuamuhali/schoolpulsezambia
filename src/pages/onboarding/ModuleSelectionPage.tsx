/**
 * Module Selection Page (Onboarding)
 * Step 3 of 6: Select Your Modules
 * All modules require payment. Real-time pricing calculation.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Calculator,
  Star,
  Lock,
  TrendingUp,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { modulePricingService, type Feature, type ModuleCost } from "@/lib/services/modulePricingService";
import { useAppStore } from "@/store/appStore";

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

const ModuleSelectionPage = () => {
  const navigate = useNavigate();
  const { currentSchool } = useAppStore();
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [cost, setCost] = useState<ModuleCost | null>(null);
  const [setupFee, setSetupFee] = useState(3500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedModules.size > 0) {
      calculateCost();
    } else {
      setCost(null);
    }
  }, [selectedModules, billingPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [featuresData, settingsData] = await Promise.all([
        modulePricingService.getActiveFeatures(),
        modulePricingService.getSystemSettings(),
      ]);

      setFeatures(featuresData);
      setSetupFee(settingsData.setup_fee?.amount || 3500);

      // Auto-select core modules
      const coreModules = featuresData.filter((f: Feature) => f.is_core);
      const coreIds = new Set(coreModules.map((f: Feature) => f.id));
      setSelectedModules(coreIds);
    } catch (error) {
      console.error("Error loading modules:", error);
      toast.error("Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = async () => {
    try {
      const moduleIds = Array.from(selectedModules);
      const costData = await modulePricingService.calculateModuleCost(moduleIds, billingPeriod);
      setCost(costData);
    } catch (error) {
      console.error("Error calculating cost:", error);
    }
  };

  const toggleModule = (moduleId: string, isCore: boolean) => {
    if (isCore) return; // Core modules cannot be deselected

    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!currentSchool?.id) {
      toast.error("No school selected");
      return;
    }

    try {
      setSaving(true);

      // Enable selected modules for school
      const enablePromises = Array.from(selectedModules).map((moduleId) =>
        modulePricingService.enableFeature(currentSchool.id, moduleId, billingPeriod, "")
      );

      await Promise.all(enablePromises);

      toast.success("Modules selected successfully");
      navigate("/onboarding/finance");
    } catch (error) {
      console.error("Error saving modules:", error);
      toast.error("Failed to save modules");
    } finally {
      setSaving(false);
    }
  };

  const grouped = features.reduce((acc: Record<string, Feature[]>, f: Feature) => {
    if (!acc[f.category]) acc[f.category] = [];
    acc[f.category].push(f);
    return acc;
  }, {});

  const coreModules = features.filter((f: Feature) => f.is_core);
  const selectedCount = selectedModules.size;
  const totalCount = features.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding/details")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Step 3 of 6: Select Your Modules</h1>
                <p className="text-sm text-gray-600">
                  All modules require payment. Select the modules you need for your school.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => calculateCost()}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate Total
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Modules */}
            <Card className="shadow-card border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-600" />
                  Required Modules
                </CardTitle>
                <p className="text-sm text-muted-foreground">These modules are required for all schools</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {coreModules.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Checkbox
                          checked={selectedModules.has(feature.id)}
                          disabled={feature.is_core}
                          onCheckedChange={() => toggleModule(feature.id, feature.is_core)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{feature.name}</h3>
                            <Badge className="bg-red-100 text-red-800 border-red-300">
                              <Star className="h-3 w-3 mr-1" />
                              REQUIRED
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Paid
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-semibold">K{feature.monthly_price.toLocaleString()}/mo</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Other Modules */}
            {Object.entries(grouped)
              .filter(([category]) => category !== "Core")
              .map(([category, categoryFeatures], groupIndex) => (
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
                            <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                              <Checkbox
                                checked={selectedModules.has(feature.id)}
                                disabled={feature.is_core}
                                onCheckedChange={() => toggleModule(feature.id, feature.is_core)}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{feature.name}</h3>
                                  {feature.badge && (
                                    <Badge className={badgeColors[feature.badge] || "bg-gray-100 text-gray-800"}>
                                      {feature.badge}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="gap-1">
                                    <Lock className="h-3 w-3" />
                                    Paid
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{feature.description}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="font-semibold">K{feature.monthly_price.toLocaleString()}/mo</span>
                                </div>
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

          {/* Sidebar - Subscription Summary */}
          <div className="space-y-6">
            <Card className="shadow-card bg-gradient-primary text-primary-foreground border-0 sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Subscription Summary
                </CardTitle>
                <p className="text-sm opacity-80">Live pricing calculation</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="opacity-80">Setup Fee</span>
                    <span className="font-semibold">K{setupFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">Selected Modules</span>
                    <span className="font-semibold">
                      {selectedCount} of {totalCount}
                    </span>
                  </div>
                  <div className="border-t border-primary-foreground/20 pt-2">
                    <div className="flex justify-between">
                      <span className="opacity-80">Monthly Total</span>
                      <span className="font-semibold">K{cost?.subtotal?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">Quarterly Total</span>
                      <span className="font-semibold">K{cost?.subtotal?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-80">Yearly Total</span>
                      <span className="font-semibold">K{cost?.subtotal?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-primary-foreground/20 pt-4">
                  <div className="mb-3">
                    <label className="text-sm opacity-80 mb-2 block">Billing Period</label>
                    <Select value={billingPeriod} onValueChange={(value: any) => setBillingPeriod(value)}>
                      <SelectTrigger className="bg-primary-foreground/10 border-primary-foreground/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly (save 10%)</SelectItem>
                        <SelectItem value="yearly">Yearly (save 20%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold">K{cost?.total_with_discount?.toLocaleString() || 0}</span>
                    </div>
                    {cost && cost.savings > 0 && (
                      <div className="flex items-center gap-1 text-sm text-green-300">
                        <TrendingUp className="h-4 w-4" />
                        <span>You save K{cost.savings.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    onClick={handleSave}
                    disabled={saving || selectedCount === 0}
                  >
                    {saving ? (
                      "Saving..."
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save & Continue
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={() => navigate("/onboarding/details")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelectionPage;
