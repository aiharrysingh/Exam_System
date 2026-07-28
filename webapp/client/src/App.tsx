import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { RoleGuard } from "./routes/RoleGuard";
import { LoginPage } from "./routes/auth/LoginPage";
import { RegisterPage } from "./routes/auth/RegisterPage";
import { DashboardPage } from "./routes/student/DashboardPage";
import { TestsPage } from "./routes/student/TestsPage";
import { ExamRunnerPage } from "./routes/student/ExamRunnerPage";
import { SummaryPage } from "./routes/student/SummaryPage";
import { ResultsListPage } from "./routes/student/ResultsListPage";
import { ResultDetailPage } from "./routes/student/ResultDetailPage";
import { ProfilePage } from "./routes/student/ProfilePage";
import { AdminDashboardPage } from "./routes/admin/AdminDashboardPage";
import { SubjectsPage } from "./routes/admin/SubjectsPage";
import { AdminTestsPage } from "./routes/admin/AdminTestsPage";
import { TestQuestionsPage } from "./routes/admin/TestQuestionsPage";
import { QuestionBankPage } from "./routes/admin/QuestionBankPage";
import { GradingQueuePage } from "./routes/admin/GradingQueuePage";
import { UserManagementPage } from "./routes/admin/UserManagementPage";
import { ReportsPage } from "./routes/studycenter/ReportsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RoleGuard allow={["STUDENT"]} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/results" element={<ResultsListPage />} />
          <Route path="/results/:attemptId" element={<ResultDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        {/* The exam runner and summary intentionally render outside AppShell — no sidebar distractions mid-test. */}
        <Route path="/attempts/:id" element={<ExamRunnerPage />} />
        <Route path="/attempts/:id/summary" element={<SummaryPage />} />
      </Route>

      {/* Shared authoring surface for ADMIN and STUDY_CENTER (test conductor) accounts —
          the backend scopes each request to "everything" (admin) vs "just mine" (test conductor). */}
      <Route element={<RoleGuard allow={["ADMIN", "STUDY_CENTER"]} />}>
        <Route element={<AppShell />}>
          <Route path="/manage/dashboard" element={<AdminDashboardPage />} />
          <Route path="/manage/subjects" element={<SubjectsPage />} />
          <Route path="/manage/tests" element={<AdminTestsPage />} />
          <Route path="/manage/tests/:testId/questions" element={<TestQuestionsPage />} />
          <Route path="/manage/bank" element={<QuestionBankPage />} />
          <Route path="/manage/grading" element={<GradingQueuePage />} />
          <Route path="/manage/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Admin-only oversight: managing student and test-conductor accounts. */}
      <Route element={<RoleGuard allow={["ADMIN"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
