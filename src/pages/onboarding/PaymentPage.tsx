import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";
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
import { toast } from "sonner";

const PaymentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch module selection
  const { data: selection, isLoading: selectionLoading } = useQuery({
    queryKey: ["module-selection"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: member } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!member) throw new Error("No school found");

      const { data, error } = await supabase
        .from("school_module_selections")
        .select("*")
        .eq("school_id", member.school_id)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  // Submit payment
  const submitMutation = useMutation({
    mutationFn: async (paymentData: { school_id: string; amount: number; payment_method: string; reference: string; proof_url: string; notes?: string }) => {
      const { data, error } = await supabase
        .from("school_payments")
        .insert({
          school_id: paymentData.school_id,
          amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          reference: paymentData.reference,
          proof_url: paymentData.proof_url,
          notes: paymentData.notes,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment submitted successfully! Awaiting admin approval.");
      queryClient.invalidateQueries({ queryKey: ["module-selection"] });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit payment");
    },
  });

  useEffect(() => {
    if (selection) {
      setAmount(selection.grand_total || 0);
    }
  }, [selection]);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: member } = await supabase
        .from("school_members")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!member) throw new Error("No school found");

      // Upload payment proof
      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${member.school_id}/payment-proof-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) throw uploadError;

      // Submit payment record
      await submitMutation.mutateAsync({
        school_id: member.school_id,
        amount,
        payment_method: selectedMethod,
        reference,
        proof_url: fileName,
        notes,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  if (selectionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Module Selection Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Please select modules before making a payment.
            </p>
            <Button onClick={() => navigate("/onboarding/modules")}>
              Select Modules
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Complete Payment</h1>
          <p className="text-muted-foreground mt-2">
            Pay the setup fee to activate your school
          </p>
        </div>

        {/* Payment Amount Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount Due</p>
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
                This includes setup fee (K100) + first month subscription. Module fees will be charged
                monthly based on your selected modules.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Payment Information</CardTitle>
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
            <CardTitle className="font-display text-lg">Payment Instructions</CardTitle>
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

export default PaymentPage;