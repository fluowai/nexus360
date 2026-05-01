import { useState } from "react";
import { Briefcase, Calendar, CheckSquare, Plus, MoreHorizontal } from "lucide-react";
import { Project } from "../types";

const INITIAL_PROJECTS: Project[] = [
  { 
    id: '1', title: 'Campanha Black Friday - Client X', deadline: '2024-11-20', status: 'execucao', 
    tasks: [
      { id: '1-1', title: 'Criação de criativos', completed: true },
      { id: '1-2', title: 'Configuração dos anúncios', completed: false },
      { id: '1-3', title: 'LP de Captura', completed: false },
    ] 
  },
  { 
    id: '2', title: 'Rebranding Institucional - Alpha', deadline: '2024-12-05', status: 'planejamento', 
    tasks: [
      { id: '2-1', title: 'Moodboard estrategico', completed: true },
    ] 
  },
];

export default function Projects() {
  const [projects] = useState<Project[]>(INITIAL_PROJECTS);

  const statusMap = {
    planejamento: { label: 'Planejamento', color: 'bg-blue-100 text-blue-700' },
    execucao: { label: 'Em Execução', color: 'bg-orange-100 text-orange-700' },
    revisao: { label: 'Revisão', color: 'bg-purple-100 text-purple-700' },
    concluido: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Projetos Ativos</h1>
          <p className="text-gray-500">Gestão de entregas e cronogramas da agência.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200">
          <Plus size={18} />
          <span>Criar Projeto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((p) => {
          const completedTasks = p.tasks.filter(t => t.completed).length;
          const progress = Math.round((completedTasks / p.tasks.length) * 100);
          const status = statusMap[p.status];

          return (
            <div key={p.id} className="glass-card flex flex-col gap-6 group hover:border-primary/50 transition-all">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded w-fit ${status.color}`}>
                    {status.label}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mt-2">{p.title}</h3>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div className="flex items-center gap-6 py-4 border-y border-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar size={16} />
                  <span>Prazo: {new Date(p.deadline).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckSquare size={16} />
                  <span>{completedTasks}/{p.tasks.length} Tarefas</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-gray-600">Progresso</span>
                  <span className="text-primary">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${progress}%` }}
                    className="h-full bg-primary transition-all duration-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-50">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Avatar${i + p.id}`} alt="team" />
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                    +2
                  </div>
                </div>
                <button className="text-sm font-bold text-primary hover:underline">Ver detalhes</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
