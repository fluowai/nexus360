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

  // Clone a resposta para não esgotar o body
  const clonedResponse = response.clone();

  // Método robusto para parsear JSON
  clonedResponse.json = async () => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      throw new Error(text || 'Resposta inválida do servidor');
    }
  };

  return response;
}
