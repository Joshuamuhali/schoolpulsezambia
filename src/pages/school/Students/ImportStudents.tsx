import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAppStore } from "@/store/appStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { studentService } from "@/lib/services/studentService";

export default function ImportStudents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentSchool = useAppStore((s) => s.currentSchool);
  const [file, setFile] = useState<File | null>(null);
  const [importLog, setImportLog] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  const importMutation = useMutation({
    mutationFn: async (csvFile: File) => {
      if (!currentSchool?.id) throw new Error("No school selected");

      // Read CSV file
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        throw new Error("CSV file is empty or has no data rows");
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      // Validate required columns
      const requiredColumns = ["full_name", "gender"];
      const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(", ")}`);
      }

      // Parse data rows
      const students: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const student: any = {};

        headers.forEach((header, index) => {
          const value = values[index] || "";
          
          switch (header) {
            case "full_name":
              student.full_name = value;
              break;
            case "gender":
              student.gender = value.toUpperCase() === "F" ? "F" : "M";
              break;
            case "date_of_birth":
              student.date_of_birth = value || undefined;
              break;
            case "admission_number":
              student.admission_number = value || undefined;
              break;
            case "class_id":
              student.class_id = value || undefined;
              break;
            case "grade_id":
              student.grade_id = value || undefined;
              break;
            case "medical_conditions":
              student.medical_conditions = value || undefined;
              break;
            case "allergies":
              student.allergies = value || undefined;
              break;
            case "blood_group":
              student.blood_group = value || undefined;
              break;
            case "emergency_contact_name":
              student.emergency_contact_name = value || undefined;
              break;
            case "emergency_contact_phone":
              student.emergency_contact_phone = value || undefined;
              break;
            case "previous_school":
              student.previous_school = value || undefined;
              break;
            case "transfer_certificate_number":
              student.transfer_certificate_number = value || undefined;
              break;
            case "enrollment_date":
              student.enrollment_date = value || undefined;
              break;
            case "notes":
              student.notes = value || undefined;
              break;
          }
        });

        if (student.full_name) {
          students.push(student);
        }
      }

      if (students.length === 0) {
        throw new Error("No valid student records found in CSV");
      }

      // Import students
      return studentService.importStudents(currentSchool.id, students);
    },
    onSuccess: (log) => {
      setImportLog(log);
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["students"] });
      
      if (log.failed_imports === 0) {
        toast.success(`Successfully imported ${log.successful_imports} students`);
      } else {
        toast.warning(`Imported ${log.successful_imports} students, ${log.failed_imports} failed`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import students");
      setProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportLog(null);
      setProgress(0);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast.error("Please select a CSV file");
      return;
    }

    setProgress(50);
    importMutation.mutate(file);
  };

  const downloadTemplate = () => {
    const template = `full_name,gender,date_of_birth,admission_number,class_id,medical_conditions,allergies,blood_group,emergency_contact_name,emergency_contact_phone
John Doe,M,2015-03-15,ADM-001,,,Peanuts,,Jane Doe,+260 97 123 4567
Jane Smith,F,2014-07-22,ADM-002,,Asthma,,,John Smith,+260 96 987 6543
Bob Johnson,M,2015-01-10,,,None,,,Alice Johnson,+260 95 555 5555`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
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
        <h1 className="font-display text-3xl font-bold">Import Students</h1>
        <p className="text-muted-foreground mt-2">
          Bulk import students from a CSV file
        </p>
      </div>

      <div className="grid gap-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
            <CardDescription>
              Follow these steps to import students from a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">1. Download the template</h4>
              <p className="text-sm text-muted-foreground">
                Use our CSV template to ensure correct formatting. The template includes all
                required and optional fields.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                className="mt-2"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Fill in student data</h4>
              <p className="text-sm text-muted-foreground">
                Open the CSV file in Excel or Google Sheets and fill in the student information.
                Required fields are marked with an asterisk (*).
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Upload the file</h4>
              <p className="text-sm text-muted-foreground">
                Select the completed CSV file and click "Import Students". The system will
                validate and import all records.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Admission numbers will be auto-generated if not provided.
                Maximum 500 students per import. For larger imports, split into multiple files.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Upload Section */}
        {!importLog && (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a CSV file containing student data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv_file">CSV File</Label>
                <Input
                  id="csv_file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {progress > 0 && progress < 100 && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <p className="text-sm text-muted-foreground">Importing students...</p>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!file || importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Students
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {importLog && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 20 }}
            className="space-y-6"
          >
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Import Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Records</p>
                    <p className="text-2xl font-bold">{importLog.total_records}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Successful</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <p className="text-2xl font-bold text-green-600">{importLog.successful_imports}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <p className="text-2xl font-bold text-red-600">{importLog.failed_imports}</p>
                    </div>
                  </div>
                </div>

                {importLog.failed_imports > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Some records failed to import. Check the errors below for details.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Errors */}
            {importLog.errors && importLog.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Errors</CardTitle>
                  <CardDescription>
                    Review and fix these errors, then re-import
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importLog.errors.map((error: any, index: number) => (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Row {error.row}:</strong> {error.student} - {error.error}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setImportLog(null);
                  setFile(null);
                  setProgress(0);
                }}
                variant="outline"
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import Another File
              </Button>
              <Button
                onClick={() => navigate("/dashboard/students")}
                className="flex-1"
              >
                View Students
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}