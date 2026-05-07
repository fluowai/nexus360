import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaClient } from '@prisma/client';

const scheduledMeetings = new Map<string, any>();

export function livekitRoutes(prisma: PrismaClient) {
  const router = express.Router();

  router.post('/schedule', async (req, res) => {
    const { title, date, guests } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const roomId = `room-${Math.random().toString(36).substring(7)}`;

    const meeting = {
      id: roomId,
      title,
      date,
      code,
      guests: guests.map((g: any) => ({ ...g, status: 'invited' }))
    };

    scheduledMeetings.set(code, meeting);
    res.json({ success: true, code, roomId, link: `/meet/${roomId}?code=${code}` });
  });

  router.post('/validate-code', async (req, res) => {
    const { code, email } = req.body;
    
    // 1. Procurar em memória (agendamentos rápidos)
    let meeting = scheduledMeetings.get(code);

    // 2. Se não achou, procurar no banco de dados (Agenda)
    if (!meeting) {
      const dbEvent = await prisma.calendarEvent.findFirst({
        where: {
          meetingLink: { contains: `code=${code}` }
        }
      });

      if (dbEvent) {
        meeting = {
          id: dbEvent.meetingLink?.split('?')[0].split('/').pop(),
          title: dbEvent.title,
          code: code,
          guests: []
        };
      }
    }

    if (!meeting) {
      return res.status(404).json({ error: 'Reunião não encontrada ou código expirado.' });
    }

    res.json({ valid: true, meeting });
  });

  router.post('/token', async (req, res) => {
    try {
      const { roomName, participantName } = req.body;
      if (!roomName || !participantName) return res.status(400).json({ error: 'roomName and participantName are required' });

      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      
      if (!apiKey || !apiSecret) {
        console.error("[LIVEKIT_ERROR] Credenciais ausentes no .env: LIVEKIT_API_KEY ou LIVEKIT_API_SECRET");
        return res.status(500).json({ error: 'LiveKit credentials not configured on server' });
      }

      const at = new AccessToken(apiKey, apiSecret, { identity: participantName, name: participantName });
      at.addGrant({ roomJoin: true, room: roomName });
      const token = await at.toJwt();
      res.json({ token });
    } catch (error) {
      console.error('[LIVEKIT_TOKEN_ERROR]', error);
      res.status(500).json({ error: 'Failed to generate token' });
    }
  });

  return router;
}
