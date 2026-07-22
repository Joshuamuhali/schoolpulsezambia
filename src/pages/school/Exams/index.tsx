import { Navigate, Routes, Route } from "react-router-dom";
import { ExamsPage } from "@/pages/school/Exams/ExamsPage";
import { MarksEntryPage } from "@/pages/school/Exams/MarksEntryPage";
import { ResultsPage } from "@/pages/school/Exams/ResultsPage";
import { ReportCardsPage } from "@/pages/school/Exams/ReportCardsPage";
import { GradingSystemsPage } from "@/pages/school/Exams/GradingSystemsPage";

export default function ExamsPage() {
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <Routes>
        <Route path="/" element={<Navigate to="exams" replace />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="marks-entry" element={<MarksEntryPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="report-cards" element={<ReportCardsPage />} />
        <Route path="grading" element={<GradingSystemsPage />} />
      </Routes>
    </div>
  );
}