import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

interface FeeType {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "termly" | "annual";
  dueDay?: number;
  isMandatory: boolean;
}

export function Step3Fees() {
  const { data, updateData, nextStep } = useSetupWizard();
  const [feeTypes, setFeeTypes] = useState<FeeType[]>(data.feeTypes || []);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeFrequency, setNewFeeFrequency] = useState<"monthly" | "termly" | "annual">("monthly");
  const [newFeeDueDay, setNewFeeDueDay] = useState("1");
  const [isMandatory, setIsMandatory] = useState(true);

  const addFeeType = () => {
    if (!newFeeName.trim() || !newFeeAmount) return;

    const newFee: FeeType = {
      id: Date.now().toString(),
      name: newFeeName,
      amount: parseFloat(newFeeAmount),
      frequency: newFeeFrequency,
      dueDay: newFeeFrequency === "monthly" ? parseInt(newFeeDueDay) : undefined,
      isMandatory,
    };

    setFeeTypes([...feeTypes, newFee]);
    setNewFeeName("");
    setNewFeeAmount("");
    setNewFeeDueDay("1");
    setIsMandatory(true);
  };

  const removeFeeType = (feeId: string) => {
    setFeeTypes(feeTypes.filter((f) => f.id !== feeId));
  };

  const handleNext = () => {
    updateData("feeTypes", feeTypes);
    nextStep();
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "monthly":
        return "Monthly";
      case "termly":
        return "Per Term";
      case "annual":
        return "Per Year";
      default:
        return frequency;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Fee Structure
          </CardTitle>
          <CardDescription>
            Define your fee types and amounts. You can add more later.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* Add Fee Type Form */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="feeName">Fee Name</Label>
                  <Input
                    id="feeName"
                    placeholder="e.g., Tuition, Sports, Development"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feeAmount">Amount (ZK)</Label>
                  <Input
                    id="feeAmount"
                    type="number"
                    placeholder="0.00"
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={newFeeFrequency}
                    onValueChange={(value: "monthly" | "termly" | "annual") =>
                      setNewFeeFrequency(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="termly">Per Term</SelectItem>
                      <SelectItem value="annual">Per Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newFeeFrequency === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="dueDay">Due Day (Day of Month)</Label>
                    <Input
                      id="dueDay"
                      type="number"
                      min="1"
                      max="31"
                      value={newFeeDueDay}
                      onChange={(e) => setNewFeeDueDay(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isMandatory"
                  checked={isMandatory}
                  onCheckedChange={(checked) => setIsMandatory(checked as boolean)}
                />
                <Label htmlFor="isMandatory" className="text-sm font-normal">
                  This is a mandatory fee
                </Label>
              </div>

              <Button
                type="button"
                onClick={addFeeType}
                className="w-full"
                disabled={!newFeeName.trim() || !newFeeAmount}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Type
              </Button>
            </CardContent>
          </Card>

          {/* Fee Types List */}
          {feeTypes.length > 0 && (
            <div className="space-y-3">
              <Label>Added Fee Types ({feeTypes.length})</Label>
              {feeTypes.map((fee) => (
                <Card key={fee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{fee.name}</h4>
                          {fee.isMandatory && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          <p className="text-lg font-bold text-primary">
                            ZK {fee.amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getFrequencyLabel(fee.frequency)}
                            {fee.dueDay && ` • Due on day ${fee.dueDay}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeeType(fee.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {feeTypes.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No fee types added yet. Add your first fee type above.
              </p>
            </div>
          )}
        </CardContent>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button type="button" onClick={handleNext} disabled={feeTypes.length === 0}>
          Next: Staff Types
        </Button>
      </div>
    </div>
  );
}