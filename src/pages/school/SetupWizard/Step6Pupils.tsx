import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Trash2, Upload } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

interface Pupil {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "male" | "female";
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  classId?: string;
}

export function Step6Pupils() {
  const { data, updateData, nextStep } = useSetupWizard();
  const [pupils, setPupils] = useState<Pupil[]>(data.pupils || []);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [classId, setClassId] = useState("");

  const addPupil = () => {
    if (!firstName.trim() || !lastName.trim()) return;

    const newPupil: Pupil = {
      id: Date.now().toString(),
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      guardianName: guardianName || undefined,
      guardianPhone: guardianPhone || undefined,
      guardianEmail: guardianEmail || undefined,
      classId: classId || undefined,
    };

    setPupils([...pupils, newPupil]);
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setGender("");
    setGuardianName("");
    setGuardianPhone("");
    setGuardianEmail("");
    setClassId("");
  };

  const removePupil = (pupilId: string) => {
    setPupils(pupils.filter((p) => p.id !== pupilId));
  };

  const handleNext = () => {
    updateData("pupils", pupils);
    nextStep();
  };

  const getClassName = (classId?: string) => {
    if (!classId) return "No class assigned";
    for (const grade of data.grades || []) {
      const cls = grade.classes.find((c: any) => c.id === classId);
      if (cls) return cls.name;
    }
    return "Unknown class";
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Pupils
          </CardTitle>
          <CardDescription>
            Enroll your students. You can skip this and add them later, or import from CSV (coming soon).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* Add Pupil Form */}
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
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={gender} onValueChange={(value: "male" | "female") => setGender(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classId">Assign to Class</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {(data.grades || []).flatMap((grade: any) =>
                        grade.classes.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {grade.name} - {cls.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Guardian Phone</Label>
                  <Input
                    id="guardianPhone"
                    placeholder="+260 97 123 4567"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianName">Guardian Name</Label>
                  <Input
                    id="guardianName"
                    placeholder="Parent/Guardian name"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Guardian Email</Label>
                  <Input
                    id="guardianEmail"
                    type="email"
                    placeholder="guardian@email.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={addPupil}
                className="w-full"
                disabled={!firstName.trim() || !lastName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pupil
              </Button>
            </CardContent>
          </Card>

          {/* Pupils List */}
          {pupils.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Added Pupils ({pupils.length})</Label>
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
              </div>
              {pupils.map((pupil) => (
                <Card key={pupil.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">
                            {pupil.firstName} {pupil.lastName}
                          </h4>
                          {pupil.gender && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                              {pupil.gender}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 space-y-1">
                          {pupil.classId && (
                            <p className="text-xs text-muted-foreground">
                              Class: {getClassName(pupil.classId)}
                            </p>
                          )}
                          {pupil.guardianName && (
                            <p className="text-xs text-muted-foreground">
                              Guardian: {pupil.guardianName}
                            </p>
                          )}
                          {pupil.guardianPhone && (
                            <p className="text-xs text-muted-foreground">
                              Phone: {pupil.guardianPhone}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePupil(pupil.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pupils.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No pupils added yet. Add your first pupil above or skip this step.
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
          Next: Review
        </Button>
      </div>
    </div>
  );
}