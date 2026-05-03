import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, LogOut, Video, Copy, Check } from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { apiFetch } from "../lib/api";

export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const userName = localStorage.getItem('nexus_user_name') || 'Participante';
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  useEffect(() => {
    // Buscar o token do backend (Segurança 100% no nosso lado)
    const fetchToken = async () => {
      try {
        const response = await apiFetch('/api/livekit/token', {
          method: 'POST',
          body: JSON.stringify({
            roomName: `nexus-360-${roomName}`,
            participantName: userName,
          })
        });
        
        if (!response.ok) {
          throw new Error('Falha na autenticação da sala');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        console.error("Erro ao buscar token:", err);
        setError("Não foi possível gerar a credencial da sala segura.");
      }
    };

    if (roomName) {
      fetchToken();
    }
  }, [roomName, userName]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!livekitUrl) {
    return (
      <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Configuração Ausente</h2>
        <p className="text-gray-400 max-w-md">
          A URL do LiveKit (VITE_LIVEKIT_URL) não foi configurada nas variáveis de ambiente.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center p-6 text-center">
        <Shield size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Erro de Conexão</h2>
        <p className="text-gray-400 mb-6 max-w-md">{error}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary rounded-lg font-bold">Voltar</button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center z-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
        <p className="text-gray-400 text-sm">Gerando credenciais seguras de ponta-a-ponta...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col overflow-hidden custom-livekit-theme">
      {/* Header Nexus */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#1A1D23] border-b border-gray-800/50 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Nexus Meet Pro (LiveKit)</span>
        </div>
        
        <div className="flex gap-4 items-center">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-xs font-bold"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className={copied ? "text-green-500" : ""}>{copied ? 'Link Copiado!' : 'Copiar Link para Cliente'}</span>
          </button>

          <div className="w-[1px] h-6 bg-gray-700"></div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-xs font-bold shadow-lg shadow-red-500/20"
          >
            <LogOut size={14} />
            <span>Encerrar Reunião</span>
          </button>
        </div>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 relative bg-black">
        <LiveKitRoom
          video={false} // Inicialmente desligado para testar permissão suavemente (ou true)
          audio={false}
          token={token}
          serverUrl={livekitUrl}
          data-lk-theme="default"
          style={{ height: '100vh', width: '100vw' }}
          onDisconnected={() => navigate(-1)}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
