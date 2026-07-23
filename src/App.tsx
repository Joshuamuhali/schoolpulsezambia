import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Auth
import { RequireAuth } from "@/components/auth/RequireAuth";
import { TenantSwitchPrompt } from "@/components/auth/TenantSwitchPrompt";
import LoginPage from "@/pages/auth/LoginPage";
import OnboardingPage from "@/pages/auth/OnboardingPage";
import { ActivationPage } from "@/pages/auth/ActivationPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import { BlockedAccessPage } from "@/pages/auth/BlockedAccessPage";

// Onboarding
import ModuleSelectionPage from "@/pages/onboarding/ModuleSelectionPage";
import PaymentPage from "@/pages/onboarding/PaymentPage";

// Landing
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";

// School dashboard (tenant-scoped)
import SchoolLayout from "@/components/school/SchoolLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import StudentsPage from "@/pages/dashboard/StudentsPage";
import TeachersPage from "@/pages/dashboard/TeachersPage";
import AttendancePage from "@/pages/dashboard/AttendancePage";
import ExamsPage from "@/pages/dashboard/ExamsPage";
import CreateExam from "@/pages/school/Exams/CreateExam";
import EnterMarks from "@/pages/school/Exams/EnterMarks";
import ExamResults from "@/pages/school/Exams/ExamResults";
import FinancePage from "@/pages/dashboard/FinancePage";
import DashboardSettingsPage from "@/pages/dashboard/SettingsPage";

// Analytics
import AnalyticsDashboard from "@/pages/analytics/AnalyticsDashboard";
import StudentAnalytics from "@/pages/analytics/StudentAnalytics";
import AttendanceAnalytics from "@/pages/analytics/AttendanceAnalytics";
import AcademicAnalytics from "@/pages/analytics/AcademicAnalytics";
import FinanceAnalytics from "@/pages/analytics/FinanceAnalytics";
import StaffAnalytics from "@/pages/analytics/StaffAnalytics";
import Reports from "@/pages/analytics/Reports";
import { StudentsPage as StudentsManagement } from "@/pages/school/Students";
import { AddStudent } from "@/pages/school/Students";
import { EditStudent } from "@/pages/school/Students";
import { StudentProfile } from "@/pages/school/Students";
import StudentLifecyclePage from "@/pages/school/Students/StudentLifecyclePage";
import StaffPage from "@/pages/school/Staff";
import { AddStaff } from "@/pages/school/Staff/AddStaff";
import { EditStaff } from "@/pages/school/Staff/EditStaff";
import { StaffProfile } from "@/pages/school/Staff/StaffProfile";
import SetupHub from "@/pages/dashboard/SetupHub";
import FinanceSetup from "@/pages/dashboard/setup/FinanceSetup";
import ExamsSetup from "@/pages/dashboard/setup/ExamsSetup";
import AttendanceSetup from "@/pages/dashboard/setup/AttendanceSetup";
import ParentPortalSetup from "@/pages/dashboard/setup/ParentPortalSetup";
import CommunicationSetup from "@/pages/dashboard/setup/CommunicationSetup";
import { SetupWizard } from "@/pages/school/SetupWizard";
import AttendanceReport from "@/pages/school/Attendance/AttendanceReport";
import AttendanceIndex from "@/pages/school/Attendance/index";
import FeesIndex from "@/pages/school/Fees";
import { FeeTypes } from "@/pages/school/Fees/FeeTypes";
import { AssignFees } from "@/pages/school/Fees/AssignFees";
import { RecordPayment } from "@/pages/school/Fees/RecordPayment";
import { StudentFees } from "@/pages/school/Fees/StudentFees";
import { FeeReport } from "@/pages/school/Fees/FeeReport";
import ExpensesIndex from "@/pages/school/Expenses";
import { ExpenseCategories } from "@/pages/school/Expenses/ExpenseCategories";
import { RecordExpense } from "@/pages/school/Expenses/RecordExpense";

// Parent Portal
import ParentLayout from "@/components/parent/ParentLayout";
import ParentDashboard from "@/pages/parent/ParentDashboard";
import ChildProfile from "@/pages/parent/ChildProfile";
import Announcements from "@/pages/parent/Announcements";
import Notifications from "@/pages/parent/Notifications";
import ParentsPage from "@/pages/admin/ParentsPage";

// Teacher Onboarding
import PrincipalTeachersPage from "@/pages/principal/TeachersPage";
import TeacherAssignmentPage from "@/pages/principal/TeacherAssignmentPage";
import TeacherSettingsPage from "@/pages/admin/TeacherSettingsPage";
import TeacherRegistrationPage from "@/pages/staff/TeacherRegistrationPage";

