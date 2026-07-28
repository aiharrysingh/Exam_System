import type { Role } from "../lib/types";

export function roleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
    case "STUDY_CENTER":
      return "/manage/dashboard";
    default:
      return "/dashboard";
  }
}
