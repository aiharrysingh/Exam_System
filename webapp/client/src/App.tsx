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
import { StudyCenterDashboardPage } from "./routes/studycenter/StudyCenterDashboardPage";
import { StudentsPage } from "./routes/studycenter/StudentsPage";
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

      <Route element={<RoleGuard allow={["ADMIN"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/subjects" element={<SubjectsPage />} />
          <Route path="/admin/tests" element={<AdminTestsPage />} />
          <Route path="/admin/tests/:testId/questions" element={<TestQuestionsPage />} />
        </Route>
      </Route>

      <Route element={<RoleGuard allow={["STUDY_CENTER"]} />}>
        <Route element={<AppShell />}>
          <Route path="/studycenter/dashboard" element={<StudyCenterDashboardPage />} />
          <Route path="/studycenter/students" element={<StudentsPage />} />
          <Route path="/studycenter/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
