import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit3,
  Mail,
  Calendar,
  CheckCircle2,
  X,
  Check,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function SystemTeam() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    email: '', 
    role: 'SUPER_ADMIN', 
    password: '',
    status: 'ACTIVE'
  });

  const fetchAdmins = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        // Na Equipe do Sistema, focamos nos Super Admins e Staff Global
        setAdmins(data.filter((u: any) => u.role === 'SUPER_ADMIN' || !u.organizationId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const method = formData.id ? 'PATCH' : 'POST';
      const url = formData.id ? `/api/admin/users/${formData.id}` : '/api/admin/users';
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchAdmins();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao salvar usuário");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este administrador?")) return;
    try {
      const res = await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchAdmins();
      else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipe do Sistema [GESTÃO]</h1>
          <p className="text-sm text-gray-500">Gerencie os administradores e moderadores globais da plataforma.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: '', name: '', email: '', role: 'SUPER_ADMIN', password: '', status: 'ACTIVE' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
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
            <div className={`absolute top-0 left-0 w-1 h-full ${admin.role === 'SUPER_ADMIN' ? 'bg-red-600' : 'bg-blue-600'}`} />
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 rounded-2xl ${admin.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center font-bold text-lg`}>
                {admin.name ? admin.name[0] : '?'}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{admin.name || 'Sem Nome'}</h4>
                <div className={`flex items-center gap-1 ${admin.role === 'SUPER_ADMIN' ? 'text-red-600' : 'text-blue-600'} text-[10px] font-bold uppercase tracking-wider`}>
                  <Shield size={10} />
                  <span>{admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff Global'}</span>
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
                 <span>ACESSO LIBERADO</span>
               </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setFormData({ ...admin, password: '' });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(admin.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Criar/Editar Administrador */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">{formData.id ? "Editar" : "Novo"} Administrador</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome</label>
                <input 
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Nome do Admin"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">E-mail</label>
                <input 
                  required
                  type="email"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="admin@nexus360.com.br"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cargo Global</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="SUPER_ADMIN">Super Admin (Acesso Total)</option>
                  <option value="USER">Staff (Acesso Limitado ao Sistema)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{formData.id ? "Nova Senha (opcional)" : "Senha de Acesso"}</label>
                <input 
                  required={!formData.id}
                  type="password"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="********"
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  <span>{formData.id ? "Salvar" : "Criar"}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
