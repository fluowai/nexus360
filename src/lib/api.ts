export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('nexus_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('nexus_token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }


  return response;
}
