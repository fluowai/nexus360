import { useState, useEffect } from "react";
import { apiFetch, clearAuthSession, hasAccessToken } from "./api";
import type { User } from "../types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const publicPaths = ['/login', '/onboarding', '/site', '/vendas'];
      const isPublicPath =
        publicPaths.includes(window.location.pathname) ||
        window.location.pathname.startsWith('/meet') ||
        window.location.pathname.startsWith('/p/') ||
        window.location.pathname.startsWith('/client-portal');

      if (isPublicPath && !hasAccessToken()) {
        setAuthLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        if (!res.ok) throw new Error("Invalid session");
        const data = await res.json();
        setUser(data);
      } catch {
        setUser(null);
        clearAuthSession();
        if (!isPublicPath && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    clearAuthSession();
    localStorage.clear();
    window.location.href = '/login';
  };

  return { user, setUser, authLoading, handleLogout };
}
