import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Plus,
  X,
  Trash2,
  Edit3,
  Search,
  Eye,
  EyeOff,
  FolderTree,
  Filter,
  FileText,
  Hash,
} from "lucide-react";
import { apiFetch } from "../lib/api";

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const fetchArticles = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchTerm) params.set("search", searchTerm);
      const qs = params.toString();
      const [artRes, catRes] = await Promise.all([
        apiFetch(`/api/knowledge-base${qs ? `?${qs}` : ""}`),
        apiFetch("/api/knowledge-base/categories/list"),
      ]);
      const artData = await artRes.json();
      const catData = await catRes.json();
      setArticles(Array.isArray(artData) ? artData : artData.articles || []);
      setCategories(Array.isArray(catData) ? catData : catData.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este artigo?")) return;
    try {
      await apiFetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      setSelectedArticle(null);
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
        Carregando base de conhecimento...
      </div>
    );

  return (
    <div className="flex flex-col gap-8 p-2 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Base de Conhecimento
          </h1>
          <p className="text-gray-500">Documentação interna e artigos.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all font-bold text-sm shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Novo Artigo
        </button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            placeholder="Buscar artigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1">
        <div className="w-56 flex-shrink-0">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <FolderTree size={14} /> Categorias
            </div>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedCategory("")}
                className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                  !selectedCategory
                    ? "bg-primary text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id || cat}
                  onClick={() => setSelectedCategory(typeof cat === "string" ? cat : cat.name)}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    selectedCategory === (typeof cat === "string" ? cat : cat.name)
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {typeof cat === "string" ? cat : cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {selectedArticle ? (
            <div className="glass-card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedArticle.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">
                      {selectedArticle.category}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Eye size={12} /> {selectedArticle.views || 0} views
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        selectedArticle.isPublished
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {selectedArticle.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditing(selectedArticle); setModalOpen(true); }}
                    className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(selectedArticle.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedArticle(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {selectedArticle.tags && (
                <div className="flex gap-1.5 mb-4">
                  {(Array.isArray(selectedArticle.tags) ? selectedArticle.tags : []).map((tag: string, i: number) => (
                    <span key={i} className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Hash size={10} />{tag}
                    </span>
                  ))}
                </div>
              )}
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium"
              >
                {selectedArticle.content}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="glass-card cursor-pointer hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                      <FileText size={20} />
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        art.isPublished
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {art.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{art.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold">
                    <span>{art.category}</span>
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {art.views || 0}
                    </span>
                  </div>
                </div>
              ))}
              {articles.length === 0 && (
                <div className="col-span-full text-center py-16 text-gray-400">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold">Nenhum artigo encontrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <ArticleModal
            onClose={() => setModalOpen(false)}
            onSuccess={() => { setModalOpen(false); fetchArticles(); }}
            initialData={editing}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ArticleModal({ onClose, onSuccess, initialData }: { onClose: () => void; onSuccess: () => void; initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
    category: initialData?.category || "",
    tags: initialData?.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(", ") : initialData.tags) : "",
    isPublished: initialData?.isPublished ?? false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean),
      };
      const url = initialData ? `/api/knowledge-base/${initialData.id}` : "/api/knowledge-base";
      const method = initialData ? "PATCH" : "POST";
      await apiFetch(url, { method, body: JSON.stringify(body) });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl relative z-10 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-900">{initialData ? "Editar Artigo" : "Novo Artigo"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex flex-col gap-4 flex-1 custom-scrollbar">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Título</label>
            <input className="modal-input font-bold" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Categoria</label>
              <input className="modal-input font-bold" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: Onboarding, FAQ" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Tags (separadas por vírgula)</label>
              <input className="modal-input" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="tag1, tag2" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Conteúdo</label>
            <textarea className="modal-input min-h-[250px] resize-none font-mono text-sm" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-primary" />
            <span className="flex items-center gap-2 text-sm font-bold text-gray-700">
              {formData.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
              Publicado
            </span>
          </label>
          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase text-gray-400">Cancelar</button>
            <button type="submit" disabled={submitting} className="flex-[2] py-4 bg-primary text-white font-black text-xs uppercase rounded-2xl shadow-xl shadow-blue-100">
              {submitting ? "Salvando..." : initialData ? "Salvar" : "Criar Artigo"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
