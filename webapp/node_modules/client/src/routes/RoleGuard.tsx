import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../lib/useAuth";
import type { Role } from "../lib/types";
import { FullPageSpinner } from "../components/ui/Spinner";
import { roleHome } from "./roleHome";

export function RoleGuard({ allow }: { allow: Role[] }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;

  return <Outlet />;
}
