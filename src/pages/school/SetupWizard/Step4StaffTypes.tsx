import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2 } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

interface StaffType {
  id: string;
  name: string;
  baseSalary: number;
  payFrequency: "monthly" | "weekly" | "hourly";
}

export function Step4StaffTypes() {
  const { data, updateData, nextStep } = useSetupWizard();
  const [staffTypes, setStaffTypes] = useState<StaffType[]>(data.staffTypes || []);
  const [newTypeName, setNewTypeName] = useState("");
  const [newBaseSalary, setNewBaseSalary] = useState("");
  const [newPayFrequency, setNewPayFrequency] = useState<"monthly" | "weekly" | "hourly">("monthly");

  const addStaffType = () => {
    if (!newTypeName.trim() || !newBaseSalary) return;

    const newType: StaffType = {
      id: Date.now().toString(),
      name: newTypeName,
      baseSalary: parseFloat(newBaseSalary),
      payFrequency: newPayFrequency,
    };

    setStaffTypes([...staffTypes, newType]);
    setNewTypeName("");
    setNewBaseSalary("");
    setNewPayFrequency("monthly");
  };

  const removeStaffType = (typeId: string) => {
    setStaffTypes(staffTypes.filter((t) => t.id !== typeId));
  };

  const handleNext = () => {
    updateData("staffTypes", staffTypes);
    nextStep();
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "monthly":
        return "Monthly";
      case "weekly":
        return "Weekly";
      case "hourly":
        return "Hourly";
      default:
        return frequency;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Staff Types
          </CardTitle>
          <CardDescription>
            Configure job categories and their salary ranges. You can add individual staff in the next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* Add Staff Type Form */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="typeName">Job Title</Label>
                  <Input
                    id="typeName"
                    placeholder="e.g., Teacher, Admin, Accountant"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Base Salary (ZK)</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    placeholder="0.00"
                    value={newBaseSalary}
                    onChange={(e) => setNewBaseSalary(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payFrequency">Pay Frequency</Label>
                  <Select
                    value={newPayFrequency}
                    onValueChange={(value: "monthly" | "weekly" | "hourly") =>
                      setNewPayFrequency(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                onClick={addStaffType}
                className="w-full"
                disabled={!newTypeName.trim() || !newBaseSalary}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Type
              </Button>
            </CardContent>
          </Card>

          {/* Staff Types List */}
          {staffTypes.length > 0 && (
            <div className="space-y-3">
              <Label>Added Staff Types ({staffTypes.length})</Label>
              {staffTypes.map((type) => (
                <Card key={type.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{type.name}</h4>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {getFrequencyLabel(type.payFrequency)}
                          </span>
                        </div>
                        <p className="text-lg font-bold text-primary mt-1">
                          ZK {type.baseSalary.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStaffType(type.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {staffTypes.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No staff types added yet. Add your first staff type above.
              </p>
            </div>
          )}
        </CardContent>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button type="button" onClick={handleNext} disabled={staffTypes.length === 0}>
          Next: Staff Members
        </Button>
      </div>
    </div>
  );
}