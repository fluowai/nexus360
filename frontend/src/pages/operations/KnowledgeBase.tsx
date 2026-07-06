import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Calendar,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  FolderTree,
  Grid2X2,
  Hash,
  Layers3,
  List,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { apiFetch } from "../../lib/api";

const DEFAULT_CATEGORIES = [
  { name: "Comercial", count: 28, icon: TrendingUp },
  { name: "Marketing", count: 26, icon: Sparkles },
  { name: "Operacao", count: 32, icon: Layers3 },
  { name: "IA ACP", count: 24, icon: BookOpen },
  { name: "Financeiro", count: 15, icon: FileText },
  { name: "Produto", count: 12, icon: Grid2X2 },
  { name: "Onboarding", count: 8, icon: Calendar },
];

const SAMPLE_ARTICLES = [
  {
    id: "sample-sdr-flow",
    title: "Fluxo Completo de SDR IA",
    content: "Entenda o fluxo completo de qualificacao, abordagem e agendamento automatizado.",
    category: "Comercial",
    tags: ["SDR", "IA", "Vendas"],
    author: "Mariana Silva",
    updatedAt: "2024-05-18T12:00:00.000Z",
    views: 118,
    isPublished: true,
    isSample: true,
  },
  {
    id: "sample-acp-campaigns",
    title: "Como criar campanhas ACP de alta conversao",
    content: "Aprenda o passo a passo para criar campanhas utilizando o Orquestrador ACP.",
    category: "IA ACP",
    tags: ["ACP", "Campanhas"],
    author: "Gabriel Alves",
    updatedAt: "2024-05-20T12:00:00.000Z",
    views: 142,
    isPublished: true,
    isSample: true,
  },
  {
    id: "sample-onboarding",
    title: "Processo de onboarding de clientes",
    content: "Boas praticas e checklist para um onboarding eficiente.",
    category: "Onboarding",
    tags: ["Onboarding", "Processos", "Clientes"],
    author: "Joao Pedro",
    updatedAt: "2024-05-15T12:00:00.000Z",
    views: 86,
    isPublished: true,
    isSample: true,
  },
  {
    id: "sample-playbook",
    title: "Playbook de vendas consultivas",
    content: "Roteiro completo para conduzir vendas consultivas de ponta a ponta.",
    category: "Comercial",
    tags: ["Vendas", "Playbook", "Comercial"],
    author: "Gabriel Alves",
    updatedAt: "2024-05-10T12:00:00.000Z",
    views: 74,
    isPublished: true,
    isSample: true,
  },
];

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags !== "string" || !tags.trim()) return [];
  try {
    const parsed = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
}

