import { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Calendar,
  Clock,
  AlertTriangle,
  MoreVertical,
  Filter,
  Users,
  X,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PRIORITY_COLORS = {
  baixa: "bg-gray-100 text-gray-600",
  media: "bg-blue-100 text-blue-600",
  alta: "bg-orange-100 text-orange-600",
  urgente: "bg-red-100 text-red-600"
};

const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluida: "bg-green-100 text-green-700",
  cancelada: "bg-gray-100 text-gray-500"
};

const COLUMNS = [
  { id: 'pendente', title: 'Pendente', color: 'border-yellow-400' },
  { id: 'em_andamento', title: 'Em Andamento', color: 'border-blue-400' },
  { id: 'concluida', title: 'Concluída', color: 'border-green-400' },
];

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/tasks`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.warn("Tasks API returned non-array data:", data);
        setTasks([]);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const pendingTasks = tasks.filter(t => t.priority === 'urgente' && t.status !== 'concluida');

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Carregando tarefas...</div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Tarefas</h1>
          <p className="text-gray-500">Gerencie todas as atividades da sua equipe.</p>
        </div>
        <div className="flex gap-2">
          {pendingTasks.length > 0 && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-xl">
              <AlertTriangle size={18} />
              <span className="font-bold">{pendingTasks.length} urgentes</span>
            </div>
          )}
          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-lg shadow-blue-200"
          >
            <Plus size={18} />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 sm:-mx-8 px-4 sm:px-8">
        {COLUMNS.map((col) => (
          <div key={col.id} className="kanban-column shrink-0 w-[280px] sm:w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-current ${col.color.replace('border-', 'bg-')}`} />
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{col.title}</h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {tasks.filter(t => t.status === col.id).length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-[400px]">
              {tasks
                .filter(t => t.status === col.id)
                .map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={fetchTasks} />
                ))}
              {tasks.filter(t => t.status === col.id).length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8">
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Nenhuma tarefa</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <TaskModal 
            onClose={() => setModalOpen(false)} 
            onSuccess={() => { setModalOpen(false); fetchTasks(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TaskCard({ task, onUpdate }: { task: any, onUpdate: () => void }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'concluida';

  return (
    <motion.div 
      layoutId={task.id}
      className={`kanban-card border-l-4 ${task.priority === 'urgente' ? 'border-red-500' : task.priority === 'alta' ? 'border-orange-500' : 'border-gray-200'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]}`}>
          {task.priority}
        </span>
        <button 
           onClick={async () => {
             const newStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
             await apiFetch(`/api/tasks/${task.id}`, {
               method: 'PATCH',
               body: JSON.stringify({ status: newStatus })
             });
             onUpdate();
           }}
          className="text-gray-400 hover:text-green-600 transition-colors"
        >
          {task.status === 'concluida' ? <CheckSquare size={18} /> : <Square size={18} />}
        </button>
      </div>
      
      <h4 className={`font-bold text-gray-900 mb-2 ${task.status === 'concluida' ? 'line-through text-gray-400' : ''}`}>
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span className={isOverdue ? 'text-red-500 font-bold' : ''}>
            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo'}
          </span>
        </div>
        {task.assignedTo && (
          <div className="flex items-center gap-1">
            <Users size={12} />
            <span>{task.assignedTo.name}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function TaskModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'media',
    dueDate: '',
    status: 'pendente'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10"
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nova Tarefa</h2>
            <p className="text-xs text-gray-500 mt-1">Crie uma nova atividade</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Título</label>
            <input 
              className="modal-input"
              placeholder="O que precisa ser feito?"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Descrição</label>
            <textarea 
              className="modal-input min-h-[80px] resize-none"
              placeholder="Detalhes da tarefa..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prioridade</label>
              <select 
                className="modal-input"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Prazo</label>
              <input 
                type="date"
                className="modal-input"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              disabled={submitting}
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
            >
              {submitting ? 'Salvando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}