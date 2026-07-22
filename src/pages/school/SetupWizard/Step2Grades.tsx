import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import { useSetupWizard } from "@/hooks/useSetupWizard";

interface Grade {
  id: string;
  name: string;
  level: number;
  classes: Array<{
    id: string;
    name: string;
    maxPupils: number;
  }>;
}

export function Step2Grades() {
  const { data, updateData, nextStep } = useSetupWizard();
  const [grades, setGrades] = useState<Grade[]>(data.grades || []);
  const [newGradeName, setNewGradeName] = useState("");
  const [newGradeLevel, setNewGradeLevel] = useState("");

  const addGrade = () => {
    if (!newGradeName.trim()) return;

    const newGrade: Grade = {
      id: Date.now().toString(),
      name: newGradeName,
      level: parseInt(newGradeLevel) || grades.length + 1,
      classes: [],
    };

    setGrades([...grades, newGrade]);
    setNewGradeName("");
    setNewGradeLevel("");
  };

  const removeGrade = (gradeId: string) => {
    setGrades(grades.filter((g) => g.id !== gradeId));
  };

  const addClass = (gradeId: string) => {
    const className = prompt("Enter class name (e.g., Class A, Class B):");
    if (!className) return;

    const maxPupils = parseInt(prompt("Enter maximum pupils (default 30):") || "30");

    setGrades(
      grades.map((grade) =>
        grade.id === gradeId
          ? {
              ...grade,
              classes: [
                ...grade.classes,
                {
                  id: Date.now().toString(),
                  name: className,
                  maxPupils,
                },
              ],
            }
          : grade
      )
    );
  };

  const removeClass = (gradeId: string, classId: string) => {
    setGrades(
      grades.map((grade) =>
        grade.id === gradeId
          ? {
              ...grade,
              classes: grade.classes.filter((c) => c.id !== classId),
            }
          : grade
      )
    );
  };

  const handleNext = () => {
    updateData("grades", grades);
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Grades & Classes
          </CardTitle>
          <CardDescription>
            Set up your academic structure. Add grades (e.g., Grade 1, Grade 2) and classes (e.g., Class A, Class B).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 space-y-4">
          {/* Add Grade Form */}
          <div className="flex gap-2">
            <Input
              placeholder="Grade name (e.g., Grade 1)"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Level"
              type="number"
              value={newGradeLevel}
              onChange={(e) => setNewGradeLevel(e.target.value)}
              className="w-24"
            />
            <Button type="button" onClick={addGrade} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Grades List */}
          <div className="space-y-3">
            {grades.map((grade) => (
              <Card key={grade.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{grade.name}</h4>
                        <span className="text-xs text-muted-foreground">Level {grade.level}</span>
                      </div>

                      {/* Classes */}
                      {grade.classes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {grade.classes.map((cls) => (
                            <div
                              key={cls.id}
                              className="flex items-center justify-between rounded-md bg-muted/50 p-2"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{cls.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Max {cls.maxPupils} pupils
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeClass(grade.id, cls.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addClass(grade.id)}
                        className="mt-3"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Class
                      </Button>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeGrade(grade.id)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {grades.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No grades added yet. Add your first grade above.
              </p>
            </div>
          )}
        </CardContent>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => {}}>
          Back
        </Button>
        <Button type="button" onClick={handleNext} disabled={grades.length === 0}>
          Next: Fee Structure
        </Button>
      </div>
    </div>
  );
}