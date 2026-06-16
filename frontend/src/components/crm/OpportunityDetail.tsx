import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  X, User, Mail, Phone, Trophy, Trash2, MessageSquare, Video,
  Send, Calendar, Sparkles, Database, Target, Star, TrendingUp,
  DollarSign, Clock, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { apiFetch } from "../../lib/api";

interface OpportunityDetailProps {
  opportunityId: string;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function OpportunityDetail({ opportunityId, onClose, onUpdate, onDelete }: OpportunityDetailProps) {
  const [opportunity, setOpportunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("note");
  const [newActivity, setNewActivity] = useState({ content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loseModal, setLoseModal] = useState(false);
  const [winModal, setWinModal] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/crm/opportunities/${opportunityId}`);
      const data = await res.json();
      setOpportunity(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [opportunityId]);

  const handleStageChange = async (stageId: string) => {
    setOpportunity((prev: any) => ({ ...prev, stageId }));
    try {
      await apiFetch(`/api/crm/opportunities/${opportunityId}`, {
        method: "PATCH",
        body: JSON.stringify({ stageId }),
      });
      onUpdate();
    } catch (err) {
      fetchDetails();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta oportunidade?")) return;
    try {
      await apiFetch(`/api/crm/opportunities/${opportunityId}`, { method: "DELETE" });
      onDelete();
    } catch (err) {
      console.error(err);
    }
  };

  const handleWin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData(e.target as HTMLFormElement);
      await apiFetch(`/api/crm/opportunities/${opportunityId}/win`, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form)),
      });
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLose = async () => {
    setSubmitting(true);
    try {
      await apiFetch(`/api/crm/opportunities/${opportunityId}/lose`, {
        method: "POST",
        body: JSON.stringify({ lostReason: "Outro" }),
      });
      onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch(`/api/crm/activities`, {
        method: "POST",
        body: JSON.stringify({
          dealId: opportunityId,
          type: activeTab.toUpperCase(),
          description: newActivity.content,
        }),
      });
      setNewActivity({ content: "" });
      fetchDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const TABS = [
    { id: "note", label: "ANOTAÇÃO", icon: <MessageSquare size={14} /> },
    { id: "call", label: "LIGAÇÃO", icon: <Phone size={14} /> },
    { id: "meeting", label: "REUNIÃO", icon: <Video size={14} /> },
    { id: "email", label: "E-MAIL", icon: <Mail size={14} /> },
  ];

  const activityLabel = (type?: string) => ({
    CALL: "Ligação",
    EMAIL: "E-mail",
    MEETING: "Reunião",
    NOTE: "Anotação",
    TASK: "Tarefa",
    SYSTEM: "Sistema",
    STAGE_CHANGE: "Mudança de etapa",
    WHATSAPP: "WhatsApp",
  }[String(type || "").toUpperCase()] || "Atividade");

  if (loading && !opportunity) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--nexus-nav-dark)]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-[var(--nexus-background-light)] w-full max-w-2xl h-screen relative z-10 flex flex-col shadow-[var(--nexus-shadow-floating)]"
      >
        <div className="p-8 border-b border-[var(--nexus-card-border)] flex justify-between items-center bg-white">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[var(--nexus-background-soft)] rounded-2xl flex items-center justify-center text-[var(--nexus-primary)] border border-[var(--nexus-card-border)] shadow-sm">
              <Target size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--nexus-text-primary)] tracking-tight">
                {opportunity?.title || "Carregando..."}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-black text-[var(--nexus-success-dark)] bg-[var(--nexus-success-soft)] px-2 py-1 rounded-md border border-[var(--nexus-success)]/10">
                  {opportunity?.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-[10px] font-black text-[var(--nexus-text-muted)] bg-[var(--nexus-background-soft)] px-2 py-1 rounded-md border border-[var(--nexus-card-border)] uppercase tracking-wider">
                  {opportunity?.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWinModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--nexus-success)] text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-[var(--nexus-success)]/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Trophy size={14} />
              Ganhar
            </button>
            <button
              onClick={() => setLoseModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <AlertCircle size={14} />
              Perder
            </button>
            <button onClick={handleDelete} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <Trash2 size={20} />
            </button>
            <button onClick={onClose} className="p-2.5 text-[var(--nexus-text-muted)] hover:bg-[var(--nexus-background-soft)] rounded-xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
          {/* Stage Selector */}
          {opportunity?.pipeline?.stages && (
            <div className="bg-white rounded-2xl border border-[var(--nexus-card-border)] p-4 shadow-sm">
              <p className="text-[10px] font-black text-[var(--nexus-text-muted)] uppercase tracking-widest mb-3">Etapa Atual</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {opportunity.pipeline.stages.map((stage: any) => {
                  const isCurrent = stage.id === opportunity.stageId;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleStageChange(stage.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        isCurrent
                          ? "bg-[var(--nexus-primary)] text-white border-[var(--nexus-primary)] shadow-md"
                          : "bg-[var(--nexus-background-soft)] text-[var(--nexus-text-secondary)] border-transparent hover:border-gray-200"
                      }`}
                    >
                      {stage.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: <Mail size={18} />, label: "E-mail", color: "bg-blue-50 text-blue-500", onClick: () => window.location.href = `mailto:${opportunity?.client?.email || ""}` },
              { icon: <Phone size={18} />, label: "WhatsApp", color: "bg-green-50 text-green-500", onClick: () => opportunity?.client?.phone && window.open(`https://wa.me/${String(opportunity.client.phone).replace(/\D/g, "")}`, "_blank") },
              { icon: <Video size={18} />, label: "Reunião", color: "bg-purple-50 text-purple-500", onClick: () => {} },
              { icon: <Calendar size={18} />, label: "Tarefa", color: "bg-orange-50 text-orange-500", onClick: () => {} },
            ].map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[var(--nexus-card-border)] shadow-sm hover:border-[var(--nexus-primary)]/40 hover:shadow-md transition-all group"
              >
                <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-[9px] font-black text-[var(--nexus-text-secondary)] uppercase">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Key Info */}
          <div className="bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[var(--nexus-text-primary)] uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" />
              Informações da Oportunidade
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Pipeline", value: opportunity?.pipeline?.name },
                { label: "Etapa", value: opportunity?.stageObj?.name },
                { label: "Valor", value: opportunity?.value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
                { label: "Previsão", value: opportunity?.expectedCloseDate ? new Date(opportunity.expectedCloseDate).toLocaleDateString("pt-BR") : "Não definida" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</label>
                  <p className="text-sm font-bold text-[var(--nexus-text-primary)]">{item.value || "-"}</p>
                </div>
              ))}
            </div>
            {opportunity?.description && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Descrição</label>
                <p className="text-sm text-[var(--nexus-text-secondary)]">{opportunity.description}</p>
              </div>
            )}
          </div>

          {/* Tasks */}
          {opportunity?.tasks && opportunity.tasks.length > 0 && (
            <div className="bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[var(--nexus-text-primary)] uppercase tracking-widest">Tarefas</h3>
              {opportunity.tasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--nexus-background-soft)]">
                  <div className={`w-2 h-2 rounded-full ${task.status === "concluida" ? "bg-green-400" : "bg-orange-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--nexus-text-primary)]">{task.title}</p>
                    {task.dueDate && (
                      <p className="text-[10px] text-gray-500 mt-0.5">Vence: {new Date(task.dueDate).toLocaleDateString("pt-BR")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Activity Log */}
          <div className="bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm space-y-4">
            <h3 className="text-xs font-black text-[var(--nexus-text-primary)] uppercase tracking-widest">Atividades</h3>
            <form onSubmit={addActivity} className="space-y-3">
              <div className="flex gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black transition-all ${
                      activeTab === tab.id
                        ? "bg-[var(--nexus-primary)] text-white"
                        : "bg-[var(--nexus-background-soft)] text-[var(--nexus-text-muted)] hover:bg-gray-200"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <input
                  placeholder="Adicionar atividade..."
                  className="flex-1 px-4 py-3 bg-[var(--nexus-background-soft)] border border-[var(--nexus-card-border)] rounded-xl outline-none text-sm"
                  value={newActivity.content}
                  onChange={e => setNewActivity({ content: e.target.value })}
                />
                <button
                  type="submit"
                  disabled={!newActivity.content || submitting}
                  className="px-5 py-3 bg-[var(--nexus-primary)] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {submitting ? "..." : "Salvar"}
                </button>
              </div>
            </form>
            <div className="space-y-3">
              {(opportunity?.activities || []).map((activity: any) => (
                <div key={activity.id} className="rounded-xl border border-[var(--nexus-card-border)] bg-[var(--nexus-background-soft)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--nexus-text-secondary)]">
                      {String(activity.type).toUpperCase() === "CALL" ? <Phone size={12} /> : <MessageSquare size={12} />}
                      {activityLabel(activity.type)}
                    </span>
                    <span className="text-[10px] font-bold text-[var(--nexus-text-muted)]">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleString("pt-BR") : ""}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-[var(--nexus-text-secondary)]">
                    {activity.description}
                  </p>
                </div>
              ))}
              {(!opportunity?.activities || opportunity.activities.length === 0) && (
                <p className="rounded-xl bg-[var(--nexus-background-soft)] p-4 text-center text-xs font-bold text-[var(--nexus-text-muted)]">
                  Nenhuma atividade registrada ainda.
                </p>
              )}
            </div>
          </div>

          {opportunity?.client && (
            <div className="bg-white border border-[var(--nexus-card-border)] p-6 rounded-[24px] shadow-sm space-y-3">
              <h3 className="text-xs font-black text-[var(--nexus-text-primary)] uppercase tracking-widest">Cliente</h3>
              <p className="font-bold text-[var(--nexus-text-primary)]">{opportunity.client.corporateName || opportunity.client.tradeName}</p>
              {opportunity.client.email && <p className="text-sm text-[var(--nexus-text-secondary)]">{opportunity.client.email}</p>}
              {opportunity.client.phone && <p className="text-sm text-[var(--nexus-text-secondary)]">{opportunity.client.phone}</p>}
            </div>
          )}
        </div>

        {/* Win Modal */}
        {winModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg mx-4 p-8 space-y-6"
            >
              <h3 className="text-xl font-black text-[var(--nexus-text-primary)]">Ganhar Oportunidade</h3>
              <form onSubmit={handleWin} className="space-y-4">
                <input type="hidden" name="corporateName" value={opportunity?.title || ""} />
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Produto/Serviço</label>
                    <input required name="product" className="modal-input" placeholder="Nome do produto" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor Setup</label>
                    <input type="number" name="setupValue" className="modal-input" placeholder="0,00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Valor Mensal</label>
                    <input type="number" name="monthlyValue" className="modal-input" placeholder="0,00" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Prazo (meses)</label>
                    <input type="number" name="contractTerm" className="modal-input" placeholder="12" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setWinModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[var(--nexus-success)] text-white text-xs font-bold rounded-xl shadow-lg">
                    {submitting ? "Processando..." : "Confirmar Vitória"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Lose Modal */}
        {loseModal && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-lg mx-4 p-8 space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <AlertCircle size={20} />
                </div>
                <h3 className="text-xl font-black text-[var(--nexus-text-primary)]">Perder Oportunidade</h3>
              </div>
              <p className="text-sm text-gray-500">Tem certeza que deseja marcar esta oportunidade como perdida?</p>
              <div className="flex gap-3">
                <button onClick={() => setLoseModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button onClick={handleLose} disabled={submitting} className="flex-1 py-3 bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg">
                  {submitting ? "Processando..." : "Confirmar Perda"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
