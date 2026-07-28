import type { Role } from "../lib/types";

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "STUDY_CENTER":
      return "/studycenter/dashboard";
    default:
      return "/dashboard";
  }
}
