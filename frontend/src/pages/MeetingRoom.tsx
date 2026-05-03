import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Shield, LogOut, Video } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

// VERSÃO 2.0 - CORREÇÃO DE CACHE E VÍDEO DIRETO
export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Forçar a remoção de qualquer script antigo do Jitsi
    const oldScript = document.getElementById('jitsi-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'jitsi-script';
    script.src = 'https://meet.jit.si/external_api.js';
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

    const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: `nexus-v2-${roomName}`,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
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

    apiRef.current = api;
  };

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col overflow-hidden">
      {/* Header Minimalista */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#1A1D23] border-b border-gray-800/50 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Video size={18} className="text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">Nexus Meet 2.0</span>
        </div>
        
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all text-xs font-bold shadow-lg shadow-red-500/20"
        >
          <LogOut size={14} />
          <span>Encerrar Reunião</span>
        </button>
      </div>

      <div className="flex-1 relative bg-black">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0F1115] z-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
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
