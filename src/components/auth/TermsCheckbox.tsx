import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  required?: boolean;
}

export function TermsCheckbox({ checked, onCheckedChange, required = true }: TermsCheckboxProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="terms"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value as boolean)}
          className="mt-1"
        />
        <div className="flex-1">
          <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
            I agree to the Terms of Service and Privacy Policy {required && <span className="text-destructive">*</span>}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            By checking this box, you agree to our{" "}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-primary hover:underline"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => setShowPrivacy(true)}
              className="text-primary hover:underline"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Terms of Service</h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-slate max-w-none text-sm">
                <p className="text-muted-foreground mb-4">
                  By accessing and using School Pulse, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
                <h3 className="font-semibold mb-2">1. Use License</h3>
                <p className="text-muted-foreground mb-4">
                  Permission is granted to temporarily use School Pulse for personal or commercial school management purposes.
                </p>
                <h3 className="font-semibold mb-2">2. Data Privacy</h3>
                <p className="text-muted-foreground mb-4">
                  We take data privacy seriously. All student, teacher, and school data is encrypted and stored securely.
                </p>
                <h3 className="font-semibold mb-2">3. Service Availability</h3>
                <p className="text-muted-foreground mb-4">
                  We strive to maintain 99.9% uptime but do not guarantee uninterrupted access.
                </p>
                <h3 className="font-semibold mb-2">4. Payment Terms</h3>
                <p className="text-muted-foreground">
                  Subscription fees are billed monthly or annually. All payments are non-refundable unless otherwise stated.
                </p>
              </div>
            </div>
            <div className="p-6 border-t">
              <Button onClick={() => setShowTerms(false)} className="w-full">
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Privacy Policy</h2>
              <button
                onClick={() => setShowPrivacy(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-slate max-w-none text-sm">
                <p className="text-muted-foreground mb-4">
                  Your data is stored on secure servers provided by Supabase. We implement appropriate technical and organizational 
                  security measures to protect your personal information.
                </p>
                <h3 className="font-semibold mb-2">1. Information We Collect</h3>
                <p className="text-muted-foreground mb-4">
                  We collect school information, user information, student information, financial information, and academic records.
                </p>
                <h3 className="font-semibold mb-2">2. How We Use Your Information</h3>
                <p className="text-muted-foreground mb-4">
                  We use the information to provide and maintain the platform, process transactions, and send administrative information.
                </p>
                <h3 className="font-semibold mb-2">3. Data Storage and Security</h3>
                <p className="text-muted-foreground mb-4">
                  All data is encrypted in transit (TLS/SSL) and at rest. We use industry-standard security measures.
                </p>
                <h3 className="font-semibold mb-2">4. Your Rights</h3>
                <p className="text-muted-foreground">
                  You have the right to access, correct, request deletion, and export your data.
                </p>
              </div>
            </div>
            <div className="p-6 border-t">
              <Button onClick={() => setShowPrivacy(false)} className="w-full">
                I Understand
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}