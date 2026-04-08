import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
    const { isAuthenticated, user, login, register, logout } = useAuthStore();
    return { isAuthenticated, user, login, register, logout };
}
