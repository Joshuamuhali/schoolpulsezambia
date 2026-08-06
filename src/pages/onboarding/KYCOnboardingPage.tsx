import { useState, useEffect } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useKYC, useSaveKYCSection, useSubmitKYC } from "@/hooks/useKYC";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  FileText,
  Briefcase,
  User,
  GraduationCap,
  MapPin,
  BarChart3,
  ListChecks,
  CheckCircle,
  ChevronRight,
  Upload,
  Activity,
} from "lucide-react";

const KYC_SECTIONS = [
  { id: "school_info", label: "School Information", icon: "🏫", step: 1 },
  { id: "registration", label: "Ministry Registration", icon: "📋", step: 2 },
  { id: "business", label: "Business Registration", icon: "🏢", step: 3 },
  { id: "ownership", label: "School Ownership", icon: "👤", step: 4 },
  { id: "head_teacher", label: "Head Teacher", icon: "👨‍🏫", step: 5 },
  { id: "address", label: "School Address", icon: "📍", step: 6 },
  { id: "statistics", label: "Statistics", icon: "📊", step: 7 },
  { id: "facilities", label: "Facilities", icon: "🏗️", step: 8 },
];

export function KYCOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { kycProgress, isKYCComplete, isLoading } = useKYC(user?.user_metadata?.school_id);
  const saveSection = useSaveKYCSection();
  const submitKYC = useSubmitKYC();

  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Load saved progress
  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const schoolId = user?.user_metadata?.school_id;
    if (!schoolId) return;

    const { data } = await (supabase as any)
      .from("kyc_sections")
      .select("section_name, is_completed, data")
      .eq("school_id", schoolId);

    if (data) {
      const completed = data.reduce((acc: Record<string, boolean>, curr: any) => {
        acc[curr.section_name] = curr.is_completed;
        return acc;
      }, {} as Record<string, boolean>);

      // Find first incomplete section
      const firstIncomplete = KYC_SECTIONS.findIndex((s) => !completed[s.id]);
      if (firstIncomplete >= 0) {
        setCurrentSection(firstIncomplete);
      }

      // Load form data from completed sections
      const savedData = data.reduce((acc: any, curr: any) => {
        if (curr.data) {
          acc[curr.section_name] = curr.data;
        }
        return acc;
      }, {});
      setFormData(savedData);
    }
  };

  const handleSectionComplete = async (sectionId: string, data: any) => {
    setLoading(true);
    try {
      await saveSection.mutateAsync({
        schoolId: user?.user_metadata?.school_id,
        section: sectionId,
        data: data,
      });

      // Move to next section or submit
      if (currentSection < KYC_SECTIONS.length - 1) {
        setCurrentSection(currentSection + 1);
      } else {
        await handleSubmitKYC();
      }
    } catch (error) {
      console.error("Error saving section:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitKYC = async () => {
    setLoading(true);
    try {
      await submitKYC.mutateAsync(user?.user_metadata?.school_id);
      navigate("/dashboard/pending");
    } catch (error) {
      console.error("Error submitting KYC:", error);
    } finally {
      setLoading(false);
    }
  };

  // If KYC is complete, redirect to modules
  if (isKYCComplete) {
    navigate("/onboarding/modules", { replace: true });
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-success/5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-success"
                style={{
                  width: `${60 + i * 40}px`,
                  height: `${60 + i * 40}px`,
                  top: `${10 + i * 15}%`,
                  left: `${5 + i * 12}%`,
                  opacity: 0.15 + i * 0.08,
                }}
              />
            ))}
          </div>
          <div className="relative z-10 text-center space-y-6">
            <Activity className="mx-auto h-20 w-20 text-primary" />
            <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
            <p className="text-primary-foreground/70 max-w-sm">
              Multi-tenant school management — modular, transparent, and built for African schools.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  const progress = kycProgress?.progress_percentage || 0;
  const currentSectionData = KYC_SECTIONS[currentSection];

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-success/5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-success"
              style={{
                width: `${60 + i * 40}px`,
                height: `${60 + i * 40}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                opacity: 0.15 + i * 0.08,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center space-y-6">
          <Activity className="mx-auto h-20 w-20 text-primary" />
          <h2 className="font-display text-4xl font-bold text-success">School Management Platform</h2>
          <p className="text-primary-foreground/70 max-w-sm">
            Multi-tenant school management — modular, transparent, and built for African schools.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-6"
        >
          <div className="text-center lg:text-left">
            <div className="flex items-center gap-2 mb-4 justify-center lg:justify-start">
              <Activity className="h-8 w-8 text-primary" />
              <span className="font-display text-xl font-bold text-primary">School Pulse</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-primary mb-2">KYC Verification</h1>
            <p className="mt-1 text-muted-foreground">Complete all sections to verify your school</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Verification Progress</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Progress Steps */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {KYC_SECTIONS.map((section, index) => (
              <div
                key={section.id}
                className={`p-2 text-center rounded-lg text-xs ${
                  index === currentSection
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : kycProgress?.sections?.find((s: any) => s.name === section.id)
                    ?.completed
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-lg">{section.icon}</span>
                  <span className="hidden sm:inline">{section.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Section Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{currentSectionData.icon}</span>
                {currentSectionData.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KYCSection
                section={currentSectionData.id}
                onComplete={handleSectionComplete}
                loading={loading}
                initialData={formData[currentSectionData.id] || {}}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// KYC SECTION COMPONENT
// ============================================================================

function KYCSection({
  section,
  onComplete,
  loading,
  initialData,
}: {
  section: string;
  onComplete: (section: string, data: any) => void;
  loading: boolean;
  initialData: any;
}) {
  const [data, setData] = useState(initialData);

  const handleSubmit = () => {
    onComplete(section, data);
  };

  const renderForm = () => {
    switch (section) {
      case "school_info":
        return <SchoolInfoForm data={data} onChange={setData} />;
      case "registration":
        return <RegistrationForm data={data} onChange={setData} />;
      case "business":
        return <BusinessForm data={data} onChange={setData} />;
      case "ownership":
        return <OwnershipForm data={data} onChange={setData} />;
      case "head_teacher":
        return <HeadTeacherForm data={data} onChange={setData} />;
      case "address":
        return <AddressForm data={data} onChange={setData} />;
      case "statistics":
        return <StatisticsForm data={data} onChange={setData} />;
      case "facilities":
        return <FacilitiesForm data={data} onChange={setData} />;
      default:
        return <div>Unknown section</div>;
    }
  };

  return (
    <div>
      {renderForm()}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? "Saving..." : "Save & Continue →"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

function SchoolInfoForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>School Type *</Label>
        <Select
          value={data.school_type || ""}
          onValueChange={(v) => onChange({ ...data, school_type: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select school type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Day School</SelectItem>
            <SelectItem value="boarding">Boarding School</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Education Level *</Label>
        <Select
          value={data.education_level || ""}
          onValueChange={(v) => onChange({ ...data, education_level: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select education level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ece">ECE</SelectItem>
            <SelectItem value="primary">Primary</SelectItem>
            <SelectItem value="secondary">Secondary</SelectItem>
            <SelectItem value="combined">Combined School</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Year Established *</Label>
        <Input
          type="number"
          placeholder="e.g., 2000"
          value={data.year_established || ""}
          onChange={(e) =>
            onChange({ ...data, year_established: parseInt(e.target.value) })
          }
        />
      </div>
      <div>
        <Label>School Motto (Optional)</Label>
        <Input
          placeholder="e.g., Excellence in Education"
          value={data.motto || ""}
          onChange={(e) => onChange({ ...data, motto: e.target.value })}
        />
      </div>
    </div>
  );
}

function RegistrationForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Ministry Registration Number *</Label>
        <Input
          placeholder="e.g., MOE/2024/001"
          value={data.registration_number || ""}
          onChange={(e) => onChange({ ...data, registration_number: e.target.value })}
        />
      </div>
      <div>
        <Label>Date Registered *</Label>
        <Input
          type="date"
          value={data.date_registered || ""}
          onChange={(e) => onChange({ ...data, date_registered: e.target.value })}
        />
      </div>
      <div>
        <Label>Registration Certificate *</Label>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadFile(file, "registration").then((url) => {
                onChange({ ...data, certificate_url: url });
              });
            }
          }}
        />
        {data.certificate_url && (
          <p className="text-sm text-green-600 mt-1">✓ File uploaded</p>
        )}
      </div>
    </div>
  );
}

function BusinessForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>PACRA Number *</Label>
        <Input
          placeholder="e.g., PACRA/2024/12345"
          value={data.pacra_number || ""}
          onChange={(e) => onChange({ ...data, pacra_number: e.target.value })}
        />
      </div>
      <div>
        <Label>TPIN *</Label>
        <Input
          placeholder="Taxpayer Identification Number"
          value={data.tpin || ""}
          onChange={(e) => onChange({ ...data, tpin: e.target.value })}
        />
      </div>
      <div>
        <Label>PACRA Certificate</Label>
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadFile(file, "pacra").then((url) => {
                onChange({ ...data, pacra_certificate_url: url });
              });
            }
          }}
        />
        {data.pacra_certificate_url && (
          <p className="text-sm text-green-600 mt-1">✓ File uploaded</p>
        )}
      </div>
      <div>
        <Label>Business Licence Number (Optional)</Label>
        <Input
          placeholder="e.g., BL/2024/001"
          value={data.business_licence_number || ""}
          onChange={(e) =>
            onChange({ ...data, business_licence_number: e.target.value })
          }
        />
      </div>
    </div>
  );
}

function OwnershipForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Ownership Type *</Label>
        <Select
          value={data.ownership_type || ""}
          onValueChange={(v) => onChange({ ...data, ownership_type: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ownership type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
            <SelectItem value="limited_company">Limited Company</SelectItem>
            <SelectItem value="church">Church</SelectItem>
            <SelectItem value="trust">Trust</SelectItem>
            <SelectItem value="ngo">NGO</SelectItem>
            <SelectItem value="cooperative">Cooperative</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Proprietor Name *</Label>
        <Input
          placeholder="Full name of owner"
          value={data.proprietor_name || ""}
          onChange={(e) => onChange({ ...data, proprietor_name: e.target.value })}
        />
      </div>
      <div>
        <Label>NRC Number *</Label>
        <Input
          placeholder="National Registration Card number"
          value={data.proprietor_nrc || ""}
          onChange={(e) => onChange({ ...data, proprietor_nrc: e.target.value })}
        />
      </div>
      <div>
        <Label>Position *</Label>
        <Input
          placeholder="e.g., Owner/Director"
          value={data.proprietor_position || ""}
          onChange={(e) => onChange({ ...data, proprietor_position: e.target.value })}
        />
      </div>
      <div>
        <Label>Phone *</Label>
        <Input
          placeholder="+260 97 1234567"
          value={data.proprietor_phone || ""}
          onChange={(e) => onChange({ ...data, proprietor_phone: e.target.value })}
        />
      </div>
      <div>
        <Label>Email *</Label>
        <Input
          type="email"
          placeholder="owner@example.com"
          value={data.proprietor_email || ""}
          onChange={(e) => onChange({ ...data, proprietor_email: e.target.value })}
        />
      </div>
      <div>
        <Label>NRC Front Image *</Label>
        <Input
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadFile(file, "nrc_front").then((url) => {
                onChange({ ...data, proprietor_nrc_front_url: url });
              });
            }
          }}
        />
      </div>
      <div>
        <Label>NRC Back Image *</Label>
        <Input
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              uploadFile(file, "nrc_back").then((url) => {
                onChange({ ...data, proprietor_nrc_back_url: url });
              });
            }
          }}
        />
      </div>
    </div>
  );
}

function HeadTeacherForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Full Name *</Label>
        <Input
          placeholder="Head teacher full name"
          value={data.full_name || ""}
          onChange={(e) => onChange({ ...data, full_name: e.target.value })}
        />
      </div>
      <div>
        <Label>Phone *</Label>
        <Input
          placeholder="+260 97 1234567"
          value={data.phone || ""}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
        />
      </div>
      <div>
        <Label>Email *</Label>
        <Input
          type="email"
          placeholder="headteacher@school.com"
          value={data.email || ""}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
        />
      </div>
      <div>
        <Label>TCZ Number (Optional)</Label>
        <Input
          placeholder="Teaching Council of Zambia registration"
          value={data.tcz_number || ""}
          onChange={(e) => onChange({ ...data, tcz_number: e.target.value })}
        />
      </div>
    </div>
  );
}

function AddressForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Province *</Label>
        <Select
          value={data.province || ""}
          onValueChange={(v) => onChange({ ...data, province: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lusaka">Lusaka</SelectItem>
            <SelectItem value="copperbelt">Copperbelt</SelectItem>
            <SelectItem value="southern">Southern</SelectItem>
            <SelectItem value="northern">Northern</SelectItem>
            <SelectItem value="eastern">Eastern</SelectItem>
            <SelectItem value="western">Western</SelectItem>
            <SelectItem value="north-western">North Western</SelectItem>
            <SelectItem value="central">Central</SelectItem>
            <SelectItem value="luapula">Luapula</SelectItem>
            <SelectItem value="muchinga">Muchinga</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>District *</Label>
        <Input
          placeholder="e.g., Lusaka District"
          value={data.district || ""}
          onChange={(e) => onChange({ ...data, district: e.target.value })}
        />
      </div>
      <div>
        <Label>Physical Address *</Label>
        <Input
          placeholder="e.g., Plot 123, Main Street"
          value={data.physical_address || ""}
          onChange={(e) => onChange({ ...data, physical_address: e.target.value })}
        />
      </div>
      <div>
        <Label>GPS Location (Optional)</Label>
        <Input
          placeholder="e.g., -15.3875, 28.3228"
          value={data.gps_location || ""}
          onChange={(e) => onChange({ ...data, gps_location: e.target.value })}
        />
      </div>
      <div>
        <Label>Postal Address (Optional)</Label>
        <Input
          placeholder="e.g., P.O. Box 12345"
          value={data.postal_address || ""}
          onChange={(e) => onChange({ ...data, postal_address: e.target.value })}
        />
      </div>
    </div>
  );
}

function StatisticsForm({ data, onChange }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Number of Students *</Label>
        <Input
          type="number"
          placeholder="0"
          value={data.number_of_students || 0}
          onChange={(e) =>
            onChange({ ...data, number_of_students: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label>Number of Teachers *</Label>
        <Input
          type="number"
          placeholder="0"
          value={data.number_of_teachers || 0}
          onChange={(e) =>
            onChange({ ...data, number_of_teachers: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label>Number of Classrooms *</Label>
        <Input
          type="number"
          placeholder="0"
          value={data.number_of_classrooms || 0}
          onChange={(e) =>
            onChange({ ...data, number_of_classrooms: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label>Number of Streams *</Label>
        <Input
          type="number"
          placeholder="0"
          value={data.number_of_streams || 0}
          onChange={(e) =>
            onChange({ ...data, number_of_streams: parseInt(e.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label>Number of Campuses *</Label>
        <Input
          type="number"
          placeholder="1"
          value={data.number_of_campuses || 1}
          onChange={(e) =>
            onChange({ ...data, number_of_campuses: parseInt(e.target.value) || 1 })
          }
        />
      </div>
    </div>
  );
}

function FacilitiesForm({ data, onChange }: any) {
  const facilities = [
    { id: "library", label: "Library" },
    { id: "computer_lab", label: "Computer Lab" },
    { id: "science_lab", label: "Science Lab" },
    { id: "boarding", label: "Boarding Facilities" },
    { id: "sports", label: "Sports Facilities" },
    { id: "school_bus", label: "School Bus" },
    { id: "clinic", label: "Clinic/Sick Bay" },
    { id: "dining_hall", label: "Dining Hall" },
  ];

  return (
    <div className="space-y-4">
      <Label>Available Facilities</Label>
      <div className="grid grid-cols-2 gap-4">
        {facilities.map((facility) => (
          <div key={facility.id} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={facility.id}
              checked={data[facility.id] || false}
              onChange={(e) =>
                onChange({ ...data, [facility.id]: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor={facility.id} className="cursor-pointer">
              {facility.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function uploadFile(file: File, type: string): Promise<string> {
  const schoolId = (await supabase.auth.getUser()).data.user?.user_metadata?.school_id;
  if (!schoolId) throw new Error("No school ID");

  const fileExt = file.name.split(".").pop();
  const fileName = `${schoolId}/${type}-${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("kyc-documents")
    .upload(fileName, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from("kyc-documents")
    .getPublicUrl(fileName);

  return data.publicUrl;
}