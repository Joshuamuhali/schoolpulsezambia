import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Plus, Trash2 } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  staffTypeId: string;
  salary?: number;
}

export function Step5Staff() {
  const { data, updateData, nextStep } = useSetupWizard();
  const [staff, setStaff] = useState<StaffMember[]>(data.staff || []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffTypeId, setStaffTypeId] = useState("");
  const [salary, setSalary] = useState("");

  const addStaffMember = () => {
    if (!firstName.trim() || !lastName.trim() || !staffTypeId) return;

    const newStaff: StaffMember = {
      id: Date.now().toString(),
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      staffTypeId,
      salary: salary ? parseFloat(salary) : undefined,
    };

    setStaff([...staff, newStaff]);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setStaffTypeId("");
    setSalary("");
  };

  const removeStaff = (staffId: string) => {
    setStaff(staff.filter((s) => s.id !== staffId));
  };

  const handleNext = () => {
    updateData("staff", staff);
    nextStep();
  };

  const getStaffTypeName = (typeId: string) => {
    const type = data.staffTypes?.find((t: any) => t.id === typeId);
    return type?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Staff Members
          </CardTitle>
          <CardDescription>
            Add your teaching and non-teaching staff. You can skip this and add them later.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* Add Staff Form */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    placeholder="+260 97 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staffType">Staff Type *</Label>
                  <Select value={staffTypeId} onValueChange={setStaffTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff type" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.staffTypes?.map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (ZK) (Optional)</Label>
                  <Input
                    id="salary"
                    type="number"
                    placeholder="0.00"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={addStaffMember}
                className="w-full"
                disabled={!firstName.trim() || !lastName.trim() || !staffTypeId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Staff Member
              </Button>
            </CardContent>
          </Card>

          {/* Staff List */}
          {staff.length > 0 && (
            <div className="space-y-3">
              <Label>Added Staff Members ({staff.length})</Label>
              {staff.map((member) => (
                <Card key={member.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {member.firstName} {member.lastName}
                          </h4>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {getStaffTypeName(member.staffTypeId)}
                          </span>
                        </div>
                        <div className="mt-1 space-y-1">
                          {member.email && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                          {member.phone && (
                            <p className="text-xs text-muted-foreground">{member.phone}</p>
                          )}
                          {member.salary && (
                            <p className="text-sm font-medium text-primary">
                              ZK {member.salary.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStaff(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {staff.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No staff members added yet. Add your first staff member above or skip this step.
              </p>
            </div>
          )}
        </CardContent>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Next: Pupils
        </Button>
      </div>
    </div>
  );
}