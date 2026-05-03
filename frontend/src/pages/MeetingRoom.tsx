import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Shield,
  Copy,
  Check,
  Users,
  ExternalLink
} from "lucide-react";
import { motion } from "motion/react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [jitsiApi, setJitsiApi] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  const userName = localStorage.getItem('nexus_user_name') || 'Participante';
  const meetingUrl = `${window.location.origin}/meet/${roomName}`;

  useEffect(() => {
    // Carregar o script do Jitsi
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = () => initJitsi();
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (jitsiApi) {
        jitsiApi.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const initJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
      roomName: `nexus360-${roomName}`,
      parentNode: jitsiContainerRef.current,
      width: '100%',
      height: '100%',
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        disableThirdPartyRequests: true,
        enableWelcomePage: false,
        enableClosePage: false,
        hideConferenceSubject: false,
        hideConferenceTimer: false,
        subject: `Nexus Meet - ${roomName}`,
        defaultLanguage: 'pt',
        toolbarButtons: [
          'microphone', 'camera', 'desktop', 'chat', 
          'raisehand', 'participants-pane', 'tileview',
          'select-background', 'fullscreen', 'recording'
        ],
      },
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        TOOLBAR_ALWAYS_VISIBLE: true,
        DEFAULT_BACKGROUND: '#0F1115',
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        APP_NAME: 'Nexus Meet',
        NATIVE_APP_NAME: 'Nexus Meet',
        PROVIDER_NAME: 'Nexus360',
      },
      userInfo: {
        displayName: userName,
      }
    });

    // Eventos
    api.addEventListener('readyToClose', () => {
      const slug = localStorage.getItem('nexus_org_slug');
      if (slug) {
        navigate(`/${slug}/calendar`);
      } else {
        navigate('/calendar');
      }
    });

    api.addEventListener('participantJoined', () => {
      setParticipantCount(prev => prev + 1);
    });

    api.addEventListener('participantLeft', () => {
      setParticipantCount(prev => Math.max(1, prev - 1));
    });

    api.addEventListener('videoConferenceJoined', () => {
      setLoading(false);
    });

    setJitsiApi(api);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between z-10 bg-[#1A1D23] border-b border-gray-800/50">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Nexus Meet</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
              Sala: {roomName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Users size={14} />
            <span>{participantCount} participante{participantCount > 1 ? 's' : ''}</span>
          </div>

          <div className="h-4 w-[1px] bg-gray-700" />

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all text-xs font-medium"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-400" />
                <span className="text-green-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar Link</span>
              </>
            )}
          </button>

          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-800 rounded-lg transition-all text-gray-400"
            title="Abrir em nova aba"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Jitsi Container */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#0F1115]">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mb-6"
            >
              <Shield size={36} className="text-primary" />
            </motion.div>
            <h2 className="text-lg font-bold mb-2">Conectando ao Nexus Meet...</h2>
            <p className="text-sm text-gray-500">Preparando sua sala de reunião segura</p>
          </div>
        )}
        <div 
          ref={jitsiContainerRef} 
          className="w-full h-full"
          style={{ display: loading ? 'none' : 'block' }}
        />
      </div>
    </div>
  );
}
