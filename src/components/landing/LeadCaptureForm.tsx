import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase/client";
import type { LeadFormData } from "@/types/lead";
import {
  SCHOOL_TYPE_OPTIONS,
  CONTACT_ROLE_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  STUDENT_COUNT_OPTIONS,
  CURRENT_SYSTEM_OPTIONS,
  TIMELINE_OPTIONS,
  INTERESTED_MODULES_OPTIONS,
  ZAMBIAN_PROVINCES,
} from "@/types/lead";

const initialFormData: LeadFormData = {
  school_name: "",
  school_type: "primary_school",
  location_city: "",
  location_province: "",
  contact_name: "",
  contact_role: "director",
  phone: "",
  email: "",
  preferred_contact_method: "whatsapp",
  student_count_range: "100_300",
  current_system: "spreadsheets",
  interested_modules: [],
  timeline: "1_3_months",
  message: "",
};

export default function LeadCaptureForm() {
  const [formData, setFormData] = useState<LeadFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: keyof LeadFormData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value as any }));
  };

  const handleModuleToggle = (moduleValue: string) => {
    setFormData((prev) => ({
      ...prev,
      interested_modules: prev.interested_modules.includes(moduleValue)
        ? prev.interested_modules.filter((m) => m !== moduleValue)
        : [...prev.interested_modules, moduleValue],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase.from("school_leads").insert({
        school_name: formData.school_name,
        school_type: formData.school_type,
        location_city: formData.location_city || null,
        location_province: formData.location_province || null,
        contact_name: formData.contact_name,
        contact_role: formData.contact_role,
        phone: formData.phone,
        email: formData.email,
        preferred_contact_method: formData.preferred_contact_method,
        student_count_range: formData.student_count_range,
        current_system: formData.current_system,
        interested_modules: formData.interested_modules,
        timeline: formData.timeline,
        message: formData.message || null,
        source: "homepage",
      } as any);

      if (error) throw error;

      setIsSuccess(true);
      setFormData(initialFormData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to submit form. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-success/10 border border-success/20 rounded-2xl p-8 text-center"
      >
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>
        <h3 className="font-display text-2xl font-bold text-success mb-2">
          Thank You for Reaching Out!
        </h3>
        <p className="text-muted-foreground mb-4">
          Our team will contact you within 24 hours to help you get started with School Pulse.
        </p>
        <p className="text-sm text-muted-foreground">
          Check your email for a confirmation message.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
      <div className="text-center mb-8">
        <h3 className="font-display text-2xl sm:text-3xl font-bold mb-3">
          Let's Build Your Connected School
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every school has a different journey. Tell us about your school and our team will help you find the best way to get started with School Pulse.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* School Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            School Information
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school_name">
                School Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="school_name"
                required
                value={formData.school_name}
                onChange={(e) => handleInputChange("school_name", e.target.value)}
                placeholder="Green Valley Academy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_type">
                School Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.school_type}
                onValueChange={(value) => handleInputChange("school_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_city">City/Town</Label>
              <Input
                id="location_city"
                value={formData.location_city}
                onChange={(e) => handleInputChange("location_city", e.target.value)}
                placeholder="Lusaka"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_province">Province</Label>
              <Select
                value={formData.location_province}
                onValueChange={(value) => handleInputChange("location_province", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {ZAMBIAN_PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact Person */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Contact Person
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact_name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact_name"
                required
                value={formData.contact_name}
                onChange={(e) => handleInputChange("contact_name", e.target.value)}
                placeholder="John Banda"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_role">
                Role at School <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.contact_role}
                onValueChange={(value) => handleInputChange("contact_role", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Contact Details
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                required
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="+260 977 123 456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                required
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="john@school.zm"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="preferred_contact_method">
                Preferred Contact Method <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.preferred_contact_method}
                onValueChange={(value) => handleInputChange("preferred_contact_method", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_METHOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* School Size & Current System */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            School Details
          </h4>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="student_count_range">
                Number of Students <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.student_count_range}
                onValueChange={(value) => handleInputChange("student_count_range", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_COUNT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_system">
                Current Management Method <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.current_system}
                onValueChange={(value) => handleInputChange("current_system", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENT_SYSTEM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Interested Modules */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            What would you like School Pulse to help you improve?
          </h4>
          <p className="text-xs text-muted-foreground">Select all that apply</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {INTERESTED_MODULES_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`module-${option.value}`}
                  checked={formData.interested_modules.includes(option.value)}
                  onCheckedChange={() => handleModuleToggle(option.value)}
                />
                <Label
                  htmlFor={`module-${option.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <Label htmlFor="timeline">
            When are you looking to digitize your school? <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.timeline}
            onValueChange={(value) => handleInputChange("timeline", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMELINE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="message">Additional Message (Optional)</Label>
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => handleInputChange("message", e.target.value)}
            placeholder="Tell us more about your school's needs..."
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <MessageCircle className="mr-2 h-4 w-4" />
              Request School Assistance
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By submitting this form, you agree to be contacted by our team. We respect your privacy.
        </p>
      </form>
    </div>
  );
}