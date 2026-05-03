import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, LogOut, Video, Copy, Check, BrainCircuit, CheckCircle, AlertTriangle, ListTodo } from "lucide-react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { apiFetch } from "../lib/api";
import { TranscriptionEngine } from "../components/TranscriptionEngine";

// Componente interno para ter acesso ao contexto da sala
function MeetingContent({ 
  onNewTranscript 
}: { 
  onNewTranscript: (text: string, sender: string) => void 
}) {
  const [subtitle, setSubtitle] = useState<{text: string, sender: string} | null>(null);

  const handleTranscript = (text: string, sender: string) => {
    setSubtitle({ text, sender });
    onNewTranscript(text, sender);
  };

  useEffect(() => {
    if (!subtitle) return;
    const timer = setTimeout(() => setSubtitle(null), 5000);
    return () => clearTimeout(timer);
  }, [subtitle]);

  return (
    <>
      <VideoConference />
      <RoomAudioRenderer />
      <TranscriptionEngine onNewTranscript={handleTranscript} />
      
      {/* Overlay de Legendas VibeCoding */}
      {subtitle && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-xl text-white px-8 py-4 rounded-3xl max-w-3xl text-center shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 border border-gray-700/50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <span className="text-primary font-bold mr-3 text-sm uppercase tracking-wider">{subtitle.sender}</span>
          <span className="text-xl font-medium tracking-tight leading-relaxed">{subtitle.text}</span>
        </div>
      )}
    </>
  );
}

export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  
  // Estados para o Supervisor IA
  const [fullTranscript, setFullTranscript] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const userName = localStorage.getItem('nexus_user_name') || 'Participante';
  const livekitUrl = import.meta.env.VITE_LIVEKIT_URL;

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await apiFetch('/api/livekit/token', {
          method: 'POST',
          body: JSON.stringify({
            roomName: `nexus-360-${roomName}`,
            participantName: userName,
          })
        });
        
        if (!response.ok) throw new Error('Falha na autenticação da sala');

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        setError("Não foi possível gerar a credencial da sala segura.");
      }
    };
    if (roomName) fetchToken();
  }, [roomName, userName]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appendTranscript = (text: string, sender: string) => {
    setFullTranscript(prev => prev + `\n[${new Date().toLocaleTimeString()}] ${sender}: ${text}`);
  };

  const handleEndMeeting = async () => {
    // Se não teve conversa suficiente, sai direto
    if (fullTranscript.length < 50) {
      navigate(-1);
      return;
    }

    setShowFeedback(true);
    setIsAnalyzing(true);

    try {
      const response = await apiFetch('/api/ai/meeting-feedback', {
        method: 'POST',
        body: JSON.stringify({ transcript: fullTranscript })
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeedbackData(data.feedback);
      }
    } catch (e) {
      console.error("Erro na análise", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -----------------------------------------------------
  // TELA DE FEEDBACK DO SUPERVISOR (Pós-reunião)
  // -----------------------------------------------------
  if (showFeedback) {
    return (
      <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
        <div className="max-w-4xl w-full bg-[#1A1D23] rounded-3xl p-8 border border-gray-800 shadow-2xl relative">
          
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 p-4 rounded-2xl shadow-lg shadow-primary/30">
            <BrainCircuit size={32} className="text-white" />
          </div>

          <h2 className="text-3xl font-bold text-center mt-6 mb-2">Análise do Supervisor IA</h2>
          <p className="text-gray-400 text-center mb-10">Processado via Groq Llama-3 (Ultra-Speed)</p>

          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-6"></div>
              <p className="text-xl font-medium animate-pulse">Lendo transcrição e gerando insights...</p>
              <p className="text-sm text-gray-500 mt-2">Isso leva apenas alguns segundos</p>
            </div>
          ) : feedbackData ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><CheckCircle className="text-green-400"/> Resumo Executivo</h3>
                <p className="text-gray-300 leading-relaxed">{feedbackData.resumo}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">Pontos Fortes</h3>
                  <ul className="space-y-3">
                    {feedbackData.pontosFortes?.map((pt: string, i: number) => (
                      <li key={i} className="flex gap-3 text-gray-300"><span className="text-green-500 mt-1">•</span> {pt}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><AlertTriangle size={20}/> Pontos de Melhoria</h3>
                  <ul className="space-y-3">
                    {feedbackData.pontosMelhoria?.map((pt: string, i: number) => (
                      <li key={i} className="flex gap-3 text-gray-300"><span className="text-red-500 mt-1">•</span> {pt}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20">
                <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2"><ListTodo size={20}/> Próximos Passos</h3>
                <ul className="space-y-3">
                  {feedbackData.proximosPassos?.map((pt: string, i: number) => (
                    <li key={i} className="flex gap-3 text-gray-300"><span className="text-blue-500 mt-1">→</span> {pt}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 text-center">
                <button onClick={() => navigate(-1)} className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/25 transition-all hover:scale-105">
                  Salvar e Voltar ao Dashboard
                </button>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 text-red-400">Falha ao gerar análise.</div>
          )}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // TELAS DE ERRO / LOADING
  // -----------------------------------------------------
  if (!livekitUrl) return <div className="fixed inset-0 bg-[#0F1115] text-white flex items-center justify-center p-6 text-center">Sem configuração de LiveKit</div>;
  if (error) return <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center p-6 text-center"><Shield size={48} className="text-red-500 mb-4" /><h2 className="text-xl font-bold mb-2">Erro</h2><p className="text-gray-400 mb-6">{error}</p><button onClick={() => navigate(-1)} className="px-6 py-2 bg-primary rounded-lg font-bold">Voltar</button></div>;
  if (!token) return <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col items-center justify-center z-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div><p className="text-gray-400 text-sm">Gerando credenciais seguras...</p></div>;

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col overflow-hidden custom-livekit-theme">
      {/* Header Nexus */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#1A1D23] border-b border-gray-800/50 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Nexus Meet Pro <span className="text-xs font-normal text-gray-400 ml-2 border border-gray-700 px-2 py-0.5 rounded-full">AI Transcription On</span></span>
        </div>
        
        <div className="flex gap-4 items-center">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all text-xs font-bold">
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            <span className={copied ? "text-green-500" : ""}>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>
          <div className="w-[1px] h-6 bg-gray-700"></div>
          {/* Botão de Encerrar Customizado que aciona a IA */}
          <button onClick={handleEndMeeting} className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-red-500/20">
            <BrainCircuit size={16} />
            <span>Encerrar & Analisar IA</span>
          </button>
        </div>
      </div>

      {/* LiveKit Room */}
      <div className="flex-1 relative bg-black">
        <LiveKitRoom
          video={false} 
          audio={false}
          token={token}
          serverUrl={livekitUrl}
          data-lk-theme="default"
          style={{ height: '100vh', width: '100vw' }}
          onDisconnected={handleEndMeeting}
        >
          <MeetingContent onNewTranscript={appendTranscript} />
        </LiveKitRoom>
      </div>
    </div>
  );
}
