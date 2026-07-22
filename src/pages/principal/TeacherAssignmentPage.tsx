/**
 * Teacher Assignment Form
 * Assign teacher to grade/class with growth model selection
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  X,
  BookOpen,
  Users,
  TrendingUp,
  Pin,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getStaffProfile,
  getSchoolTeacherSettings,
  createTeacherAssignment,
} from "@/lib/services/staffService";
import { useAppStore } from "@/store/appStore";

const TeacherAssignmentPage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const { currentSchool } = useAppStore();
  const qc = useQueryClient();

  const [gradeId, setGradeId] = useState<string>("");
  const [gradesList, setGradesList] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([] as string[]);
  const [assignmentType, setAssignmentType] = useState<"class_teacher" | "subject_teacher" | "assistant_teacher">("subject_teacher");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [growthModel, setGrowthModel] = useState<"fixed" | "floating" | "hybrid">("floating");
  const [notes, setNotes] = useState("");
  const [isAllClasses, setIsAllClasses] = useState(false);

  const { data: teacher } = useQuery({
    queryKey: ["teacher", teacherId],
    queryFn: () => getStaffProfile(teacherId || ""),
    enabled: !!teacherId,
  });

  const { data: grades } = useQuery({
    queryKey: ["grades", currentSchool?.id],
    queryFn: async () => {
      const { data } = await (await import("@/lib/supabase/client")).supabase
        .from("grades")
        .select("*")
        .eq("school_id", currentSchool?.id)
        .order("name");
      setGradesList(data || []);
      return data || [];
    },
    enabled: !!currentSchool?.id,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id, gradeId],
    queryFn: async () => {
      const { data } = await (await import("@/lib/supabase/client")).supabase
        .from("classes")
        .select("*")
        .eq("school_id", currentSchool?.id)
        .eq("grade_id", gradeId)
        .order("name");
      return data || [];
    },
    enabled: !!currentSchool?.id && !!gradeId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", currentSchool?.id],
    queryFn: async () => {
      const { data } = await (await import("@/lib/supabase/client")).supabase
        .from("subjects")
        .select("*")
        .eq("school_id", currentSchool?.id)
        .order("name");
      return data || [];
    },
    enabled: !!currentSchool?.id,
  });

  const { data: academicYears } = useQuery({
    queryKey: ["academic-years", currentSchool?.id],
    queryFn: async () => {
      const { data } = await (await import("@/lib/supabase/client")).supabase
        .from("academic_years")
        .select("*")
        .eq("school_id", currentSchool?.id)
        .order("name", { ascending: false });
      return data || [];
    },
    enabled: !!currentSchool?.id,
  });

  const { data: schoolSettings } = useQuery({
    queryKey: ["school-teacher-settings", currentSchool?.id],
    queryFn: () => currentSchool?.id ? getSchoolTeacherSettings(currentSchool.id) : null,
    enabled: !!currentSchool?.id,
  });

  const assignmentMutation = useMutation({
    mutationFn: () =>
      createTeacherAssignment(
        currentSchool?.id || "",
        teacherId || "",
        gradeId || undefined,
        selectedClasses[0] || undefined,
        selectedSubjects[0] || undefined,
        academicYears?.[0]?.id,
        assignmentType,
        growthModel
      ),
    onSuccess: () => {
      toast.success("Teacher assigned successfully");
      navigate("/principal/teachers");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClassToggle = (classId: string) => {
    if (isAllClasses) {
      const classIds = (classes as any[] || []).map((c: any) => c.id);
      setSelectedClasses(classIds);
    } else {
      setSelectedClasses((prev) =>
        prev.includes(classId)
          ? prev.filter((id) => id !== classId)
          : [...prev, classId]
      );
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const calculateImpact = () => {
    if (!classes || !selectedClasses.length) return { students: 0, slots: 0, workload: 0 };
    
    const studentsPerClass = 42; // Average
    const students = selectedClasses.length * studentsPerClass;
    const slots = selectedClasses.length * selectedSubjects.length * 6; // 6 periods per week
    const workload = students * selectedSubjects.length;

    return { students, slots, workload };
  };

  const impact = calculateImpact();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/principal/teachers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Assign Teacher</h1>
          <p className="text-muted-foreground">
            {teacher?.first_name} {teacher?.last_name} — {teacher?.position || teacher?.qualifications || "Teacher"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignment Form */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Assign Grade */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                Assign Grade
              </Label>
              <Select value={gradeId} onValueChange={setGradeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades?.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Assign Class */}
            {gradeId && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    2
                  </span>
                  Assign Class
                </Label>
                <RadioGroup value={isAllClasses ? "all" : "specific"} onValueChange={(v) => setIsAllClasses(v === "all")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all">Assign to all classes in Grade {gradesList.find((g: any) => g.id === gradeId)?.name}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific">Assign to specific class(es)</Label>
                  </div>
                </RadioGroup>
                {!isAllClasses && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {classes?.map((cls: any) => (
                      <div key={cls.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cls.id}
                          checked={selectedClasses.includes(cls.id)}
                          onCheckedChange={() => handleClassToggle(cls.id)}
                        />
                        <Label htmlFor={cls.id}>{cls.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Assignment Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  3
                </span>
                Assignment Type
              </Label>
              <RadioGroup value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="class_teacher" id="class_teacher" />
                  <Label htmlFor="class_teacher">Class Teacher (Full responsibility)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subject_teacher" id="subject_teacher" />
                  <Label htmlFor="subject_teacher">Subject Teacher (Only teaches subject)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="assistant_teacher" id="assistant_teacher" />
                  <Label htmlFor="assistant_teacher">Assistant Teacher (Supporting role)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Step 4: Subjects */}
            {assignmentType !== "class_teacher" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    4
                  </span>
                  Subjects to Teach
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {subjects?.map((subject: any) => (
                    <div key={subject.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={subject.id}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={() => handleSubjectToggle(subject.id)}
                      />
                      <Label htmlFor={subject.id}>{subject.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Teacher Growth Model */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {assignmentType === "class_teacher" ? "4" : "5"}
                </span>
                Teacher Growth Model
              </Label>
              <RadioGroup value={growthModel} onValueChange={(v: any) => setGrowthModel(v)}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="floating" id="floating" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="floating" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Teacher grows with students to next grade
                      </Label>
                      <p className="text-xs text-muted-foreground ml-6">
                        Recommended for primary schools
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="fixed" id="fixed" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="fixed" className="flex items-center gap-2">
                        <Pin className="h-4 w-4" />
                        Teacher stays with this grade permanently
                      </Label>
                      <p className="text-xs text-muted-foreground ml-6">
                        Recommended for subject specialists
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem value="hybrid" id="hybrid" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="hybrid" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Manual assignment each year
                      </Label>
                      <p className="text-xs text-muted-foreground ml-6">
                        Admin decides annually
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this assignment..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Impact Preview */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Impact Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span>Students affected</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {impact.students}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span>Timetable slots</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {impact.slots}/week
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>Workload</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {impact.workload} assessments
                </Badge>
              </div>
            </div>

            {/* School Default */}
            {schoolSettings && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>School Default:</strong> {schoolSettings.default_growth_model === "floating" ? "Teacher grows with students" : schoolSettings.default_growth_model === "fixed" ? "Teacher stays with grade" : "Manual assignment"}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => assignmentMutation.mutate()}
                disabled={!gradeId || selectedClasses.length === 0 || assignmentMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Assignment
              </Button>
              <Button variant="outline" onClick={() => navigate("/principal/teachers")}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherAssignmentPage;
