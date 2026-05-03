import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, LogOut, Video, Copy, Check } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

// VERSÃO 3.0 - SERVIDOR ABERTO & SENHA AUTOMÁTICA
export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);

  // Usamos o domínio meet.ffmuc.net (Um servidor robusto na Alemanha que usa Jitsi mas NÃO EXIGE LOGIN do Google/Github)
  const JITSI_DOMAIN = 'meet.ffmuc.net';

  useEffect(() => {
    const oldScript = document.getElementById('jitsi-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'jitsi-script';
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => {
      setIsReady(true);
      initJitsi();
    };
    document.body.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [roomName]);

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI || apiRef.current) return;

    const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: `nexus-360-pro-${roomName}`,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: true, // Habilitamos a página de entrada para o usuário testar a câmera antes de entrar
        disableDeepLinking: true,
        defaultLanguage: 'pt',
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_POWERED_BY: false,
        DEFAULT_BACKGROUND: '#0F1115',
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'chat', 'raisehand',
          'tileview', 'fullscreen', 'hangup', 'settings'
        ],
      }
    });

    api.addEventListener('readyToClose', () => {
      navigate(-1);
    });

    // Quando a sala é criada, podemos definir uma senha se precisarmos no futuro
    // api.addEventListener('participantRoleChanged', (event: any) => {
    //   if (event.role === 'moderator') {
    //      api.executeCommand('password', 'SENHA_AQUI');
    //   }
    // });

    apiRef.current = api;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col overflow-hidden">
      {/* Header Minimalista */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#1A1D23] border-b border-gray-800/50 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Nexus Meet</span>
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
            <span>Encerrar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-black">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F1115] z-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary mb-4"></div>
            <p className="text-gray-400 text-sm">Iniciando servidor seguro...</p>
          </div>
        )}
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
}
