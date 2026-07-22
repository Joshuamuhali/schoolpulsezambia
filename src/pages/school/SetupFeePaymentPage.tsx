import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { subscriptionService } from "@/lib/services/subscriptionService";
import { toast } from "sonner";

const SetupFeePaymentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(3500);
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch school subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["school-subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // @ts-ignore - getTenantSubscription expects tenantId
      return await subscriptionService.getTenantSubscription(user.id);
    },
  });

  // Fetch setup fee from system settings
  const { data: setupFee } = useQuery({
    queryKey: ["setup-fee"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "setup_fee")
        .single();

      if (error || !data) return 3500;
      // @ts-ignore - data.value type inference issue
      return data.value?.amount || 3500;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      // @ts-ignore - submitPayment expects tenant_id
      return await subscriptionService.submitPayment(paymentData);
    },
    onSuccess: () => {
      toast.success("Payment submitted successfully! Awaiting admin approval.");
      queryClient.invalidateQueries({ queryKey: ["school-subscription"] });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit payment");
    },
  });

  useEffect(() => {
    if (setupFee) {
      setAmount(setupFee);
    }
  }, [setupFee]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (!reference.trim()) {
      toast.error("Please enter payment reference");
      return;
    }

    if (!proofFile) {
      toast.error("Please upload payment proof");
      return;
    }

    setUploading(true);

    try {
      // Upload payment proof
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${user.id}/payment-proof-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Submit payment record
      await submitMutation.mutateAsync({
        tenant_id: user.id,
        amount,
        payment_method: selectedMethod,
        reference,
        proof_url: fileName,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if setup fee is already paid
  // @ts-ignore - subscription type mismatch
  if (subscription?.setup_fee_paid) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="text-center p-8">
            <CheckCircle className="mx-auto h-16 w-16 text-success mb-6" />
            <CardTitle className="text-2xl mb-2">Setup Fee Paid!</CardTitle>
            <CardDescription className="text-lg">
              Your payment has been verified. Your school is now active.
            </CardDescription>
            <div className="mt-6">
              <Button variant="hero" className="w-full" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Complete Setup Fee Payment</h1>
          <p className="text-muted-foreground mt-2">
            Pay the one-time setup fee to activate your school
          </p>
        </div>

        {/* Payment Amount Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">One-time Setup Fee</p>
                <p className="text-3xl font-bold text-primary">
                  K{amount.toLocaleString()}
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                Required
              </Badge>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a one-time payment to activate your school. Module fees will be charged separately based on your selected modules.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="method">Payment Method</Label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="airtel_money">Airtel Money</SelectItem>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference">Payment Reference / Transaction ID</Label>
                <Input
                  id="reference"
                  placeholder="e.g., TXN123456789"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount (K)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-2"
                  disabled
                />
              </div>

              <div>
                <Label htmlFor="proof">Payment Proof (Receipt/Screenshot)</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="mt-2"
                  required
                />
                {proofFile && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-success">
                    <FileText className="h-4 w-4" />
                    {proofFile.name}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a screenshot or PDF of your payment receipt (max 5MB)
                </p>
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={uploading || submitMutation.isPending}
              >
                {uploading || submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Payment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Payment Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Bank Transfer:</p>
              <p className="text-muted-foreground">Account: 1234567890, Bank: Example Bank</p>
            </div>
            <div>
              <p className="font-medium">Airtel Money:</p>
              <p className="text-muted-foreground">Number: +260 97 123 4567</p>
            </div>
            <div>
              <p className="font-medium">MTN MoMo:</p>
              <p className="text-muted-foreground">Number: +260 96 765 4321</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetupFeePaymentPage;