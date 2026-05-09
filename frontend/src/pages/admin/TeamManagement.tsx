import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, XCircle, Settings, Mail, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function TeamManagement() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPermsModal, setShowPermsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const fetchMembers = async () => {
    try {
      const res = await apiFetch('/api/team/members');
      const data = await res.json();
      setMembers(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleUpdatePermissions = async (userId: string, permissions: any) => {
    try {
      await apiFetch(`/api/team/members/${userId}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions })
      });
      fetchMembers();
      setShowPermsModal(false);
    } catch (err) { console.error(err); }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Excluir este membro?')) return;
    try {
      await apiFetch(`/api/team/members/${id}`, { method: 'DELETE' });
      fetchMembers();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestão de Equipe</h1>
          <p className="text-gray-500 font-medium">Controle de acessos e membros da sua agência.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/20"
        >
          <UserPlus size={20} /> Convocar Membro
        </button>
      </header>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Membro</th>
              <th className="px-6 py-4">Função</th>
              <th className="px-6 py-4">Permissões</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((user) => (
              <tr key={user.id} className="group hover:bg-gray-50/30 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                      {user.name?.[0] || user.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{user.name || 'Sem nome'}</p>
                      <p className="text-[10px] font-medium text-gray-400 flex items-center gap-1"><Mail size={10} /> {user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    user.role === 'ORG_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.permissions && Object.keys(user.permissions).map(p => (
                      <span key={p} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase">{p}</span>
                    ))}
                    {(!user.permissions || Object.keys(user.permissions).length === 0) && (
                      <span className="text-[10px] text-gray-400 italic">Sem restrições</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedUser(user); setShowPermsModal(true); }}
                      className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(user.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Permissões */}
      <AnimatePresence>
        {showPermsModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden p-8">
              <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <ShieldCheck className="text-primary" /> Permissões: {selectedUser.name || selectedUser.email}
              </h2>
              
              <div className="space-y-4 mb-8">
                {['leads', 'crm', 'finance', 'marketing', 'settings'].map(resource => (
                  <div key={resource} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <span className="text-sm font-black text-gray-700 uppercase tracking-wider">{resource}</span>
                    <input 
                      type="checkbox"
                      checked={!!selectedUser.permissions?.[resource]}
                      onChange={(e) => {
                        const newPerms = { ...selectedUser.permissions };
                        if (e.target.checked) newPerms[resource] = '*';
                        else delete newPerms[resource];
                        setSelectedUser({ ...selectedUser, permissions: newPerms });
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowPermsModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl">Cancelar</button>
                <button onClick={() => handleUpdatePermissions(selectedUser.id, selectedUser.permissions)} className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20">Salvar Acessos</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
