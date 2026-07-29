import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { api } from "../../lib/apiClient";
import type { AdminTest, ManagedUser, Subject } from "../../lib/types";
import { useCurrentUser } from "../../lib/useAuth";
import { staggerContainer, fadeInUp } from "../../lib/motion";
import { StatCard } from "../../components/ui/StatCard";
import { Icon } from "../../components/ui/Icon";
import { SkeletonPage } from "../../components/ui/Skeleton";

export function AdminDashboardPage() {
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>("/subjects") });
  const tests = useQuery({ queryKey: ["admin", "tests"], queryFn: () => api.get<AdminTest[]>("/tests") });
  const students = useQuery({
    queryKey: ["admin", "users", "STUDENT"],
    queryFn: () => api.get<ManagedUser[]>("/admin/users?role=STUDENT"),
    enabled: isAdmin,
  });

  if (subjects.isLoading || tests.isLoading || (isAdmin && students.isLoading)) return <SkeletonPage stats={4} rows={0} />;

  const published = tests.data?.filter((t) => t.isPublished).length ?? 0;

  return (
    <motion.div variants={staggerContainer(4)} initial="hidden" animate="show" className="flex flex-col gap-6">
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Dashboard</h1>
        <p className="text-sm text-fg-muted">
          {isAdmin ? "Platform-wide subjects, tests, and accounts." : "Your subjects, tests, and questions."}
        </p>
      </motion.div>
      <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Subjects" value={subjects.data?.length ?? 0} icon={<Icon name="book" size={20} />} tone="brand" />
        <StatCard label="Total tests" value={tests.data?.length ?? 0} icon={<Icon name="list" size={20} />} tone="accent" />
        <StatCard label="Published tests" value={published} icon={<Icon name="check" size={20} />} tone="success" />
        {isAdmin && (
          <StatCard label="Students" value={students.data?.length ?? 0} icon={<Icon name="users" size={20} />} tone="warning" />
        )}
      </motion.div>
    </motion.div>
  );
}
