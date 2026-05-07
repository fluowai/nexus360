/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export async function apiFetch(path: string, options: RequestInit = {}, retries = 2) {
  const token = localStorage.getItem('nexus_token');
  const userRole = localStorage.getItem('nexus_user_role');
  const impersonatedOrgId = localStorage.getItem('nexus_selected_client');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userRole === 'SUPER_ADMIN' && impersonatedOrgId ? { 'X-Org-Id': impersonatedOrgId } : {}),
    ...options.headers,
  };

  const normalizedBase = API_URL?.replace(/\/$/, '') || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Auth Error Handling
    if (response.status === 401 || response.status === 403) {
      const isAuthCheck = path.includes('/api/auth/me');
      if (!isAuthCheck) {
        localStorage.removeItem('nexus_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
