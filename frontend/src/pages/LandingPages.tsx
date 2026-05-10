import { useState, useEffect } from "react";
import { 
  FilePlus, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  ExternalLink, 
  BarChart3,
  Globe,
  FormInput,
  Mail,
  Send,
  CheckCircle,
  XCircle,
  Image,
  Video,
  Layout,
  Settings,
  Plus,
  ChevronDown,
  Save,
  Sparkles,
  Loader2,
  Target,
  Trophy,
  Layers
} from "lucide-react";
import { apiFetch } from "../lib/api";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  headline?: string;
  subheadline?: string;
  heroImage?: string;
  content?: string;
  status: string;
  views: number;
  submissions: number;
  conversionRate: number;
  createdAt: string;
}

interface LPForm {
  id: string;
  name: string;
  fields: string;
}

const templates = [
  { id: 'ancora', name: 'Âncora Clean (Verde)', category: 'premium', thumbnail: '/tpl_ancora_preview_1777999470668.png' },
  { id: 'executive', name: 'Executive Gold (Black)', category: 'premium', thumbnail: '/tpl_martins_preview_1777999486712.png' },
  { id: 'modern', name: 'Modern Security (Blue)', category: 'premium', thumbnail: '/tpl_carvalho_preview_1777999500710.png' },
  { id: 'prestige', name: 'Prestige Agility (Navy)', category: 'premium', thumbnail: '/tpl_prestige_preview_1777999516161.png' },
  { id: 'elegance', name: 'Elegance Strategy (Wine)', category: 'premium', thumbnail: '/tpl_elegance_preview_1777999530372.png' },
  { id: 'lead-gen', name: 'Geração de Leads', category: 'standard', thumbnail: '' },
  { id: 'webinar', name: 'Webinar', category: 'standard', thumbnail: '' },
  { id: 'ebook', name: 'Ebook', category: 'standard', thumbnail: '' },
];