// Supa Admin portal
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import SchoolsPage from "@/pages/admin/SchoolsPage";
import SchoolDetailPage from "@/pages/admin/SchoolDetailPage";
import FeaturesPage from "@/pages/admin/FeaturesPage";
import FeaturesManagementPage from "@/pages/admin/FeaturesManagementPage";
import PricingPage from "@/pages/admin/PricingPage";
import ActivationQueuePage from "@/pages/admin/ActivationQueuePage";
import SubscriptionsPage from "@/pages/admin/SubscriptionsPage";
import UsersPage from "@/pages/admin/UsersPage";
import PaymentsPage from "@/pages/admin/PaymentsPage";
import LogsPage from "@/pages/admin/LogsPage";
import AdminSettingsPage from "@/pages/admin/SettingsPage";
import SetupFeePaymentPage from "@/pages/school/SetupFeePaymentPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import SupportPage from "@/pages/admin/SupportPage";
import SchoolFeaturesPage from "@/pages/school/FeaturesPage";

// Dashboard Router
import { DashboardRouter } from "@/components/auth/DashboardRouter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <TenantSwitchPrompt />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* ── Public ─────────────────────────────────────────────────── */}
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/onboarding/modules" element={<ModuleSelectionPage />} />
          <Route path="/onboarding/payment" element={<PaymentPage />} />
          <Route path="/onboarding/activate" element={<ActivationPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/access-blocked" element={<BlockedAccessPage />} />

          {/* Legacy /login redirect */}
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />

          {/* ── Smart Dashboard Router ─────────────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardRouter />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to=".." replace />} />
            <Route path="students" element={<StudentsManagement />} />
            <Route path="students/add" element={<AddStudent />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="students/:id/edit" element={<EditStudent />} />
            <Route path="students/lifecycle" element={<StudentLifecyclePage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/add" element={<AddStaff />} />
            <Route path="staff/:id" element={<StaffProfile />} />
            <Route path="staff/:id/edit" element={<EditStaff />} />
            <Route path="teachers" element={<TeachersPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="attendance/management" element={<AttendanceIndex />} />
            <Route path="attendance/reports" element={<AttendanceReport />} />
            <Route path="fees" element={<FeesIndex />} />
            <Route path="fees/types" element={<FeeTypes />} />
            <Route path="fees/assign" element={<AssignFees />} />
            <Route path="fees/payment" element={<RecordPayment />} />
            <Route path="fees/students" element={<StudentFees />} />
            <Route path="fees/reports" element={<FeeReport />} />
            <Route path="expenses" element={<ExpensesIndex />} />
            <Route path="expenses/categories" element={<ExpenseCategories />} />
            <Route path="expenses/record" element={<RecordExpense />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/new" element={<CreateExam />} />
            <Route path="exams/:id/marks" element={<EnterMarks />} />
            <Route path="exams/:id/results" element={<ExamResults />} />
            <Route path="finance" element={<FinancePage />} />
            <Route path="setup" element={<SetupHub />} />
            <Route path="setup/finance" element={<FinanceSetup />} />
            <Route path="setup/exams" element={<ExamsSetup />} />
            <Route path="setup/attendance" element={<AttendanceSetup />} />
            <Route path="setup/parent" element={<ParentPortalSetup />} />
            <Route path="setup/communication" element={<CommunicationSetup />} />
            <Route path="setup/wizard" element={<SetupWizard />} />
            <Route path="settings" element={<DashboardSettingsPage />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
            <Route path="analytics/students" element={<StudentAnalytics />} />
            <Route path="analytics/attendance" element={<AttendanceAnalytics />} />
            <Route path="analytics/academic" element={<AcademicAnalytics />} />
            <Route path="analytics/finance" element={<FinanceAnalytics />} />
            <Route path="analytics/staff" element={<StaffAnalytics />} />
            <Route path="analytics/reports" element={<Reports />} />
            <Route path="teachers" element={<PrincipalTeachersPage />} />
            <Route path="teachers/assign/:teacherId" element={<TeacherAssignmentPage />} />
            <Route path="features" element={<SchoolFeaturesPage />} />
          </Route>

          {/* ── Platform Admin Portal (requires auth + platform admin role) ─── */}
          <Route
            path="/admin"
            element={
              <RequireAuth requirePlatformAdmin>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="schools" element={<SchoolsPage />} />
            <Route path="schools/create" element={<SchoolsPage />} />
            <Route path="schools/:id" element={<SchoolDetailPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="payments" element={<PaymentsPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="features" element={<FeaturesManagementPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="activation" element={<ActivationQueuePage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            {/* Redirects for consolidated navigation */}
            <Route path="modules/pricing" element={<Navigate to="/admin/features" replace />} />
            <Route path="approvals" element={<Navigate to="/admin/payments" replace />} />
            <Route path="parents" element={<ParentsPage />} />
            <Route path="settings/teachers" element={<TeacherSettingsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="support" element={<SupportPage />} />
          </Route>

          {/* ── Setup Fee Payment (requires auth) ───────────────────────── */}
          <Route
            path="/school/setup-fee-payment"
            element={
              <RequireAuth>
                <SetupFeePaymentPage />
              </RequireAuth>
            }
          />

          {/* ── Teacher Registration (public with token) ─────────────────── */}
          <Route path="/staff/register" element={<TeacherRegistrationPage />} />

          {/* ── Parent Portal (requires auth + parent role) ─────────────── */}
          <Route
            path="/parent"
            element={
              <RequireAuth requireParent>
                <ParentLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="children/:studentId" element={<ChildProfile />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* ── 404 ─────────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
