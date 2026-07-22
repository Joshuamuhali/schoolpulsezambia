import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Wizard } from "@/components/setup/Wizard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSetupStore } from "@/store/setupStore";

const AttendanceSetup = () => {
  const navigate = useNavigate();
  const ms = useSetupStore((s) => s.modules.attendance);
  const { setStep, patchData, markComplete } = useSetupStore.getState();
  const data = ms.data as Record<string, any>;

  const [mode, setMode] = useState(data.mode || "daily");
  const [graceMinutes, setGraceMinutes] = useState(data.graceMinutes || "10");
  const [autoAbsentDays, setAutoAbsentDays] = useState(data.autoAbsentDays || "3");
  const [smsParents, setSmsParents] = useState(data.smsParents ?? true);
  const [smsOnLate, setSmsOnLate] = useState(data.smsOnLate ?? false);

  const persist = () => patchData("attendance", { mode, graceMinutes, autoAbsentDays, smsParents, smsOnLate });

  const steps = [
    {
      title: "Attendance Mode",
      description: "How often will attendance be captured?",
      content: (
        <RadioGroup value={mode} onValueChange={setMode} className="space-y-2">
          {[
            { v: "daily", label: "Once daily", desc: "One mark per student per day" },
            { v: "morning_afternoon", label: "Morning & Afternoon", desc: "Two captures per day" },
            { v: "per_lesson", label: "Per Lesson", desc: "Captured every period" },
          ].map((o) => (
            <label key={o.v} className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value={o.v} className="mt-1" />
              <div>
                <p className="font-medium text-sm">{o.label}</p>
                <p className="text-xs text-muted-foreground">{o.desc}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      ),
    },
    {
      title: "Absence Rules",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Grace period for being "Late" (minutes)</Label>
            <Input type="number" value={graceMinutes} onChange={(e) => setGraceMinutes(e.target.value)} />
          </div>
          <div>
            <Label>Trigger alert after consecutive absent days</Label>
            <Input type="number" value={autoAbsentDays} onChange={(e) => setAutoAbsentDays(e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Parent Notifications",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>SMS parents on absence</Label>
              <p className="text-xs text-muted-foreground">Sent same day at noon</p>
            </div>
            <Switch checked={smsParents} onCheckedChange={setSmsParents} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Also notify on late arrival</Label>
              <p className="text-xs text-muted-foreground">Sent after grace period</p>
            </div>
            <Switch checked={smsOnLate} onCheckedChange={setSmsOnLate} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      title="Attendance Setup"
      subtitle="Define capture mode, thresholds, and alerts."
      steps={steps}
      currentStep={ms.currentStep}
      onStepChange={(n) => { persist(); setStep("attendance", n); }}
      completed={ms.status === "complete"}
      onComplete={() => {
        persist();
        markComplete("attendance");
        toast.success("Attendance module configured");
        navigate("/dashboard/setup");
      }}
    />
  );
};

export default AttendanceSetup;
