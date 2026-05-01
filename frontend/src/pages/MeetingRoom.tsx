import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  ScreenShare, 
  Settings, 
  MessageSquare, 
  Users, 
  MoreVertical,
  Shield,
  Maximize
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function MeetingRoom() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLeave = () => {
    if (confirm("Deseja sair da reunião?")) {
      navigate('/calendar');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1115] text-white flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">{roomName?.toUpperCase()}</h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Nexus360 Secure Meeting</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-sm font-medium text-gray-400">{time}</div>
          <div className="h-4 w-[1px] bg-gray-800" />
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0F1115] bg-gray-700 flex items-center justify-center overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="participant" />
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-[#0F1115] bg-gray-800 flex items-center justify-center text-[10px] font-bold">
              +5
            </div>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {/* Main User (You) */}
          <div className="relative bg-[#1A1D23] rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl group">
            {isCamOn ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=60" 
                  className="w-full h-full object-cover opacity-80"
                  alt="You"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#1A1D23]">
                <div className="w-32 h-32 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl font-bold text-primary">
                  A
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isMicOn ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-bold">Você (Agência Alpha)</span>
            </div>
            <button className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60">
              <Maximize size={16} />
            </button>
          </div>

          {/* Other Participants (Mocks) */}
          {[
            { name: "Carlos - Lead Qualificado", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=60" },
            { name: "Mariana Silva", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=60" },
            { name: "Roberto Santos", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop&q=60" },
            { name: "Luciana Costa", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&auto=format&fit=crop&q=60" },
          ].map((user, i) => (
            <div key={i} className="relative bg-[#1A1D23] rounded-3xl overflow-hidden border border-gray-800/50 shadow-2xl group">
               <img src={user.img} className="w-full h-full object-cover" alt={user.name} />
               <div className="absolute inset-0 bg-black/10" />
               <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-bold">{user.name}</span>
              </div>
            </div>
          ))}

          {/* Screen Share Mock (Optional) */}
          <div className="relative bg-primary/5 rounded-3xl overflow-hidden border border-primary/20 flex flex-col items-center justify-center gap-4 group">
            <div className="p-6 bg-primary/10 rounded-full text-primary">
              <ScreenShare size={48} />
            </div>
            <p className="text-sm font-bold text-primary/80 uppercase tracking-widest">Aguardando Apresentação</p>
          </div>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-80 bg-[#1A1D23] rounded-3xl border border-gray-800 flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-bold">Chat da Reunião</h2>
                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
                <div className="bg-gray-800/50 p-3 rounded-2xl rounded-tl-none">
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase">Carlos</p>
                  <p className="text-xs text-gray-300">Olá! Conseguem me ouvir bem?</p>
                </div>
                <div className="bg-primary/20 p-3 rounded-2xl rounded-tr-none self-end text-right border border-primary/20">
                  <p className="text-[10px] font-bold text-primary mb-1 uppercase">Você</p>
                  <p className="text-xs text-blue-100">Sim, Carlos. O áudio está perfeito.</p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-800">
                <input 
                  type="text" 
                  placeholder="Enviar mensagem..." 
                  className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Bar */}
      <div className="h-24 px-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button className="p-3 hover:bg-gray-800 rounded-xl transition-all text-gray-400">
            <MoreVertical size={20} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-4 rounded-2xl transition-all shadow-lg ${isMicOn ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
          >
            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <button 
            onClick={() => setIsCamOn(!isCamOn)}
            className={`p-4 rounded-2xl transition-all shadow-lg ${isCamOn ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
          >
            {isCamOn ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all shadow-lg">
            <ScreenShare size={24} />
          </button>

          <button 
            onClick={handleLeave}
            className="p-4 bg-red-500 hover:bg-red-600 rounded-2xl transition-all shadow-lg shadow-red-500/40 ml-4"
          >
            <PhoneOff size={24} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={`p-4 rounded-2xl transition-all ${showChat ? 'bg-primary text-white shadow-primary/20' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}
          >
            <MessageSquare size={20} />
          </button>
          <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all text-gray-400">
            <Users size={20} />
          </button>
          <button className="p-4 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all text-gray-400">
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
