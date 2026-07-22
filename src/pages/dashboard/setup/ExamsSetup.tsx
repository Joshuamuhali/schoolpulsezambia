import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Wizard } from "@/components/setup/Wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSetupStore } from "@/store/setupStore";

const ExamsSetup = () => {
  const navigate = useNavigate();
  const ms = useSetupStore((s) => s.modules.exams);
  const { setStep, patchData, markComplete } = useSetupStore.getState();
  const data = ms.data as Record<string, any>;

  const [scheme, setScheme] = useState(data.scheme || "letter");
  const [passMark, setPassMark] = useState(data.passMark || "50");
  const [types, setTypes] = useState<string[]>(data.types || ["Mid-Term", "End-Term", "Mock"]);
  const [template, setTemplate] = useState(data.template || "standard");
  const [notes, setNotes] = useState(data.notes || "Includes teacher comments and head-teacher signature.");

  const toggleType = (t: string) =>
    setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);

  const persist = () => patchData("exams", { scheme, passMark, types, template, notes });

  const steps = [
    {
      title: "Grading System",
      description: "Choose how scores translate to grades.",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Scheme</Label>
            <Select value={scheme} onValueChange={setScheme}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter (A–F)</SelectItem>
                <SelectItem value="zambian">Zambian (1–9)</SelectItem>
                <SelectItem value="percent">Percentage only</SelectItem>
                <SelectItem value="gpa">GPA (4.0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Pass Mark (%)</Label>
            <Input type="number" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title: "Exam Types",
      description: "Pick the assessments this school runs.",
      content: (
        <div className="grid grid-cols-2 gap-3">
          {["Quiz", "Test", "Assignment", "Mid-Term", "End-Term", "Mock", "Final"].map((t) => (
            <label key={t} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <Checkbox checked={types.includes(t)} onCheckedChange={() => toggleType(t)} />
              <span className="text-sm font-medium">{t}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      title: "Pass Mark Rules",
      description: "Rules for promotion and remarks.",
      content: (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-1">
            <p>• Below {passMark}% → fail (must repeat assessment)</p>
            <p>• {passMark}–69% → pass</p>
            <p>• 70%+ → distinction</p>
          </div>
          <p className="text-xs text-muted-foreground">Advanced subject-level overrides can be configured later under Exams &gt; Rules.</p>
        </div>
      ),
    },
    {
      title: "Report Card Template",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Detailed (per-subject teacher comments)</SelectItem>
                <SelectItem value="minimal">Minimal (scores only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Footer Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      title="Exams Setup"
      subtitle="Configure grading, exam types, and report cards."
      steps={steps}
      currentStep={ms.currentStep}
      onStepChange={(n) => { persist(); setStep("exams", n); }}
      completed={ms.status === "complete"}
      onComplete={() => {
        persist();
        markComplete("exams");
        toast.success("Exams module configured");
        navigate("/dashboard/setup");
      }}
    />
  );
};

export default ExamsSetup;
