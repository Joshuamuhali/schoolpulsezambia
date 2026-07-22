import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Wizard } from "@/components/setup/Wizard";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSetupStore } from "@/store/setupStore";

const CommunicationSetup = () => {
  const navigate = useNavigate();
  const ms = useSetupStore((s) => s.modules.communication);
  const { setStep, patchData, markComplete } = useSetupStore.getState();
  const data = ms.data as Record<string, any>;

  const [smsEnabled, setSmsEnabled] = useState(data.smsEnabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(data.emailEnabled ?? true);
  const [senderId, setSenderId] = useState(data.senderId || "SCHPULSE");
  const [fromEmail, setFromEmail] = useState(data.fromEmail || "no-reply@school.com");
  const [welcomeTpl, setWelcomeTpl] = useState(data.welcomeTpl || "Welcome to {{schoolName}}! Your login is {{username}}.");
  const [feeReminderTpl, setFeeReminderTpl] = useState(data.feeReminderTpl || "Dear parent, {{studentName}} has an outstanding balance of K{{amount}}.");
  const [alertOnFee, setAlertOnFee] = useState(data.alertOnFee ?? true);
  const [alertOnExam, setAlertOnExam] = useState(data.alertOnExam ?? true);

  const persist = () => patchData("communication", {
    smsEnabled, emailEnabled, senderId, fromEmail, welcomeTpl, feeReminderTpl, alertOnFee, alertOnExam,
  });

  const steps = [
    {
      title: "Channels",
      description: "Configure delivery channels.",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>SMS</Label><p className="text-xs text-muted-foreground">Outbound text messages</p></div>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
          {smsEnabled && (
            <div>
              <Label>SMS Sender ID</Label>
              <Input value={senderId} onChange={(e) => setSenderId(e.target.value)} maxLength={11} />
              <p className="text-xs text-muted-foreground mt-1">Up to 11 characters, shown as the sender name.</p>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Email</Label><p className="text-xs text-muted-foreground">Transactional email</p></div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
          {emailEnabled && (
            <div>
              <Label>From Email</Label>
              <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Message Templates",
      description: "Edit defaults. {{variables}} are auto-filled.",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Welcome Message</Label>
            <Textarea value={welcomeTpl} onChange={(e) => setWelcomeTpl(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Fee Reminder</Label>
            <Textarea value={feeReminderTpl} onChange={(e) => setFeeReminderTpl(e.target.value)} rows={3} />
          </div>
        </div>
      ),
    },
    {
      title: "Alert Rules",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Send fee reminders</Label><p className="text-xs text-muted-foreground">3 days before due date</p></div>
            <Switch checked={alertOnFee} onCheckedChange={setAlertOnFee} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Notify on exam results published</Label><p className="text-xs text-muted-foreground">To parents and students</p></div>
            <Switch checked={alertOnExam} onCheckedChange={setAlertOnExam} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      title="Communication Setup"
      subtitle="Channels, templates, and alert rules."
      steps={steps}
      currentStep={ms.currentStep}
      onStepChange={(n) => { persist(); setStep("communication", n); }}
      completed={ms.status === "complete"}
      onComplete={() => {
        persist();
        markComplete("communication");
        toast.success("Communication module configured");
        navigate("/dashboard/setup");
      }}
    />
  );
};

export default CommunicationSetup;
