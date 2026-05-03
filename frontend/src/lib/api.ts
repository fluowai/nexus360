/// <reference types="vite/client" />
const API_URL = import.meta.env.VITE_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('nexus_token');
  const userRole = localStorage.getItem('nexus_user_role');
  const impersonatedOrgId = localStorage.getItem('nexus_selected_client');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(userRole === 'SUPER_ADMIN' && impersonatedOrgId ? { 'X-Org-Id': impersonatedOrgId } : {}),
    ...options.headers,
  };

  // Garante a correta concatenação da URL da API
  const normalizedBase = API_URL?.replace(/\/$/, '') || '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${normalizedBase}${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Só redireciona para login se for um 401 real (não durante validação inicial)
  if (response.status === 401 || response.status === 403) {
    // Não redireciona se for a chamada de validação do /me (primeira carga)
    const isAuthCheck = path.includes('/api/auth/me');
    if (!isAuthCheck) {
      localStorage.removeItem('nexus_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}
