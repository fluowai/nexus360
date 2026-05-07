import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3,
  Mail,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function SystemTeam() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const fetchAdmins = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) setAdmins(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe do Sistema</h1>
          <p className="text-sm text-gray-500">Gerencie os administradores e moderadores globais da plataforma.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200">
          <UserPlus size={20} />
          <span>Novo Administrador</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-400">Carregando equipe...</p>
        ) : admins.map((admin, i) => (
          <motion.div 
            key={admin.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600" />
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg">
                {admin.name[0]}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{admin.name}</h4>
                <div className="flex items-center gap-1 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                  <Shield size={10} />
                  <span>Super Admin</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail size={14} className="text-gray-400" />
                <span>{admin.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={14} className="text-gray-400" />
                <span>Ativo desde {new Date(admin.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
               <div className="flex items-center gap-1 text-emerald-500 text-[10px] font-bold">
                 <CheckCircle2 size={12} />
                 <span>ACESSO TOTAL</span>
               </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditData({...admin, password: ''});
                      setIsEditing(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Modal Editar Usuário */}
      {isEditing && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Administrador</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await apiFetch(`/api/admin/users/${editData.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify(editData)
                });
                if (res.ok) {
                  setIsEditing(false);
                  fetchAdmins();
                }
              } catch (err) { console.error(err); }
            }} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">E-mail</label>
                <input 
                  required
                  type="email"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.email}
                  onChange={e => setEditData({...editData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nova Senha (deixe vazio para manter)</label>
                <input 
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={editData.password}
                  onChange={e => setEditData({...editData, password: e.target.value})}
                  placeholder="********"
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
