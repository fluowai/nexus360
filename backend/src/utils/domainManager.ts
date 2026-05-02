

export async function addDomainToVercel(domain: string) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    throw new Error("Vercel credentials not configured");
  }

  const url = `https://api.vercel.com/v9/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ''}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Vercel API error: ${JSON.stringify(error)}`);
  }

  return await res.json();
}

export async function addDomainToDirectAdmin(domain: string) {
  const host = process.env.DIRECT_ADMIN_URL;
  const username = process.env.DIRECT_ADMIN_USER;
  const password = process.env.DIRECT_ADMIN_API_KEY;

  if (!host || !username || !password) {
    throw new Error("DirectAdmin credentials not configured");
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const url = `${host}/CMD_API_DOMAIN?action=create&domain=${domain}&ubandwidth=unlimited&uquota=unlimited&ssl=ON&cgi=ON&php=ON`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  const text = await res.text();
  
  if (text.includes('error=1')) {
    throw new Error(`DirectAdmin API error: ${text}`);
  }

  return text;
}
