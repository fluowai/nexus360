import { Users, Mail, Shield, MoreVertical } from "lucide-react";

export default function Team() {
  const members = [
    { name: 'Felipe Dantas', role: 'Gestor de Tráfego', email: 'felipe@nexus.com', status: 'Online', avatar: 'Felix' },
    { name: 'Letícia Lima', role: 'Copywriter Sênior', email: 'leticia@nexus.com', status: 'Em reunião', avatar: 'Lilly' },
    { name: 'Ricardo Dias', role: 'Creative Designer', email: 'ricardo@nexus.com', status: 'Ausente', avatar: 'Bear' },
    { name: 'Sarah Jones', role: 'Social Media', email: 'sarah@nexus.com', status: 'Online', avatar: 'Sasha' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Equipe</h1>
          <p className="text-gray-500">Membros da agência e controle de acessos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m, i) => (
          <div key={i} className="glass-card flex flex-col items-center text-center p-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-50 p-1 border-2 border-primary/20 mb-4 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.avatar}`} alt="avatar" />
              </div>
              <div className={`absolute bottom-5 right-1 w-4 h-4 rounded-full border-2 border-white ${m.status === 'Online' ? 'bg-green-500' : m.status === 'Ausente' ? 'bg-orange-500' : 'bg-gray-400'}`} />
            </div>
            
            <h3 className="font-bold text-lg text-gray-900">{m.name}</h3>
            <p className="text-sm text-primary font-medium mb-4">{m.role}</p>
            
            <div className="flex flex-col gap-3 w-full border-y border-gray-50 py-6 my-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>{m.email}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Shield size={14} />
                  <span>Admin do Sistema</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full mt-4">
              <button className="flex-1 py-2 bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors">Perfil</button>
              <button className="p-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
