import { Navigate, Routes, Route } from "react-router-dom";
import { TakeAttendancePage } from "@/pages/school/Attendance/TakeAttendancePage";
import { AttendanceHistoryPage } from "@/pages/school/Attendance/AttendanceHistoryPage";
import { AttendanceReportsPage } from "@/pages/school/Attendance/AttendanceReportsPage";
import { AttendanceSettingsPage } from "@/pages/school/Attendance/AttendanceSettingsPage";

export default function AttendancePage() {
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <Routes>
        <Route path="/" element={<Navigate to="take" replace />} />
        <Route path="take" element={<TakeAttendancePage />} />
        <Route path="history" element={<AttendanceHistoryPage />} />
        <Route path="reports" element={<AttendanceReportsPage />} />
        <Route path="settings" element={<AttendanceSettingsPage />} />
      </Routes>
    </div>
  );
}