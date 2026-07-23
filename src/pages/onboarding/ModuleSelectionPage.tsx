import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, ChevronDown, ChevronUp, ChevronRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  price_monthly: number;
  price_termly: number;
  price_annual: number;
  is_core: boolean;
  is_active: boolean;
}

const ModuleSelectionPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [billingFrequency, setBillingFrequency] = useState<"monthly" | "termly" | "annual">("monthly");
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["core", "academic"]);

  // Fetch available modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["module-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_catalog")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("display_order");

      if (error) throw error;
      return data as Module[];
    },
  });

  // Get school ID
  const { data: schoolData } = useQuery({
    queryKey: ["user-school"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as { school_id: string } | null;
    },
  });

  // Save module selection
  const saveSelection = useMutation({
    mutationFn: async (selection: { school_id: string; module_codes: string[]; billing_frequency: string }) => {
      const { data, error } = await supabase
        .from("school_module_selections")
        .upsert({
          school_id: selection.school_id,
          module_codes: selection.module_codes,
          billing_frequency: selection.billing_frequency,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Modules selected! Proceeding to payment.");
      navigate("/onboarding/payment");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save selection");
    },
  });

  // Group modules by category
  const groupedModules = modules?.reduce((acc, module) => {
    if (!acc[module.category]) acc[module.category] = [];
    acc[module.category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  // Calculate totals
  const getPrice = (module: Module) => {
    switch (billingFrequency) {
      case "monthly": return module.price_monthly;
      case "termly": return module.price_termly;
      case "annual": return module.price_annual;
      default: return module.price_monthly;
    }
  };

  const selectedModulesList = modules?.filter((m) => selectedModules.includes(m.code)) || [];
  const totalMonthly = selectedModulesList.reduce((sum, m) => sum + getPrice(m), 0);
  const setupFee = selectedModules.length > 0 ? 100 : 0;
  const grandTotal = totalMonthly + setupFee;

  const toggleModule = (code: string) => {
    setSelectedModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleProceed = () => {
    if (selectedModules.length === 0) {
      toast.error("Please select at least one module");
      return;
    }

    if (!schoolData) {
      toast.error("School not found");
      return;
    }

    saveSelection.mutate({
      school_id: schoolData.school_id,
      module_codes: selectedModules,
      billing_frequency: billingFrequency,
    });
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Select Your Modules</h1>
          <p className="text-gray-500 mt-2">
            Choose the features you need for your school. Core modules are included.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Module Selection */}
          <div className="lg:col-span-2 space-y-6">
            {Object.entries(groupedModules || {}).map(([category, categoryModules]) => (
              <Card key={category} className="border border-gray-200">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize text-lg">
                      {category} Modules
                      <Badge variant="secondary" className="ml-2">
                        {categoryModules.filter((m) => selectedModules.includes(m.code)).length}/
                        {categoryModules.length}
                      </Badge>
                    </CardTitle>
                    {expandedCategories.includes(category) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
                {expandedCategories.includes(category) && (
                  <CardContent className="space-y-3">
                    {categoryModules.map((module) => {
                      const isSelected = selectedModules.includes(module.code);
                      const price = getPrice(module);
                      const isCore = module.is_core;

                      return (
                        <div
                          key={module.id}
                          className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                            isSelected
                              ? "bg-indigo-50 border border-indigo-200"
                              : "bg-white border border-gray-200"
                          }`}
                        >
                          <div
                            className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center ${
                              isSelected
                                ? "bg-indigo-600 border-indigo-600"
                                : "border-gray-300"
                            }`}
                            onClick={() => !isCore && toggleModule(module.code)}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{module.name}</span>
                              {isCore && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                  Included
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{module.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {!isCore && (
                              <>
                                <span className="font-semibold text-gray-900">
                                  K {price.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-400 block">
                                  /{billingFrequency === "monthly" ? "mo" : billingFrequency === "termly" ? "term" : "yr"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <Card className="border border-gray-200 bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">💰 Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Selected Modules</span>
                    <span className="font-medium">{selectedModules.length}</span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {selectedModulesList.map((module) => (
                      <div
                        key={module.code}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-600">{module.name}</span>
                        <span className="font-medium">
                          K {getPrice(module).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Monthly Subscription</span>
                    <span className="font-semibold">K {totalMonthly.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Setup Fee
                      <span className="text-xs text-gray-400 block">One-time fee</span>
                    </span>
                    <span className="font-semibold">K {setupFee.toFixed(2)}</span>
                  </div>

                  <Separator className="border-2 border-dashed" />

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">TOTAL DUE</span>
                    <span className="text-2xl font-bold text-indigo-600">
                      K {grandTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 text-center">
                    Includes setup fee + first month subscription
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Billing Frequency
                    </label>
                    <Select
                      value={billingFrequency}
                      onValueChange={(value: "monthly" | "termly" | "annual") =>
                        setBillingFrequency(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="termly">Termly (3 months)</SelectItem>
                        <SelectItem value="annual">Annual (12 months)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button
                      onClick={handleProceed}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={selectedModules.length === 0 || saveSelection.isPending}
                    >
                      {saveSelection.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Proceed to Payment
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {selectedModules.length === 0 && (
                    <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg">
                      ⚠️ Please select at least one module to continue.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Trust Badges */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  🔒 Secure payment via Airtel Money, MTN Money, or Bank Transfer
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  💳 No hidden fees. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelectionPage;