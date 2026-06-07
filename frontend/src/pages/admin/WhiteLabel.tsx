import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Palette,
  Globe,
  Image as ImageIcon,
  Save,
  Smartphone,
  Layout,
  Type,
  Building2,
  Plus,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  RefreshCw,
  Lock,
  Loader2,
  Monitor
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

interface WhitelabelBranding {
  name?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function AdminWhiteLabel() {
  const location = useLocation();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    slug: '',
    domain: '',
    plan: 'Pro',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
  });

  const [branding, setBranding] = useState<WhitelabelBranding>({
    name: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
  });

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/orgs?type=WHITELABEL');
      if (res.ok) setOrgs(await res.json());
      else setOrgs([]);
    } catch (err) {
      console.error(err);
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm({ ...form, adminPassword: pass });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch('/api/admin/orgs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          type: 'WHITELABEL',
          whiteLabelConfig: branding,
        })
      });
      if (res.ok) {
        setShowModal(false);
        resetForm();
        fetchOrgs();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao criar white-label");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranding = async () => {
    if (!editingOrg) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/orgs/${editingOrg.id}/whitelabel`, {
        method: 'PATCH',
        body: JSON.stringify({
          whiteLabelConfig: branding,
        })
      });
      if (res.ok) {
        setEditingOrg(null);
        resetForm();
        fetchOrgs();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao atualizar branding");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este white-label? Todos os dados serão excluídos.")) return;
    try {
      const res = await apiFetch(`/api/admin/orgs/${id}`, { method: 'DELETE' });
      if (res.ok) fetchOrgs();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditBranding = async (org: any) => {
    try {
      const res = await apiFetch(`/api/admin/orgs/${org.id}/whitelabel`);
      if (res.ok) {
        const data = await res.json();
        setEditingOrg(data);
        const wl = data.whiteLabelConfig || {};
        setBranding({
          name: wl.name || data.name || '',
          logoUrl: wl.logoUrl || '',
          faviconUrl: wl.faviconUrl || '',
          primaryColor: wl.primaryColor || '#2563eb',
          secondaryColor: wl.secondaryColor || '#1e40af',
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({ name: '', slug: '', domain: '', plan: 'Pro', adminEmail: '', adminPassword: '', adminName: '' });
    setBranding({ name: '', logoUrl: '', faviconUrl: '', primaryColor: '#2563eb', secondaryColor: '#1e40af' });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white rounded-[32px] border border-gray-100 shadow-sm p-1.5 w-fit">
        <Link
          to="/admin/agencies"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            !location.pathname.includes('whitelabel')
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Building2 size={18} />
          Clientes da Agência
        </Link>
        <Link
          to="/admin/whitelabel"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all ${
            location.pathname.includes('whitelabel')
              ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Palette size={18} />
          White-label
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White-label</h1>
          <p className="text-sm text-gray-500">Organizações que revendem o Nexus360 como plataforma própria com marca personalizada.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={20} />
          <span>Novo White-label</span>
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              placeholder="Pesquisar white-label..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <th className="px-8 py-4">White-label</th>
                <th className="px-4 py-4">Branding</th>
                <th className="px-4 py-4">Plano</th>
                <th className="px-4 py-4">Domínio</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Carregando...</td></tr>
              ) : orgs.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-gray-400">Nenhum white-label encontrado.</td></tr>
              ) : orgs.map((org) => {
                const wl = org.whiteLabelConfig || {};
                return (
                  <tr key={org.id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white"
                          style={{ backgroundColor: wl.primaryColor || '#2563eb' }}
                        >
                          {wl.name ? wl.name[0] : org.name[0]}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="font-bold text-gray-900">{wl.name || org.name}</h4>
                          <span className="text-[10px] text-gray-400 font-mono">/{org.slug || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {wl.primaryColor || wl.logoUrl ? (
                        <div className="flex items-center gap-2">
                          {wl.primaryColor && (
                            <div className="w-5 h-5 rounded-md border border-gray-200" style={{ backgroundColor: wl.primaryColor }} />
                          )}
                          {wl.logoUrl && (
                            <img src={wl.logoUrl} alt="" className="w-5 h-5 rounded object-contain" />
                          )}
                          <span className="text-[10px] text-emerald-600 font-bold">Configurado</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">Padrão</span>
                      )}
                    </td>
                    <td className="px-4 py-5">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-purple-100 text-purple-600">
                        {org.planObj?.name || org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      {org.domain ? (
                        <span className="text-[10px] text-emerald-600 font-bold">{org.domain}</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            localStorage.setItem('nexus_selected_client', org.id);
                            window.open('/dashboard', '_blank');
                          }}
                          className="p-2 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-all"
                          title="Acessar como white-label"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => openEditBranding(org)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                          title="Editar Branding"
                        >
                          <Palette size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(org.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                          title="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Novo White-label</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-6">
              {/* Branding Section */}
              <div>
                <h3 className="text-[10px] font-bold text-purple-600 uppercase tracking-[2px] mb-4 flex items-center gap-2">
                  <Palette size={14} /> Identidade Visual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-purple-50/30 rounded-2xl border border-purple-100">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome da Marca</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none"
                      value={branding.name}
                      onChange={e => setBranding({...branding, name: e.target.value})}
                      placeholder="Ex: Marketing Pro"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cor Primária</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        className="w-12 h-12 rounded-xl cursor-pointer border-none"
                        value={branding.primaryColor}
                        onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                      />
                      <input
                        className="flex-1 px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono"
                        value={branding.primaryColor}
                        onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cor Secundária</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        className="w-12 h-12 rounded-xl cursor-pointer border-none"
                        value={branding.secondaryColor}
                        onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                      />
                      <input
                        className="flex-1 px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono"
                        value={branding.secondaryColor}
                        onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">URL da Logo</label>
                    <input
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                      value={branding.logoUrl}
                      onChange={e => setBranding({...branding, logoUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">URL do Favicon</label>
                    <input
                      className="w-full px-4 py-3 bg-white rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                      value={branding.faviconUrl}
                      onChange={e => setBranding({...branding, faviconUrl: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              {/* Org Data */}
              <div>
                <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-[2px] mb-4">Dados da Organização</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome (interno)</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                      value={form.name}
                      onChange={e => setForm({...form, name: e.target.value, slug: e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')})}
                      placeholder="Ex: Marketing Pro Ltda"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Slug</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono text-xs"
                      value={form.slug}
                      onChange={e => setForm({...form, slug: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Domínio Personalizado</label>
                    <input
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono text-xs"
                      value={form.domain}
                      onChange={e => setForm({...form, domain: e.target.value})}
                      placeholder="mkt.cliente.com.br"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Plano</label>
                    <select
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                      value={form.plan}
                      onChange={e => setForm({...form, plan: e.target.value})}
                    >
                      <option value="Free">Free</option>
                      <option value="Pro">Pro</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">E-mail do Admin</label>
                    <input
                      required
                      type="email"
                      className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                      value={form.adminEmail}
                      onChange={e => setForm({...form, adminEmail: e.target.value})}
                      placeholder="admin@mktpro.com.br"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Senha</label>
                    <div className="relative">
                      <input
                        required
                        className="w-full px-4 pr-12 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                        value={form.adminPassword}
                        onChange={e => setForm({...form, adminPassword: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg text-blue-500 transition-colors"
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Criar White-label'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Branding Modal */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 w-full max-w-xl shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                <Monitor size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Branding: {editingOrg.name}</h2>
                <p className="text-xs text-gray-500">Personalize a identidade visual</p>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome da Marca</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none"
                  value={branding.name}
                  onChange={e => setBranding({...branding, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cor Primária</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      className="w-12 h-12 rounded-xl cursor-pointer border-none"
                      value={branding.primaryColor}
                      onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                    />
                    <input
                      className="flex-1 px-3 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                      value={branding.primaryColor}
                      onChange={e => setBranding({...branding, primaryColor: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cor Secundária</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      className="w-12 h-12 rounded-xl cursor-pointer border-none"
                      value={branding.secondaryColor}
                      onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                    />
                    <input
                      className="flex-1 px-3 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                      value={branding.secondaryColor}
                      onChange={e => setBranding({...branding, secondaryColor: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">URL da Logo</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                  value={branding.logoUrl}
                  onChange={e => setBranding({...branding, logoUrl: e.target.value})}
                  placeholder="https://..."
                />
                {branding.logoUrl && (
                  <img src={branding.logoUrl} alt="Preview" className="mt-2 h-10 rounded-lg object-contain border border-gray-100" />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">URL do Favicon</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-purple-400 border-none font-mono text-xs"
                  value={branding.faviconUrl}
                  onChange={e => setBranding({...branding, faviconUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateBranding}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : 'Salvar Branding'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