export default function LandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [forms, setForms] = useState<LPForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [aiConfig, setAIConfig] = useState({
    companyName: '', description: '', targetAudience: '', goal: '',
    ctaText: 'Quero Saber Mais', phone: '', email: '', whatsapp: '', instagram: '', website: '',
    colorPrimary: '#2563eb', colorSecondary: '#1e40af',
    tone: 'profissional', services: '', differentials: '', testimonials: '',
    sectionsCount: 5, provider: 'groq', logoUrl: ''
  });
  const [generatedIAContent, setGeneratedIAContent] = useState<any>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      setAIConfig(prev => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const orgId = localStorage.getItem('nexus_org_id');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pagesRes, formsRes] = await Promise.all([
        apiFetch(`/api/marketing/landing-pages`),
        apiFetch(`/api/marketing/lp-forms`)
      ]);
      if (!pagesRes.ok) {
        throw new Error(`HTTP ${pagesRes.status}`);
      }
      const pagesData = await pagesRes.json();
      const formsData = await formsRes.json();
      setPages(pagesData);
      setForms(formsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      templateId: formData.get('templateId'),
      headline: formData.get('headline'),
      subheadline: formData.get('subheadline'),
      heroImage: formData.get('heroImage'),
      formId: formData.get('formId'),
      formProvider: formData.get('formProvider')
    };
    
    try {
      const res = await apiFetch('/api/marketing/landing-pages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error("Server error:", err);
        alert("Erro: " + err.error);
        return;
      }
      
      const createdPage = await res.json();
      setShowModal(false);
      
      const premiumIds = ['lawyer', 'creative', 'marketing', 'performance', 'saas'];
      if (premiumIds.includes(payload.templateId as string)) {
        window.location.href = `/landing-editor?id=${createdPage.id}&theme=${payload.templateId}`;
      } else {
        fetchData();
      }
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  const toggleStatus = async (page: LandingPage) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      await apiFetch(`/api/marketing/landing-pages/${page.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating page:", error);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta landing page?')) return;
    try {
      await apiFetch(`/api/marketing/landing-pages/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  const duplicatePage = async (page: LandingPage) => {
    try {
      await apiFetch('/api/marketing/landing-pages', {
        method: 'POST',
        body: JSON.stringify({
          name: page.name + ' (Cópia)',
          slug: page.slug + '-copy',
          templateId: '',
          headline: page.headline,
          subheadline: page.subheadline
        })
      });
      fetchData();
    } catch (error) {
      console.error("Error duplicating page:", error);
    }
  };

  const handleGenerateIA = async () => {
    setIsGeneratingIA(true);
    try {
      const res = await apiFetch('/api/marketing/generate-lp-ia', {
        method: 'POST',
        body: JSON.stringify(aiConfig)
      });
      const data = await res.json();
      
      if (!res.ok) {
        const errorMsg = data.error || 'Erro desconhecido ao gerar com IA';
        if (errorMsg.includes('API Key')) {
          alert('⚠️ Chave de IA não configurada!\n\nVá em Configurações > Configurações de IA e cadastre sua chave do Groq ou Gemini.');
        } else {
          alert('Erro ao gerar: ' + errorMsg);
        }
        setIsGeneratingIA(false);
        return;
      }
      
      // Validate structure
      if (!data.headline || !data.sections || !Array.isArray(data.sections)) {
        alert('A IA retornou um formato inesperado. Tente novamente.');
        console.error('Invalid AI response:', data);
        setIsGeneratingIA(false);
        return;
      }
      
      setGeneratedIAContent(data);
    } catch (error) {
      console.error("AI Gen Error:", error);
      alert("Erro de conexão ao gerar com IA. Verifique se o backend está rodando.");
    }
    setIsGeneratingIA(false);
  };

  const applyIAResult = () => {
    if (!generatedIAContent) return;
    
    // Abrir o modal de criação normal com os dados da IA preenchidos
    // Para simplificar agora, vamos apenas mostrar um alerta ou preencher o form
    alert("Conteúdo gerado com sucesso! Você pode copiar os dados agora.");
    // Aqui poderíamos setar estados de um form controlado
  };

  const totalViews = pages.reduce((sum, p) => sum + p.views, 0);
  const totalSubmissions = pages.reduce((sum, p) => sum + p.submissions, 0);
  const publishedPages = pages.filter(p => p.status === 'published').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
          <p className="text-gray-500 mt-1">Crie e gerencie suas páginas de conversão</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 bg-blue-50 text-primary px-4 py-2 rounded-xl hover:bg-blue-100 transition-all font-medium border border-blue-100"
          >
            <Sparkles size={18} />
            <span>Gerar com IA</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
          >
            <Plus size={18} />
            <span>Nova Landing Page</span>
          </button>
        </div>
      </div>


      {/* Premium Templates Showcase */}
      <div className="bg-gradient-to-r from-[#0a192f] to-[#1e1b4b] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#c5a059]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-left">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-[#c5a059] font-bold tracking-widest text-xs uppercase mb-3">
              <Sparkles size={16} /> NOVIDADE: TEMPLATES PREMIUM
            </div>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Landing Pages de Alta Performance</h2>
            <p className="text-indigo-100/70 leading-relaxed mb-6">
              Lançamos novos modelos premium: **Lawyer, Creative, Marketing, Performance e SaaS**. 
              Design minimalista, animações fluidas e foco total em conversão para qualquer nicho.
            </p>
            <div className="flex gap-4">
              <a 
                href="/landing-editor" 
                className="bg-[#c5a059] hover:bg-[#e2c28a] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <Edit size={18} /> Explorar Novo Editor
              </a>
              <a 
                href="/landing-demo" 
                className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <Eye size={18} /> Ver Demonstração
              </a>
            </div>
          </div>
          <div className="hidden lg:block w-72 h-48 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm p-4 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl">
            <div className="w-full h-full rounded-lg bg-[#112240] border border-[#c5a059]/20 overflow-hidden relative">
              <div className="absolute top-2 left-2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
              </div>
              <div className="mt-6 px-3 space-y-2 text-left">
                <div className="h-2 w-3/4 bg-white/10 rounded"></div>
                <div className="h-1 w-full bg-white/5 rounded"></div>
                <div className="h-1 w-5/6 bg-white/5 rounded"></div>
                <div className="mt-4 h-6 w-1/2 bg-[#c5a059] rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Páginas</p>
              <p className="text-2xl font-bold">{pages.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Publicadas</p>
              <p className="text-2xl font-bold">{publishedPages}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Visitas</p>
              <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <FormInput className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Conversões</p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pages Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
              <div className="h-40 bg-gray-100 rounded-xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Layout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma landing page criada</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira landing page para começar a gerar leads</p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-primary hover:underline"
          >
            Criar Landing Page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pages.map(page => (
            <div 
              key={page.id} 
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Preview */}
              <div className="aspect-video bg-gray-100 relative group cursor-pointer" onClick={() => setSelectedPage(page)}>
                {page.heroImage ? (
                  <img src={page.heroImage} alt={page.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layout className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Eye size={18} />
                  </button>
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Edit size={18} />
                  </button>
                </div>
                {page.status === 'published' && (
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Online
                  </span>
                )}
              </div>
              
              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{page.name}</h3>
                <a 
                  href={`${API_URL}/lp/${page.slug}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mb-3"
                >
                  <Globe size={12} />
                  <span>/{page.slug}</span>
                  <ExternalLink size={12} />
                </a>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Eye size={14} className="text-gray-400" />
                      {page.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <FormInput size={14} className="text-gray-400" />
                      {page.submissions}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleStatus(page)}
                      className={`p-1.5 rounded-lg ${
                        page.status === 'published' 
                          ? 'text-yellow-600 hover:bg-yellow-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={page.status === 'published' ? 'Despublicar' : 'Publicar'}
                    >
                      {page.status === 'published' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                    </button>
                    <button
                      onClick={() => duplicatePage(page)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="Duplicar"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => deletePage(page.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Create */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Criar Landing Page</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="Ex: Webinar - Cómo Vender Mais"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">nexus360.com/</span>
                  <input 
                    type="text" 
                    name="slug" 
                    required
                    placeholder="webinar-vender-mais"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Escolha um Modelo</label>
                
                {/* Premium Category */}
                <div className="mb-6">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Modelos Premium</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {templates.filter(t => t.category === 'premium').map(tpl => (
                      <label key={tpl.id} className="cursor-pointer group">
                        <input type="radio" name="templateId" value={tpl.id} className="peer sr-only" />
                        <div className="relative border-2 border-gray-100 rounded-xl overflow-hidden peer-checked:border-indigo-600 peer-checked:ring-2 peer-checked:ring-indigo-100 transition-all">
                          <img src={tpl.thumbnail} alt={tpl.name} className="w-full h-20 object-cover group-hover:scale-110 transition-transform" />
                          <div className="p-2 bg-white">
                            <p className="text-[10px] font-bold truncate text-gray-700">{tpl.name}</p>
                          </div>
                          <div className="absolute top-1 right-1 bg-indigo-600 text-white p-1 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity">
                            <CheckCircle size={10} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Standard Category */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Modelos Padrão</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {templates.filter(t => t.category === 'standard').map(tpl => (
                      <label key={tpl.id} className="cursor-pointer">
                        <input type="radio" name="templateId" value={tpl.id} className="peer sr-only" />
                        <div className="border-2 border-gray-100 rounded-xl p-3 text-center peer-checked:border-primary peer-checked:bg-blue-50 transition-all">
                          <Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-[10px] font-bold">{tpl.name}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                <input 
                  type="text" 
                  name="headline" 
                  placeholder="Título principal da página"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subheadline</label>
                <input 
                  type="text" 
                  name="subheadline" 
                  placeholder=" Subtítulo"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
                <input 
                  type="url" 
                  name="heroImage" 
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formulário</label>
                <select 
                  name="formId"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Selecione um formulário</option>
                  <option value="native">Formulário Nativo</option>
                  {forms.map(form => (
                    <option key={form.id} value={form.id}>{form.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - AI Generation */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-200"><Sparkles className="text-white" size={20} /></div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Gerador de Landing Page IA</h2>
                  <p className="text-xs text-gray-500">Preencha os dados e gere uma página completa</p>
                </div>
              </div>
              <button onClick={() => { setShowAIModal(false); setGeneratedIAContent(null); }} className="p-2 hover:bg-gray-100 rounded-full"><XCircle size={24} className="text-gray-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!generatedIAContent ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="group relative">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Logo</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-primary cursor-pointer h-[72px] flex items-center justify-center" onClick={() => document.getElementById('logo-upload-input')?.click()}>
                        {logoPreview ? <img src={logoPreview} alt="Logo" className="h-10 object-contain" /> : <><Image size={18} className="mx-auto text-gray-300" /><p className="text-[9px] text-gray-400 mt-1">Upload</p></>}
                        <input id="logo-upload-input" type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nome da Empresa *</label>
                      <input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Ex: Agência Rocket" value={aiConfig.companyName} onChange={e => setAIConfig({...aiConfig, companyName: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Sobre a Empresa *</label>
                    <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary min-h-[60px]" placeholder="Descreva o que a empresa faz..." value={aiConfig.description} onChange={e => setAIConfig({...aiConfig, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Target size={10} /> Público-Alvo</label><input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Ex: Donos de e-commerce" value={aiConfig.targetAudience} onChange={e => setAIConfig({...aiConfig, targetAudience: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Trophy size={10} /> Objetivo</label><input className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Ex: Captar leads" value={aiConfig.goal} onChange={e => setAIConfig({...aiConfig, goal: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Serviços / Produtos</label><textarea className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none min-h-[50px]" placeholder="Liste separados por vírgula" value={aiConfig.services} onChange={e => setAIConfig({...aiConfig, services: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Diferenciais</label><textarea className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none min-h-[50px]" placeholder="O que diferencia você?" value={aiConfig.differentials} onChange={e => setAIConfig({...aiConfig, differentials: e.target.value})} /></div>
                  </div>
                  <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Depoimentos (opcional)</label><textarea className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none min-h-[40px]" placeholder="Cole depoimentos reais" value={aiConfig.testimonials} onChange={e => setAIConfig({...aiConfig, testimonials: e.target.value})} /></div>
                  <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📞 Contato (aparecerá na LP)</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <input className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm outline-none" placeholder="WhatsApp" value={aiConfig.whatsapp} onChange={e => setAIConfig({...aiConfig, whatsapp: e.target.value})} />
                      <input className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm outline-none" placeholder="Telefone" value={aiConfig.phone} onChange={e => setAIConfig({...aiConfig, phone: e.target.value})} />
                      <input className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm outline-none" placeholder="E-mail" value={aiConfig.email} onChange={e => setAIConfig({...aiConfig, email: e.target.value})} />
                      <input className="px-3 py-2 bg-white border border-gray-100 rounded-lg text-sm outline-none" placeholder="@instagram" value={aiConfig.instagram} onChange={e => setAIConfig({...aiConfig, instagram: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cor 1</label>
                      <input 
                        type="color" 
                        className="w-full h-9 rounded-lg border border-gray-100 cursor-pointer" 
                        value={aiConfig.colorPrimary} 
                        onChange={e => setAIConfig({...aiConfig, colorPrimary: e.target.value})} 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Cor 2</label>
                      <input 
                        type="color" 
                        className="w-full h-9 rounded-lg border border-gray-100 cursor-pointer" 
                        value={aiConfig.colorSecondary} 
                        onChange={e => setAIConfig({...aiConfig, colorSecondary: e.target.value})} 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tom</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm" 
                        value={aiConfig.tone} 
                        onChange={e => setAIConfig({...aiConfig, tone: e.target.value})}
                      >
                        <option value="profissional">Profissional</option>
                        <option value="casual">Casual</option>
                        <option value="agressivo">Agressivo</option>
                        <option value="inspirador">Inspirador</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Seções</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm" 
                        value={aiConfig.sectionsCount} 
                        onChange={e => setAIConfig({...aiConfig, sectionsCount: parseInt(e.target.value)})}
                      >
                        {[3,4,5,6,7].map(n => <option key={n} value={n}>{n} Seções</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Motor IA</label>
                      <select 
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm" 
                        value={aiConfig.provider} 
                        onChange={e => setAIConfig({...aiConfig, provider: e.target.value})}
                      >
                        <option value="groq">Groq</option>
                        <option value="gemini">Gemini</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Texto do Botão CTA</label>
                    <input 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                      placeholder="Ex: Quero Saber Mais" 
                      value={aiConfig.ctaText} 
                      onChange={e => setAIConfig({...aiConfig, ctaText: e.target.value})} 
                    />
                  </div>
                  <button onClick={handleGenerateIA} disabled={isGeneratingIA || !aiConfig.companyName || !aiConfig.description} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${isGeneratingIA || !aiConfig.companyName || !aiConfig.description ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white hover:bg-blue-600 shadow-xl shadow-blue-200'}`}>
                    {isGeneratingIA ? (<><Loader2 className="animate-spin" size={22} /><span>Gerando sua Landing Page...</span></>) : (<><Sparkles size={22} /><span>Gerar Landing Page Completa</span></>)}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedIAContent.url && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-600 shrink-0" size={24} />
                        <div>
                          <p className="font-bold text-green-800 text-sm">Landing Page publicada!</p>
                          <p className="text-xs text-green-600 font-mono break-all">{API_URL}{generatedIAContent.url}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(`${API_URL}${generatedIAContent.url}`); alert('URL copiada!'); }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg"><Copy size={14} className="inline mr-1" />Copiar</button>
                        <a href={`${API_URL}${generatedIAContent.url}`} target="_blank" className="px-3 py-1.5 bg-white border border-green-300 text-green-700 text-xs font-bold rounded-lg"><ExternalLink size={14} className="inline mr-1" />Abrir</a>
                      </div>
                    </div>
                  )}
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <h3 className="text-primary font-bold text-lg mb-1">{generatedIAContent.headline}</h3>
                    <p className="text-blue-700/70 text-sm italic">{generatedIAContent.subheadline}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Estrutura ({(generatedIAContent.sections || []).length} seções)</h4>
                    {(generatedIAContent.sections || []).map((section: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-2"><span className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[9px] font-bold">{idx+1}</span><h5 className="font-bold text-gray-800 text-sm">{section.title}</h5><span className="text-[9px] bg-blue-50 text-primary px-2 py-0.5 rounded-full font-bold ml-auto">{section.type}</span></div>
                      </div>
                    ))}
                  </div>
                  {generatedIAContent.htmlPreview && (
                    <div><h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Preview</h4><div className="border border-gray-200 rounded-xl overflow-hidden" style={{height:'350px'}}><iframe srcDoc={generatedIAContent.htmlPreview} className="w-full h-full" title="Preview" /></div></div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setGeneratedIAContent(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 text-sm">Refazer</button>
                    <button onClick={() => { setShowAIModal(false); setGeneratedIAContent(null); fetchData(); }} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-600 shadow-lg shadow-blue-200 text-sm">Concluir</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
