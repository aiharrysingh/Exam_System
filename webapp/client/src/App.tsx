import { lazy, Suspense } from "react";
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
import { SkeletonPage } from "./components/ui/Skeleton";

// Authoring/admin surfaces are code-split out of the student bundle — a
// STUDENT session never pays for recharts, dnd-kit, or the CSV importer.
const AdminDashboardPage = lazy(() => import("./routes/admin/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const SubjectsPage = lazy(() => import("./routes/admin/SubjectsPage").then((m) => ({ default: m.SubjectsPage })));
const AdminTestsPage = lazy(() => import("./routes/admin/AdminTestsPage").then((m) => ({ default: m.AdminTestsPage })));
const TestQuestionsPage = lazy(() => import("./routes/admin/TestQuestionsPage").then((m) => ({ default: m.TestQuestionsPage })));
const QuestionBankPage = lazy(() => import("./routes/admin/QuestionBankPage").then((m) => ({ default: m.QuestionBankPage })));
const GradingQueuePage = lazy(() => import("./routes/admin/GradingQueuePage").then((m) => ({ default: m.GradingQueuePage })));
const UserManagementPage = lazy(() => import("./routes/admin/UserManagementPage").then((m) => ({ default: m.UserManagementPage })));
const ReportsPage = lazy(() => import("./routes/studycenter/ReportsPage").then((m) => ({ default: m.ReportsPage })));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<SkeletonPage stats={4} rows={4} />}>{children}</Suspense>;
}

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
          <Route path="/manage/dashboard" element={<LazyPage><AdminDashboardPage /></LazyPage>} />
          <Route path="/manage/subjects" element={<LazyPage><SubjectsPage /></LazyPage>} />
          <Route path="/manage/tests" element={<LazyPage><AdminTestsPage /></LazyPage>} />
          <Route path="/manage/tests/:testId/questions" element={<LazyPage><TestQuestionsPage /></LazyPage>} />
          <Route path="/manage/bank" element={<LazyPage><QuestionBankPage /></LazyPage>} />
          <Route path="/manage/grading" element={<LazyPage><GradingQueuePage /></LazyPage>} />
          <Route path="/manage/reports" element={<LazyPage><ReportsPage /></LazyPage>} />
        </Route>
      </Route>

      {/* Admin-only oversight: managing student and test-conductor accounts. */}
      <Route element={<RoleGuard allow={["ADMIN"]} />}>
        <Route element={<AppShell />}>
          <Route path="/admin/users" element={<LazyPage><UserManagementPage /></LazyPage>} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
