import { useEffect, useRef } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track } from "livekit-client";
import { apiFetch } from "../lib/api";

export function TranscriptionEngine({ onNewTranscript }: { onNewTranscript: (text: string, sender: string) => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    // Escuta mensagens de transcrição de outros participantes na sala via WebRTC
    const handleData = (payload: Uint8Array, participant: any) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      
      try {
        const data = JSON.parse(message);
        if (data.type === 'TRANSCRIPT') {
          onNewTranscript(data.text, participant?.identity || 'Desconhecido');
        }
      } catch (e) {
        // Ignora pacotes que não sejam de transcrição
      }
    };

    room.on('dataReceived', handleData);
    return () => {
      room.off('dataReceived', handleData);
    };
  }, [room, onNewTranscript]);

  useEffect(() => {
    const startTranscriptionLoop = async () => {
      if (!localParticipant) return;

      // Pega a faixa de áudio do microfone do próprio usuário
      const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack?.mediaStreamTrack;
      if (!audioTrack || audioTrack.readyState !== "live") return;

      if (isRecordingRef.current) return;

      try {
        const stream = new MediaStream([audioTrack]);
        
        // Verifica volume usando AudioContext para evitar enviar silêncio absoluto para o Groq
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          source.connect(analyserRef.current);
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = mediaRecorder;
        isRecordingRef.current = true;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          isRecordingRef.current = false;
          if (chunksRef.current.length === 0) return;

          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          chunksRef.current = [];

          // Pega o volume médio para ver se alguém falou
          let isSpeaking = true;
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;
            if (average < 2) isSpeaking = false; // Silêncio
          }

          if (isSpeaking && audioBlob.size > 3000) { // Envia apenas se for áudio real
            processAudio(audioBlob);
          }

          // Inicia o próximo ciclo imediatamente
          startTranscriptionLoop();
        };

        // Grava blocos de 6 segundos e envia
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 6000);

      } catch (e) {
        console.error("Erro ao iniciar gravador de transcrição", e);
      }
    };

    const interval = setInterval(() => {
      if (!isRecordingRef.current) {
        startTranscriptionLoop();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [localParticipant]);

  const processAudio = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        
        const response = await apiFetch('/api/ai/transcribe', {
          method: 'POST',
          body: JSON.stringify({
            audioBase64: base64data,
            mimeType: 'audio/webm'
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.text?.trim();
          
          // Filtra alucinações comuns do modelo Whisper em silêncio
          const hallucinations = ["Obrigado.", "Obrigado por assistir!", "Legendado por", "Tradução de", "Até a próxima."];
          const isHallucination = hallucinations.some(h => text.includes(h)) && text.length < 30;

          if (text && text.length > 2 && !isHallucination) {
            // Notifica interface local
            onNewTranscript(text, localParticipant.identity);

            // Envia para o resto da sala
            const payload = JSON.stringify({ type: 'TRANSCRIPT', text });
            const encoder = new TextEncoder();
            room.localParticipant.publishData(encoder.encode(payload), { reliable: true });
          }
        }
      };
    } catch (e) {
      console.error("Falha ao enviar áudio para transcrição", e);
    }
  };

  return null; // Motor invisível
}
