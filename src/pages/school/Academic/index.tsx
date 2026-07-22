import { Navigate, Routes, Route } from "react-router-dom";
import { AcademicYearsPage } from "@/pages/school/Academic/AcademicYearsPage";
import { TermsPage } from "@/pages/school/Academic/TermsPage";
import { GradesPage } from "@/pages/school/Academic/GradesPage";
import { ClassesPage } from "@/pages/school/Academic/ClassesPage";
import { SubjectsPage } from "@/pages/school/Academic/SubjectsPage";
import { AssignmentsPage } from "@/pages/school/Academic/AssignmentsPage";

export default function AcademicPage() {
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <Routes>
        <Route path="/" element={<Navigate to="years" replace />} />
        <Route path="years" element={<AcademicYearsPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
      </Routes>
    </div>
  );
}
