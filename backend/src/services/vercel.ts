import axios from 'axios';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Opcional

export const vercelService = {
  addDomain: async (domain: string) => {
    if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
      throw new Error("Vercel credentials not configured");
    }

    const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;
    
    try {
      const response = await axios.post(
        url,
        { name: domain },
        {
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Vercel API Error:", error.response?.data || error.message);
      throw error;
    }
  },

  checkDomainStatus: async (domain: string) => {
    const url = `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });
      return response.data;
    } catch (error) {
      return { verified: false };
    }
  }
};
