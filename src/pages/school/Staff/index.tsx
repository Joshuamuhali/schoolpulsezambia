import { Navigate, Routes, Route } from "react-router-dom";
import { StaffListPage } from "@/pages/school/Staff/StaffListPage";
import { AddStaffPage } from "@/pages/school/Staff/AddStaffPage";
import { EditStaffPage } from "@/pages/school/Staff/EditStaffPage";
import { StaffProfilePage } from "@/pages/school/Staff/StaffProfilePage";
import { TeacherAssignmentsPage } from "@/pages/school/Staff/TeacherAssignmentsPage";
import { StaffInvitationsPage } from "@/pages/school/Staff/StaffInvitationsPage";

export default function StaffPage() {
  return (
    <div className="container max-w-7xl mx-auto p-6">
      <Routes>
        <Route path="/" element={<Navigate to="list" replace />} />
        <Route path="list" element={<StaffListPage />} />
        <Route path="add" element={<AddStaffPage />} />
        <Route path=":id/edit" element={<EditStaffPage />} />
        <Route path=":id" element={<StaffProfilePage />} />
        <Route path="assignments" element={<TeacherAssignmentsPage />} />
        <Route path="invitations" element={<StaffInvitationsPage />} />
      </Routes>
    </div>
  );
}