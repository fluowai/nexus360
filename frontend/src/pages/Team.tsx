import { useState, useEffect } from "react";
import { Users, Mail, Shield, MoreVertical, Plus, Loader2, X, Check } from "lucide-react";
import { apiFetch } from "../lib/api";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'USER', department: 'GERAL' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchMembers = async () => {
    try {
      const res = await apiFetch('/api/settings/team');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error("Error fetching team:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch('/api/settings/team', {
        method: 'POST',
        body: JSON.stringify(newMember)
      });
      setIsModalOpen(false);
      setNewMember({ name: '', email: '', role: 'USER' });
      fetchMembers();
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberData, setEditMemberData] = useState<any>(null);

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await apiFetch(`/api/settings/team/${editMemberData.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editMemberData)
      });
      setIsEditingMember(false);
      fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Remover este membro da equipe?")) return;
    try {
      await apiFetch(`/api/settings/team/${id}`, { method: 'DELETE' });
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Equipe</h1>
          <p className="text-gray-500">Membros da agência e controle de acessos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200"
        >
          <Plus size={18} />
          <span>Adicionar Membro</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((m) => (
          <div key={m.id} className="glass-card flex flex-col items-center text-center p-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-blue-50 p-1 border-2 border-primary/20 mb-4 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt="avatar" />
              </div>
              <div className={`absolute bottom-5 right-1 w-4 h-4 rounded-full border-2 border-white bg-green-500`} />
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
                  <span>{m.role === 'ORG_ADMIN' ? 'Administrador' : 'Colaborador'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full mt-4">
              <button 
                onClick={() => {
                  setEditMemberData({ ...m, password: '' });
                  setIsEditingMember(true);
                }}
                className="flex-1 py-2 bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Editar
              </button>
              <button 
                onClick={() => handleDeleteMember(m.id)}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDITAR MEMBRO */}
      {isEditingMember && editMemberData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Editar Membro</h2>
              <button onClick={() => setIsEditingMember(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                <input 
                  required
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={editMemberData.name}
                  onChange={e => setEditMemberData({...editMemberData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input 
                  required
                  type="email"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={editMemberData.email}
                  onChange={e => setEditMemberData({...editMemberData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nova Senha (deixe vazio para manter)</label>
                <input 
                  type="password"
                  placeholder="********"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  value={editMemberData.password}
                  onChange={e => setEditMemberData({...editMemberData, password: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cargo / Permissão</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={editMemberData.role}
                  onChange={e => setEditMemberData({...editMemberData, role: e.target.value})}
                >
                  <option value="USER">Colaborador</option>
                  <option value="ORG_ADMIN">Administrador da Agência</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Setor / Agenda</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={editMemberData.department}
                  onChange={e => setEditMemberData({...editMemberData, department: e.target.value})}
                >
                  <option value="GERAL">Geral</option>
                  <option value="BDR">BDR</option>
                  <option value="SDR">SDR</option>
                  <option value="CLOSER">Closer</option>
                  <option value="MKT">Marketing</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>}
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR MEMBRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Novo Membro</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMember.name}
                  onChange={e => setNewMember({...newMember, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">E-mail</label>
                <input 
                  required
                  type="email" 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMember.email}
                  onChange={e => setNewMember({...newMember, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Cargo / Permissão</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMember.role}
                  onChange={e => setNewMember({...newMember, role: e.target.value})}
                >
                  <option value="USER">Colaborador</option>
                  <option value="ORG_ADMIN">Administrador da Agência</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Setor / Agenda</label>
                <select 
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                  value={newMember.department}
                  onChange={e => setNewMember({...newMember, department: e.target.value})}
                >
                  <option value="GERAL">Geral</option>
                  <option value="BDR">BDR</option>
                  <option value="SDR">SDR</option>
                  <option value="CLOSER">Closer</option>
                  <option value="MKT">Marketing</option>
                </select>
              </div>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Check size={20}/>}
                Salvar Membro
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
