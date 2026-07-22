import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Wizard } from "@/components/setup/Wizard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSetupStore } from "@/store/setupStore";

type Fee = { id: number; grade: string; tuition: string; boarding: string };

const FinanceSetup = () => {
  const navigate = useNavigate();
  const moduleState = useSetupStore((s) => s.modules.finance);
  const setStep = useSetupStore((s) => s.setStep);
  const patchData = useSetupStore((s) => s.patchData);
  const markComplete = useSetupStore((s) => s.markComplete);

  const data = moduleState.data as Record<string, any>;
  const [fees, setFees] = useState<Fee[]>(data.fees || [
    { id: 1, grade: "Grade 7", tuition: "2500", boarding: "1500" },
  ]);
  const [billing, setBilling] = useState(data.billing || "termly");
  const [lateFee, setLateFee] = useState(data.lateFee ?? true);
  const [lateAmount, setLateAmount] = useState(data.lateAmount || "100");
  const [bursar, setBursar] = useState(data.bursar || "");
  const [openingBalance, setOpeningBalance] = useState(data.openingBalance ?? false);

  const persist = () => patchData("finance", { fees, billing, lateFee, lateAmount, bursar, openingBalance });

  const addFee = () => setFees([...fees, { id: Date.now(), grade: "", tuition: "", boarding: "" }]);
  const updateFee = (id: number, key: keyof Fee, value: string) =>
    setFees(fees.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  const removeFee = (id: number) => setFees(fees.filter((f) => f.id !== id));

  const steps = [
    {
      title: "Fee Structure",
      description: "Define tuition and boarding fees per grade.",
      content: (
        <div className="space-y-3">
          {fees.map((fee) => (
            <div key={fee.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">Grade</Label>
                <Input value={fee.grade} onChange={(e) => updateFee(fee.id, "grade", e.target.value)} placeholder="Grade 7" />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Tuition (K)</Label>
                <Input value={fee.tuition} onChange={(e) => updateFee(fee.id, "tuition", e.target.value)} />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Boarding (K)</Label>
                <Input value={fee.boarding} onChange={(e) => updateFee(fee.id, "boarding", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Button variant="ghost" size="icon" onClick={() => removeFee(fee.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addFee}>
            <Plus className="h-4 w-4" /> Add Grade
          </Button>
        </div>
      ),
    },
    {
      title: "Payment Rules",
      description: "Configure billing cycle and late fees.",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Billing Cycle</Label>
            <Select value={billing} onValueChange={setBilling}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="termly">Termly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Charge late fees</Label>
              <p className="text-xs text-muted-foreground">Apply penalty after due date</p>
            </div>
            <Switch checked={lateFee} onCheckedChange={setLateFee} />
          </div>
          {lateFee && (
            <div>
              <Label>Late Fee Amount (K)</Label>
              <Input value={lateAmount} onChange={(e) => setLateAmount(e.target.value)} />
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Finance Roles",
      description: "Assign the bursar responsible for collections.",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Bursar Email</Label>
            <Input type="email" value={bursar} onChange={(e) => setBursar(e.target.value)} placeholder="bursar@school.com" />
            <p className="text-xs text-muted-foreground mt-1">An invitation will be sent on go-live.</p>
          </div>
        </div>
      ),
    },
    {
      title: "Opening Balances",
      description: "Optionally import existing arrears.",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Import existing arrears</Label>
              <p className="text-xs text-muted-foreground">Upload a CSV later from Finance &gt; Imports</p>
            </div>
            <Switch checked={openingBalance} onCheckedChange={setOpeningBalance} />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Wizard
      title="Finance Setup"
      subtitle="Step through fee structure, rules, and roles."
      steps={steps}
      currentStep={moduleState.currentStep}
      onStepChange={(n) => { persist(); setStep("finance", n); }}
      completed={moduleState.status === "complete"}
      onComplete={() => {
        persist();
        markComplete("finance");
        toast.success("Finance module configured");
        navigate("/dashboard/setup");
      }}
    />
  );
};

export default FinanceSetup;
