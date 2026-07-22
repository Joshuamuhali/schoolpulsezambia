/**
 * Teacher Invitation Form Component
 * Modal/dialog for inviting teachers to the school
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  User,
  GraduationCap,
  Briefcase,
  X,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { sendTeacherInvitation } from "@/lib/services/staffService";
import { useAppStore } from "@/store/appStore";

interface TeacherInvitationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TeacherInvitationForm({ open, onOpenChange, onSuccess }: TeacherInvitationFormProps) {
  const { currentSchool } = useAppStore();
  const [sending, setSending] = useState(false);
  
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [employmentType, setEmploymentType] = useState<"permanent" | "contract" | "temporary" | "intern" | "volunteer">("permanent");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !firstName || !lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentSchool?.id) {
      toast.error("School not selected");
      return;
    }

    try {
      setSending(true);

      await sendTeacherInvitation(
        currentSchool.id,
        email,
        firstName,
        lastName,
        phone || undefined,
        specialization || undefined,
        qualifications || undefined,
        employmentType
      );

      toast.success("Invitation sent successfully!");
      
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setSpecialization("");
      setQualifications("");
      setEmploymentType("permanent");

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Teacher
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a teacher to join your school
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Personal Information */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              Personal Information
            </Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name *</Label>
                <Input
                  id="first-name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input
                  id="last-name"
                  placeholder="Banda"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.banda@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="0977 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap className="h-4 w-4" />
              Professional Information
            </Label>

            <div className="space-y-2">
              <Label htmlFor="specialization">Subject Specialization</Label>
              <Input
                id="specialization"
                placeholder="Mathematics"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea
                id="qualifications"
                placeholder="B.Ed Mathematics, 5 years experience"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment-type">Employment Type</Label>
              <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sending}
              className="flex-1"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The invitation will expire in 7 days. The teacher will receive an email with a registration link.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
