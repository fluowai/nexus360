/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Tenta renovar o access token usando o refresh token.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('nexus_refresh_token');
  if (!refreshToken) return null;

  try {
    const normalizedBase = API_URL?.replace(/\/$/, '') || '';
    const response = await fetch(`${normalizedBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      // Refresh falhou — limpar tudo
      localStorage.removeItem('nexus_token');
      localStorage.removeItem('nexus_refresh_token');
      return null;
    }

    const data = await response.json();
    if (data.token) {
      localStorage.setItem('nexus_token', data.token);
      return data.token;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}, retries = 2): Promise<Response> {
  const token = localStorage.getItem('nexus_token');
  const userRole = localStorage.getItem('nexus_user_role');
  const impersonatedOrgId = localStorage.getItem('nexus_selected_client');
  
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
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Se token expirou, tentar refresh automaticamente
    if (response.status === 401) {
      const body = await response.clone().json().catch(() => ({}));
      
      if (body.error === 'TOKEN_EXPIRED' && !path.includes('/api/auth/refresh')) {
        // Evitar múltiplos refreshes simultâneos
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = refreshAccessToken().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const newToken = await (refreshPromise || refreshAccessToken());
        
        if (newToken) {
          // Retentar a request original com o novo token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return retryResponse;
        } else {
          // Refresh falhou — redirecionar para login
          localStorage.removeItem('nexus_token');
          localStorage.removeItem('nexus_refresh_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else if (!path.includes('/api/auth/me') && !path.includes('/api/auth/refresh')) {
        // Outro tipo de 401 (não é expiração)
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    // 403 — sem permissão
    if (response.status === 403) {
      const isAuthCheck = path.includes('/api/auth/me');
      if (!isAuthCheck) {
        console.warn(`[API] Sem permissão para: ${path}`);
      }
    }

    return response;
  } catch (error: any) {
    if (retries > 0 && (error.name === 'AbortError' || error.name === 'TypeError')) {
      console.warn(`[API_FETCH] Tentando novamente... (${retries} restantes) para: ${path}`);
      return apiFetch(path, options, retries - 1);
    }
    
    console.error(`[API_FETCH_ERROR] Falha crítica em ${path}:`, error);
    throw error;
  }
}
