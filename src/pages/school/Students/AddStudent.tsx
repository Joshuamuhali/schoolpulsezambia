import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import {
  Loader2,
  UserPlus,
  ArrowLeft,
  Upload,
  AlertCircle,
  Plus,
  Trash2,
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
import type { Student } from "@/lib/supabase/types";

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

export function AddStudent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [step, setStep] = useState(1);
  const [selectedGuardians, setSelectedGuardians] = useState<string[]>([]);
  const [newGuardian, setNewGuardian] = useState<GuardianFormData | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
    defaultValues: {
      gender: "M",
      enrollment_date: new Date().toISOString().split("T")[0],
    },
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

  // Create student mutation
  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!currentSchool?.id) throw new Error("No school selected");
      return studentService.createStudent(
        {
          ...data,
          school_id: currentSchool.id,
          status: "active" as const,
        } as Omit<Student, "id" | "created_at" | "updated_at">,
        selectedGuardians
      );
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

      toast.success("Student added successfully!");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      navigate("/dashboard/students");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add student");
    },
  });

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

      setSelectedGuardians([...selectedGuardians, guardian.id!]);
      setNewGuardian(null);
      toast.success("Guardian added successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add guardian");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const onSubmit = (data: StudentFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/students")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Students
        </Button>
        <h1 className="font-display text-3xl font-bold">Add New Student</h1>
        <p className="text-muted-foreground mt-2">
          Enter student information and link guardians
        </p>
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
              {step === 1 && "Enter the student's personal details"}
              {step === 2 && "Assign class and admission details"}
              {step === 3 && "Medical information and emergency contacts"}
              {step === 4 && "Link parents and guardians"}
              {step === 5 && "Verify all information before submitting"}
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
                      placeholder="ADM-123456 (auto-generated if empty)"
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
                {/* Existing Guardians */}
                {guardians && guardians.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select Existing Guardians</Label>
                    <div className="grid gap-2">
                      {guardians.map((guardian: any) => (
                        <div
                          key={guardian.id}
                          className="flex items-center space-x-2 border rounded-lg p-3"
                        >
                          <Checkbox
                            checked={selectedGuardians.includes(guardian.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGuardians([...selectedGuardians, guardian.id]);
                              } else {
                                setSelectedGuardians(
                                  selectedGuardians.filter((id) => id !== guardian.id)
                                );
                              }
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{guardian.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {guardian.phone} {guardian.relationship && `• ${guardian.relationship}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Guardian */}
                <div className="space-y-4 border-t pt-4">
                  <Label>Or Add New Guardian</Label>
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

                {/* Selected Guardians Summary */}
                {selectedGuardians.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Guardians ({selectedGuardians.length})</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedGuardians.map((id) => {
                        const guardian = guardians?.find((g: any) => g.id === id);
                        return guardian ? (
                          <div
                            key={id}
                            className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg"
                          >
                            <span className="text-sm">{guardian.full_name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedGuardians(
                                  selectedGuardians.filter((gid) => gid !== id)
                                )
                              }
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
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
                        <p className="font-medium">{getValues("admission_number") || "Auto-generated"}</p>
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
                          {selectedGuardians.map((id) => {
                            const guardian = guardians?.find((g: any) => g.id === id);
                            return guardian ? (
                              <div key={id} className="text-sm">
                                <p className="font-medium">{guardian.full_name}</p>
                                <p className="text-muted-foreground">
                                  {guardian.phone} • {guardian.relationship}
                                </p>
                              </div>
                            ) : null;
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
              <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
                {isSubmitting || createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Student
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}