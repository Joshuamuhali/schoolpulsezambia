import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  Loader2,
  Save,
  ArrowLeft,
  Upload,
  AlertCircle,
  Plus,
  Trash2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/store/appStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentService } from "@/lib/services/studentService";
import { getClasses } from "@/lib/services/academicService";
import { supabase } from "@/lib/supabase/client";

const studentSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["M", "F"]),
  date_of_birth: z.string().optional(),
  class_id: z.string().optional(),
  grade_id: z.string().optional(),
  admission_number: z.string().optional(),
  photo_url: z.string().optional(),
  
  // Medical information
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  blood_group: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  
  // Transfer information
  previous_school: z.string().optional(),
  transfer_certificate_number: z.string().optional(),
  enrollment_date: z.string().optional(),
  
  // Notes
  notes: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

interface GuardianFormData {
  full_name: string;
  phone: string;
  email?: string;
  relationship?: string;
  address?: string;
  occupation?: string;
  national_id?: string;
  is_emergency_contact?: boolean;
  can_pickup?: boolean;
  notes?: string;
}

export function EditStudent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const { id } = useParams<{ id: string }>();
  const [step, setStep] = useState(1);
  const [selectedGuardians, setSelectedGuardians] = useState<string[]>([]);
  const [newGuardian, setNewGuardian] = useState<GuardianFormData | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
  });

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: () => studentService.getStudent(id!),
    enabled: !!id,
  });

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ["classes", currentSchool?.id],
    queryFn: () => getClasses(currentSchool!.id),
    enabled: !!currentSchool?.id,
  });

  // Fetch existing guardians
  const { data: guardians } = useQuery({
    queryKey: ["guardians", currentSchool?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guardians")
        .select("*")
        .eq("school_id", currentSchool!.id)
        .order("full_name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!currentSchool?.id,
  });

  // Fetch student's guardians
  const { data: studentGuardians } = useQuery({
    queryKey: ["student-guardians", id],
    queryFn: () => studentService.getStudentGuardians(id!),
    enabled: !!id,
  });

  // Update student mutation
  const updateMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!id) throw new Error("Student ID missing");
      return studentService.updateStudent(id, data);
    },
    onSuccess: async (student) => {
      // Upload photo if provided
      if (photoFile && student.id) {
        try {
          await studentService.uploadStudentPhoto(student.id, photoFile);
        } catch (error) {
          console.error("Failed to upload photo:", error);
        }
      }

      toast.success("Student updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      navigate(`/dashboard/students/${id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update student");
    },
  });

  // Transfer student mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: { to_class_id: string; reason?: string }) => {
      if (!id || !student) throw new Error("Missing data");
      return studentService.createStudentTransfer({
        school_id: student.school_id,
        student_id: id,
        from_class_id: student.class_id || "",
        to_class_id: transferData.to_class_id,
        reason: transferData.reason,
        status: "pending",
        transfer_date: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id || "",
      });
    },
    onSuccess: () => {
      toast.success("Transfer request created successfully");
      setShowTransferDialog(false);
      queryClient.invalidateQueries({ queryKey: ["student", id] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create transfer request");
    },
  });

  // Load student data into form
  useEffect(() => {
    if (student) {
      setValue("full_name", student.full_name);
      setValue("gender", student.gender || "M");
      setValue("date_of_birth", student.date_of_birth || "");
      setValue("class_id", student.class_id || "");
      setValue("grade_id", student.grade_id || "");
      setValue("admission_number", student.admission_number || "");
      setValue("photo_url", student.photo_url || "");
      setValue("medical_conditions", student.medical_conditions || "");
      setValue("allergies", student.allergies || "");
      setValue("blood_group", student.blood_group || "");
      setValue("emergency_contact_name", student.emergency_contact_name || "");
      setValue("emergency_contact_phone", student.emergency_contact_phone || "");
      setValue("previous_school", student.previous_school || "");
      setValue("transfer_certificate_number", student.transfer_certificate_number || "");
      setValue("enrollment_date", student.enrollment_date || "");
      setValue("notes", student.notes || "");

      // Set selected guardians
      if (studentGuardians) {
        setSelectedGuardians(studentGuardians.map((sg: any) => sg.guardian.id));
      }
    }
  }, [student, studentGuardians, setValue]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof StudentFormData)[] = [];
    if (step === 1) fieldsToValidate = ["full_name", "gender", "date_of_birth"];
    if (step === 2) fieldsToValidate = ["class_id", "admission_number"];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleAddGuardian = async () => {
    if (!newGuardian || !currentSchool?.id) return;

    try {
      const guardian = await studentService.createGuardian({
        ...newGuardian,
        school_id: currentSchool.id,
      });

      // Link to student
      if (id) {
        await studentService.linkStudentToGuardian(id, guardian.id!, false);
      }

      setSelectedGuardians([...selectedGuardians, guardian.id!]);
      setNewGuardian(null);
      toast.success("Guardian added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add guardian");
    }
  };

  const handleRemoveGuardian = async (guardianId: string) => {
    if (!id) return;

    try {
      await studentService.unlinkStudentFromGuardian(id, guardianId);
      setSelectedGuardians(selectedGuardians.filter((gid) => gid !== guardianId));
      toast.success("Guardian removed");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove guardian");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const handleTransfer = (e: React.FormEvent) => {
    const form = e.target as HTMLFormElement;
    const toClassId = (form.elements.namedItem("to_class_id") as HTMLSelectElement).value;
    const reason = (form.elements.namedItem("reason") as HTMLTextAreaElement).value;

    if (!toClassId) {
      toast.error("Please select a class");
      return;
    }

    transferMutation.mutate({ to_class_id: toClassId, reason });
  };

  const onSubmit = (data: StudentFormData) => {
    updateMutation.mutate(data);
  };

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Student not found</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/dashboard/students/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Edit Student</h1>
            <p className="text-muted-foreground mt-2">
              Update student information and guardians
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowTransferDialog(true)}
            className="text-orange-600 hover:text-orange-700"
          >
            <UserX className="mr-2 h-4 w-4" />
            Transfer Student
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: "Basic Info" },
            { num: 2, label: "Academic Info" },
            { num: 3, label: "Medical & Emergency" },
            { num: 4, label: "Guardians" },
            { num: 5, label: "Review" },
          ].map((s) => (
            <div key={s.num} className="flex flex-col items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                  step >= s.num
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted text-muted-foreground"
                }`}
              >
                {step > s.num ? (
                  <span className="text-xl">✓</span>
                ) : (
                  <span>{s.num}</span>
                )}
              </div>
              <span className="mt-2 text-xs hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Basic Information"}
              {step === 2 && "Academic Information"}
              {step === 3 && "Medical & Emergency Contact"}
              {step === 4 && "Guardians & Parents"}
              {step === 5 && "Review & Confirm"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Update the student's personal details"}
              {step === 2 && "Modify class and admission details"}
              {step === 3 && "Update medical information and emergency contacts"}
              {step === 4 && "Manage parent and guardian links"}
              {step === 5 && "Verify all changes before saving"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {errors.root && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      {...register("full_name")}
                      placeholder="John Doe"
                    />
                    {errors.full_name && (
                      <p className="text-xs text-destructive">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={watch("gender")}
                      onValueChange={(value) => setValue("gender", value as "M" | "F")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      {...register("date_of_birth")}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="photo">Student Photo</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="cursor-pointer"
                      />
                      {student.photo_url && (
                        <img
                          src={student.photo_url}
                          alt="Current"
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                      {photoFile && (
                        <img
                          src={URL.createObjectURL(photoFile)}
                          alt="Preview"
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Academic Information */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admission_number">Admission Number</Label>
                    <Input
                      id="admission_number"
                      {...register("admission_number")}
                      placeholder="ADM-123456"
                    />
                    {errors.admission_number && (
                      <p className="text-xs text-destructive">
                        {errors.admission_number.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class_id">Assign to Class</Label>
                    <Select
                      value={watch("class_id")}
                      onValueChange={(value) => setValue("class_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes?.map((cls: any) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.grades?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="previous_school">Previous School (for transfers)</Label>
                    <Input
                      id="previous_school"
                      {...register("previous_school")}
                      placeholder="Previous school name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer_certificate_number">
                      Transfer Certificate Number
                    </Label>
                    <Input
                      id="transfer_certificate_number"
                      {...register("transfer_certificate_number")}
                      placeholder="TC-12345"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="enrollment_date">Enrollment Date</Label>
                    <Input
                      id="enrollment_date"
                      type="date"
                      {...register("enrollment_date")}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Medical & Emergency */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This information is kept confidential and used only for emergency situations.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select
                      value={watch("blood_group")}
                      onValueChange={(value) => setValue("blood_group", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medical_conditions">Medical Conditions</Label>
                    <Textarea
                      id="medical_conditions"
                      {...register("medical_conditions")}
                      placeholder="Asthma, diabetes, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      {...register("allergies")}
                      placeholder="Food allergies, medication allergies, etc."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      {...register("emergency_contact_name")}
                      placeholder="Contact person name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      {...register("emergency_contact_phone")}
                      placeholder="+260 97 123 4567"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      placeholder="Any other relevant information"
                      rows={3}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Guardians */}
            {step === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Current Guardians */}
                {studentGuardians && studentGuardians.length > 0 && (
                  <div className="space-y-2">
                    <Label>Current Guardians</Label>
                    <div className="grid gap-2">
                      {studentGuardians.map((sg: any) => (
                        <div
                          key={sg.guardian.id}
                          className="flex items-center justify-between border rounded-lg p-3"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{sg.guardian.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {sg.guardian.phone} • {sg.guardian.relationship}
                              {sg.is_primary && (
                                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  Primary
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveGuardian(sg.guardian.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Guardian */}
                <div className="space-y-4 border-t pt-4">
                  <Label>Add New Guardian</Label>
                  {!newGuardian ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewGuardian({
                        full_name: "",
                        phone: "",
                        email: "",
                        relationship: "parent",
                      })}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Guardian
                    </Button>
                  ) : (
                    <Card>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="guardian_name">Full Name *</Label>
                            <Input
                              id="guardian_name"
                              value={newGuardian.full_name}
                              onChange={(e) =>
                                setNewGuardian({ ...newGuardian, full_name: e.target.value })
                              }
                              placeholder="Parent/Guardian name"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="guardian_phone">Phone *</Label>
                            <Input
                              id="guardian_phone"
                              value={newGuardian.phone}
                              onChange={(e) =>
                                setNewGuardian({ ...newGuardian, phone: e.target.value })
                              }
                              placeholder="+260 97 123 4567"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="guardian_email">Email</Label>
                            <Input
                              id="guardian_email"
                              type="email"
                              value={newGuardian.email}
                              onChange={(e) =>
                                setNewGuardian({ ...newGuardian, email: e.target.value })
                              }
                              placeholder="parent@example.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="guardian_relationship">Relationship</Label>
                            <Select
                              value={newGuardian.relationship}
                              onValueChange={(value) =>
                                setNewGuardian({ ...newGuardian, relationship: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="parent">Parent</SelectItem>
                                <SelectItem value="guardian">Guardian</SelectItem>
                                <SelectItem value="grandparent">Grandparent</SelectItem>
                                <SelectItem value="sibling">Sibling (18+)</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="guardian_address">Address</Label>
                            <Input
                              id="guardian_address"
                              value={newGuardian.address}
                              onChange={(e) =>
                                setNewGuardian({ ...newGuardian, address: e.target.value })
                              }
                              placeholder="Physical address"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="emergency_contact"
                              checked={newGuardian.is_emergency_contact}
                              onCheckedChange={(checked) =>
                                setNewGuardian({ ...newGuardian, is_emergency_contact: checked as boolean })
                              }
                            />
                            <Label htmlFor="emergency_contact" className="text-sm">
                              Emergency contact
                            </Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="can_pickup"
                              checked={newGuardian.can_pickup}
                              onCheckedChange={(checked) =>
                                setNewGuardian({ ...newGuardian, can_pickup: checked as boolean })
                              }
                            />
                            <Label htmlFor="can_pickup" className="text-sm">
                              Authorized to pick up student
                            </Label>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={handleAddGuardian}
                            disabled={!newGuardian.full_name || !newGuardian.phone}
                          >
                            Add Guardian
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setNewGuardian(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{getValues("full_name")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Gender:</span>
                        <p className="font-medium">{getValues("gender") === "M" ? "Male" : "Female"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date of Birth:</span>
                        <p className="font-medium">{getValues("date_of_birth") || "Not provided"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Admission Number:</span>
                        <p className="font-medium">{getValues("admission_number") || "Not set"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Class:</span>
                        <p className="font-medium">
                          {classes?.find((c: any) => c.id === getValues("class_id"))?.name || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Previous School:</span>
                        <p className="font-medium">{getValues("previous_school") || "N/A"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Medical Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Blood Group:</span>
                        <p className="font-medium">{getValues("blood_group") || "Not provided"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Medical Conditions:</span>
                        <p className="font-medium">{getValues("medical_conditions") || "None"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Allergies:</span>
                        <p className="font-medium">{getValues("allergies") || "None"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Emergency Contact:</span>
                        <p className="font-medium">
                          {getValues("emergency_contact_name") || "Not provided"}
                          {getValues("emergency_contact_phone") && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({getValues("emergency_contact_phone")})
                            </span>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Guardians ({selectedGuardians.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedGuardians.length > 0 ? (
                        <div className="space-y-2">
                          {selectedGuardians.map((gid) => {
                            const guardian = guardians?.find((g: any) => g.id === gid);
                            if (!guardian) return null;
                            return (
                              <div key={gid} className="text-sm">
                                <p className="font-medium">{guardian.full_name}</p>
                                <p className="text-muted-foreground">
                                  {guardian.phone} • {guardian.relationship}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No guardians linked</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < 5 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {isSubmitting || updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Transfer Student</CardTitle>
              <CardDescription>
                Move {student.full_name} to a different class
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleTransfer}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to_class_id">New Class *</Label>
                  <Select name="to_class_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes?.map((cls: any) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} - {cls.grades?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Transfer</Label>
                  <Textarea
                    id="reason"
                    name="reason"
                    placeholder="Optional: Reason for transfer"
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowTransferDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Request Transfer"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

// Import useParams
import { useParams } from "react-router-dom";