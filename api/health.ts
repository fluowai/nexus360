import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../src/lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const env = {
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      JWT_SECRET: Boolean(process.env.JWT_SECRET),
      NODE_ENV: process.env.NODE_ENV,
    };

    // Teste de query simples no banco
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: 'API Nexus360 online',
      env,
      database: 'connected',
    });
  } catch (error) {
    console.error('[HEALTH_ERROR]', error);

    return res.status(500).json({
      success: false,
      error: 'API ou banco com erro',
      details: String(error),
    });
  }
}
