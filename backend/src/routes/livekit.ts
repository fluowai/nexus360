import express from 'express';
import { AccessToken } from 'livekit-server-sdk';

const router = express.Router();

router.post('/token', async (req, res) => {
  try {
    const { roomName, participantName } = req.body;

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'roomName and participantName are required' });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit credentials not configured on server' });
    }

    // Criar um novo token de acesso para o LiveKit
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });
    
    // Conceder permissão para entrar na sala específica
    at.addGrant({ roomJoin: true, room: roomName });

    // Gerar o JWT assinado
    const token = await at.toJwt();
    
    res.json({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate secure token' });
  }
});

export default router;