function formatDate(value?: string) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function normalizeCategoryName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterBy, setFilterBy] = useState("all");
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

  const categoryItems = useMemo(() => {
    const apiCounts = new Map<string, number>();
    categories.forEach((cat) => {
      const name = typeof cat === "string" ? cat : cat.category || cat.name;
      if (!name) return;
      apiCounts.set(name, cat._count?.id || cat.count || 0);
    });

    return DEFAULT_CATEGORIES.map((category) => ({
      ...category,
      count: apiCounts.get(category.name) ?? apiCounts.get(normalizeCategoryName(category.name)) ?? category.count,
    }));
  }, [categories]);

  const normalizedArticles = useMemo(() => {
    const source = articles.length > 0 ? articles : SAMPLE_ARTICLES;
    const visible = source.filter((article) => {
      const matchesSearch =
        !searchTerm ||
        article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.content?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || normalizeCategoryName(article.category || "") === normalizeCategoryName(selectedCategory);
      const matchesFavorite = filterBy !== "favorites" || (article.views || 0) >= 100;
      return matchesSearch && matchesCategory && matchesFavorite;
    });

    return [...visible].sort((a, b) => {
      if (sortBy === "popular") return (b.views || 0) - (a.views || 0);
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [articles, filterBy, searchTerm, selectedCategory, sortBy]);

  const hasRealArticles = articles.length > 0;
  const shouldShowEmpty = hasRealArticles && normalizedArticles.length === 0;

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este artigo?")) return;
    try {
      await apiFetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      fetchArticles();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-[#64748B]">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5B5CF0] border-t-transparent" />
          <span className="text-sm font-semibold">Carregando base de conhecimento...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[40px] font-bold leading-tight tracking-normal text-[#0F172A]">Base de Conhecimento</h1>
          <p className="mt-2 text-[18px] font-medium text-[#64748B]">Documentacao, processos e playbooks da operacao.</p>
        </div>
        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#5B5CF0] px-6 text-[16px] font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5] active:scale-[0.98]"
        >
          <Plus size={20} />
          Novo Artigo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={24} />
        <input
          className="h-16 w-full rounded-xl border border-[#E2E8F0] bg-white pl-16 pr-24 text-[18px] text-[#0F172A] shadow-sm outline-none transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#5B5CF0] focus:ring-4 focus:ring-[#5B5CF0]/10"
          placeholder="Buscar artigos, processos, documentacoes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-[13px] font-bold text-[#64748B] md:inline-flex">
          Ctrl K
        </span>
      </div>

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 px-1 text-[14px] font-bold uppercase tracking-[1px] text-[#0F172A]">
            <FolderTree size={18} className="text-[#5B5CF0]" />
            Categorias
          </div>
          <div className="flex flex-col gap-2">
            <CategoryButton
              active={!selectedCategory}
              icon={BookOpen}
              label="Todas Categorias"
              count={hasRealArticles ? articles.length : 145}
              onClick={() => setSelectedCategory("")}
            />
            {categoryItems.map((category) => (
              <CategoryButton
                key={category.name}
                active={normalizeCategoryName(selectedCategory) === normalizeCategoryName(category.name)}
                icon={category.icon}
                label={category.name}
                count={category.count}
                onClick={() => setSelectedCategory(category.name)}
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <FilterSelect value={selectedCategory || "all"} onChange={(value) => setSelectedCategory(value === "all" ? "" : value)}>
                <option value="all">Todas as categorias</option>
                {categoryItems.map((category) => (
                  <option key={category.name} value={category.name}>{category.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect value={sortBy} onChange={setSortBy}>
                <option value="recent">Mais recentes</option>
                <option value="popular">Mais acessados</option>
              </FilterSelect>
              <FilterSelect value={filterBy} onChange={setFilterBy}>
                <option value="all">Todos</option>
                <option value="favorites">Favoritos</option>
              </FilterSelect>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-12 w-12 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#5B5CF0] transition-all duration-200 hover:bg-[#F4F5FF]">
                <List size={20} className="mx-auto" />
              </button>
              <button className="h-12 w-12 rounded-xl border border-[#E2E8F0] bg-white text-[#94A3B8] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
                <Grid2X2 size={20} className="mx-auto" />
              </button>
            </div>
          </div>

          {shouldShowEmpty ? (
            <EmptyState onCreate={() => { setEditing(null); setModalOpen(true); }} />
          ) : (
            <div className="flex flex-col gap-4">
              {normalizedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onEdit={() => {
                    if (article.isSample) return;
                    setEditing(article);
                    setModalOpen(true);
                  }}
                  onDelete={() => !article.isSample && handleDelete(article.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F4F5FF] text-[#5B5CF0]">
            <BookOpen size={27} />
          </div>
          <div>
            <h3 className="text-[18px] font-bold text-[#0F172A]">Nao encontrou o que estava procurando?</h3>
            <p className="text-[16px] font-medium text-[#64748B]">Sugira um novo artigo para nossa base de conhecimento.</p>
          </div>
        </div>
        <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#C7D2FE] px-6 text-[16px] font-bold text-[#5B5CF0] transition-all duration-200 hover:bg-[#F4F5FF]">
          Sugerir artigo
          <ArrowRight size={17} />
        </button>
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

function CategoryButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: any; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex h-[60px] items-center gap-3 rounded-xl border px-4 text-left transition-all duration-200 ${
        active
          ? "border-[#E0E7FF] bg-[#F4F5FF] text-[#5B5CF0]"
          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#C7D2FE] hover:bg-[#F8FAFC] hover:text-[#5B5CF0]"
      }`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? "bg-white" : "bg-[#F8FAFC] group-hover:bg-white"}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1 text-[16px] font-bold">{label}</span>
      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[13px] font-bold text-[#64748B]">{count}</span>
      <ChevronRight size={18} className="text-[#94A3B8]" />
    </button>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 min-w-[180px] rounded-xl border border-[#E2E8F0] bg-white px-4 text-[15px] font-semibold text-[#64748B] outline-none transition-all duration-200 hover:border-[#C7D2FE] focus:border-[#5B5CF0] focus:ring-4 focus:ring-[#5B5CF0]/10"
    >
      {children}
    </select>
  );
}

function ArticleCard({ article, onEdit, onDelete }: { article: any; onEdit: () => void; onDelete: () => void }) {
  const tags = parseTags(article.tags);
  const summary = article.content?.replace(/\s+/g, " ").slice(0, 120) || "Documentacao interna da operacao Nexus360.";

  return (
    <motion.article
      layout
      className="group flex flex-col gap-5 rounded-xl border border-[#E2E8F0] bg-white p-5 transition-all duration-200 hover:border-[#C7D2FE] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] lg:flex-row lg:items-center"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#F4F5FF] text-[#5B5CF0]">
        <FileText size={28} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[19px] font-bold text-[#0F172A]">{article.title}</h3>
          {!article.isPublished && (
            <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-bold text-[#64748B]">Rascunho</span>
          )}
        </div>
        <p className="mt-2 text-[16px] font-medium leading-7 text-[#64748B]">{summary}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1.5 text-[13px] font-bold text-[#5B5CF0]">{article.category || "Geral"}</span>
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-3 py-1.5 text-[13px] font-bold text-[#5B5CF0]">
              <Hash size={12} />
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 lg:min-w-[340px]">
        <div className="text-right text-[15px] font-medium text-[#64748B]">
          <div className="flex items-center justify-end gap-1">
            <Clock3 size={16} />
            {formatDate(article.updatedAt || article.createdAt)}
          </div>
          <div className="mt-1">por {article.author || "Time de Produto"}</div>
          <div className="mt-1 flex items-center justify-end gap-1">
            <Eye size={16} />
            {article.views || 0} acessos
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity duration-200 lg:opacity-70 lg:group-hover:opacity-100">
          <button className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
            <Bookmark size={19} className="mx-auto" />
          </button>
          <button onClick={onEdit} className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]">
            <Edit3 size={19} className="mx-auto" />
          </button>
          <button onClick={onDelete} className="h-11 w-11 rounded-lg text-[#64748B] transition-all duration-200 hover:bg-red-50 hover:text-red-500">
            <Trash2 size={19} className="mx-auto" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 text-center">
      <div className="relative mb-5">
        <div className="h-24 w-24 rounded-3xl bg-white shadow-sm" />
        <div className="absolute inset-0 flex items-center justify-center text-[#5B5CF0]">
          <BookOpen size={42} />
        </div>
        <Star className="absolute -right-3 -top-3 text-[#7C6CFF]" size={22} />
      </div>
      <h3 className="text-[20px] font-bold text-[#0F172A]">Nenhum artigo encontrado.</h3>
      <p className="mt-2 max-w-md text-[15px] font-medium leading-6 text-[#64748B]">Crie seu primeiro artigo ou ajuste os filtros.</p>
      <button
        onClick={onCreate}
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#5B5CF0] px-5 text-[14px] font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5]"
      >
        <Plus size={17} />
        Criar Artigo
      </button>
    </div>
  );
}

function ArticleModal({ onClose, onSuccess, initialData }: { onClose: () => void; onSuccess: () => void; initialData?: any }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
    category: initialData?.category || "",
    tags: initialData?.tags ? parseTags(initialData.tags).join(", ") : "",
    isPublished: initialData?.isPublished ?? false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        ...formData,
        tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-5">
          <h2 className="text-xl font-bold text-[#0F172A]">{initialData ? "Editar Artigo" : "Novo Artigo"}</h2>
          <button onClick={onClose} className="h-9 w-9 rounded-xl text-[#64748B] transition-all duration-200 hover:bg-[#F4F5FF] hover:text-[#5B5CF0]"><X size={20} className="mx-auto" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Titulo</label>
            <input className="modal-input font-semibold" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Categoria</label>
              <input className="modal-input font-semibold" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ex: Onboarding, IA ACP" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Tags</label>
              <input className="modal-input" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="SDR, IA, Vendas" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-bold uppercase tracking-[1px] text-[#64748B]">Conteudo</label>
            <textarea className="modal-input min-h-[250px] resize-none text-sm leading-6" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} required />
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2E8F0] p-3">
            <input type="checkbox" checked={formData.isPublished} onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })} className="h-5 w-5 rounded border-[#CBD5E1] text-[#5B5CF0]" />
            <span className="flex items-center gap-2 text-sm font-bold text-[#0F172A]">
              {formData.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
              Publicado
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-12 flex-1 rounded-xl text-sm font-bold text-[#64748B] transition-all duration-200 hover:bg-[#F8FAFC]">Cancelar</button>
            <button type="submit" disabled={submitting} className="h-12 flex-[2] rounded-xl bg-[#5B5CF0] text-sm font-bold text-white shadow-lg shadow-[#5B5CF0]/20 transition-all duration-200 hover:bg-[#4F46E5] disabled:opacity-60">
              {submitting ? "Salvando..." : initialData ? "Salvar" : "Criar Artigo"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
