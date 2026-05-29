/// <reference types="vite/client" />

const PRODUCTION_API_URL = 'https://nexus360-production.up.railway.app';
const rawApiUrl = import.meta.env.VITE_API_URL || '';
const normalizedApiUrl = rawApiUrl === 'same-origin' ? '' : rawApiUrl;

const API_URL = normalizedApiUrl.includes('woomobzy-production.up.railway.app')
  ? PRODUCTION_API_URL
  : normalizedApiUrl;
const ACCESS_TOKEN_KEY = 'nexus_access_token';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let accessTokenMemory: string | null = sessionStorage.getItem(ACCESS_TOKEN_KEY);

function isAuthPath(path: string) {
  return path.includes('/api/auth/login') || path.includes('/api/auth/register') || path.includes('/api/auth/refresh');
}

function isTokenExpiring(token: string | null): boolean {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1] || ''));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now() + 60_000;
  } catch {
    return true;
  }
}

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  if (token) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function hasAccessToken(): boolean {
  return Boolean(accessTokenMemory || sessionStorage.getItem(ACCESS_TOKEN_KEY));
}

export function clearAuthSession() {
  setAccessToken(null);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const normalizedBase = API_URL?.replace(/\/$/, '') || '';
    const response = await fetch(`${normalizedBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      clearAuthSession();
      return null;
    }

    const data = await response.json();
    if (data.token) {
      setAccessToken(data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  let token = accessTokenMemory || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  const userRole = localStorage.getItem('nexus_user_role');
  const impersonatedOrgId = localStorage.getItem('nexus_selected_client');
  const shouldUseAuth = !isAuthPath(path);

  if (shouldUseAuth && isTokenExpiring(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    token = await (refreshPromise || refreshAccessToken());
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userRole === 'SUPER_ADMIN' && impersonatedOrgId ? { 'X-Org-Id': impersonatedOrgId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const normalizedBase = API_URL?.replace(/\/$/, '') || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401) {
      if (!path.includes('/api/auth/refresh')) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshAccessToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const newToken = await (refreshPromise || refreshAccessToken());

        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(url, {
            ...options,
            headers,
            credentials: 'include',
          });
        }

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        clearAuthSession();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return response;
  } catch (error: any) {
    if (retries > 0 && (error.name === 'AbortError' || error.name === 'TypeError')) {
      return apiFetch(path, options, retries - 1);
    }

    throw error;
  }
}
