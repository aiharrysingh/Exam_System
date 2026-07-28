import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./apiClient";
import type { AuthUser } from "./types";

export function useCurrentUser() {
  return useQuery<AuthUser | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await api.get<AuthUser>("/auth/me");
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api.post<AuthUser>("/auth/login", body),
    onSuccess: (user) => qc.setQueryData(["auth", "me"], user),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      contactNo?: string;
      address?: string;
      city?: string;
      pincode?: string;
    }) => api.post<AuthUser>("/auth/register", body),
    onSuccess: (user) => qc.setQueryData(["auth", "me"], user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>("/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["auth", "me"], null);
      qc.clear();
    },
  });
}
