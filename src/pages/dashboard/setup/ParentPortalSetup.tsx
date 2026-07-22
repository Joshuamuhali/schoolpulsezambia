import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Wizard } from "@/components/setup/Wizard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSetupStore } from "@/store/setupStore";

const VISIBLE = ["Grades", "Attendance", "Fees & Invoices", "Timetable", "Behaviour Notes", "Announcements"];

const ParentPortalSetup = () => {
  const navigate = useNavigate();
  const ms = useSetupStore((s) => s.modules.parent);
  const { setStep, patchData, markComplete } = useSetupStore.getState();
  const data = ms.data as Record<string, any>;

  const [linking, setLinking] = useState(data.linking || "auto");
  const [visible, setVisible] = useState<string[]>(data.visible || ["Grades", "Attendance", "Fees & Invoices"]);
  const [pushNotifs, setPushNotifs] = useState(data.pushNotifs ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(data.weeklyDigest ?? true);

  const toggle = (v: string) => setVisible(visible.includes(v) ? visible.filter((x) => x !== v) : [...visible, v]);
  const persist = () => patchData("parent", { linking, visible, pushNotifs, weeklyDigest });

  const steps = [
    {
      title: "Account Linking",
      description: "How parent accounts are connected to students.",
      content: (
        <RadioGroup value={linking} onValueChange={setLinking} className="space-y-2">
          {[
            { v: "auto", label: "Auto-generate", desc: "Account created automatically from guardian phone on student record" },
            { v: "manual", label: "Manual verification", desc: "Parent self-registers and admin approves" },
            { v: "invite", label: "Invite link", desc: "Admin sends invite SMS/email" },
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
      title: "Visibility",
      description: "What parents can see in the portal.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {VISIBLE.map((v) => (
            <label key={v} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <Checkbox checked={visible.includes(v)} onCheckedChange={() => toggle(v)} />
              <span className="text-sm font-medium">{v}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      title: "Notifications",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Push notifications</Label><p className="text-xs text-muted-foreground">Realtime via mobile app</p></div>
            <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><Label>Weekly digest email</Label><p className="text-xs text-muted-foreground">Sent every Friday</p></div>
            <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      title="Parent Portal Setup"
      subtitle="Decide linking, visibility, and alerts."
      steps={steps}
      currentStep={ms.currentStep}
      onStepChange={(n) => { persist(); setStep("parent", n); }}
      completed={ms.status === "complete"}
      onComplete={() => {
        persist();
        markComplete("parent");
        toast.success("Parent Portal configured");
        navigate("/dashboard/setup");
      }}
    />
  );
};

export default ParentPortalSetup;
