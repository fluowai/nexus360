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
  Save
} from "lucide-react";
import { apiFetch } from "../lib/api";

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
  { id: 'lead-gen', name: 'Geração de Leads', category: 'lead_gen', thumbnail: '' },
  { id: 'webinar', name: 'Webinar', category: 'webinar', thumbnail: '' },
  { id: 'ebook', name: 'Ebook', category: 'ebook', thumbnail: '' },
  { id: 'product', name: 'Produto', category: 'product', thumbnail: '' }
];

export default function LandingPages() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [forms, setForms] = useState<LPForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const orgId = localStorage.getItem('nexus_org_id');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    console.log("Fetching LP data.");
    try {
      const [pagesRes, formsRes] = await Promise.all([
        apiFetch(`/api/landing-pages`),
        apiFetch(`/api/lp-forms`)
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
    console.log("Creating LP with payload:", payload);
    
    try {
      const res = await apiFetch('/api/landing-pages', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json();
        console.error("Server error:", err);
        alert("Erro: " + err.error);
        return;
      }
      
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error creating page:", error);
    }
  };

  const toggleStatus = async (page: LandingPage) => {
    const newStatus = page.status === 'published' ? 'draft' : 'published';
    try {
      await apiFetch(`/api/landing-pages/${page.id}`, {
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
      await apiFetch(`/api/landing-pages/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting page:", error);
    }
  };

  const duplicatePage = async (page: LandingPage) => {
    try {
      await apiFetch('/api/landing-pages', {
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
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
        >
          <Plus size={18} />
          <span>Nova Landing Page</span>
        </button>
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
                <p className="text-sm text-gray-500 mb-3">nexus360.com/{page.slug}</p>
                
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {templates.map(tpl => (
                    <label key={tpl.id} className="cursor-pointer">
                      <input type="radio" name="templateId" value={tpl.id} className="peer sr-only" />
                      <div className="border-2 border-gray-200 rounded-xl p-3 text-center peer-checked:border-primary peer-checked:bg-blue-50 transition-colors">
                        <Layout className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium">{tpl.name}</p>
                      </div>
                    </label>
                  ))}
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
    </div>
  );
}