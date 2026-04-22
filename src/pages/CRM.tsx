import { useState } from "react";
import { 
  MoreVertical, 
  Search, 
  Plus, 
  Filter, 
  ChevronRight, 
  Mail, 
  Phone, 
  Tag as TagIcon,
  DollarSign
} from "lucide-react";
import { motion } from "motion/react";
import { Lead } from "../types";

const INITIAL_LEADS: Lead[] = [
  { id: '1', name: 'João Silva', email: 'joao@tech.com', status: 'novo', value: 5000, tags: ['SaaS', 'SEO'] },
  { id: '2', name: 'Maria Souza', email: 'maria@commerce.br', status: 'contato', value: 12000, tags: ['E-commerce'] },
  { id: '3', name: 'Carlos Oliveira', email: 'carlos@vendas.com', status: 'qualificado', value: 8500, tags: ['Social Media'] },
  { id: '4', name: 'Ana Costa', email: 'ana@design.com', status: 'proposta', value: 25000, tags: ['Branding', 'Web'] },
  { id: '5', name: 'Paulo Santos', email: 'paulo@realestate.com', status: 'fechado', value: 3000, tags: ['Lead Gen'] },
  { id: '6', name: 'Fernanda Lima', email: 'fernanda@blog.com', status: 'novo', value: 1500, tags: ['Ads'] },
];

const COLUMNS = [
  { id: 'novo', title: 'Novos Leads', color: 'bg-blue-500' },
  { id: 'contato', title: 'Em Contato', color: 'bg-yellow-500' },
  { id: 'qualificado', title: 'Qualificados', color: 'bg-indigo-500' },
  { id: 'proposta', title: 'Proposta Enviada', color: 'bg-purple-500' },
  { id: 'fechado', title: 'Fechado/Ganho', color: 'bg-green-500' },
];

export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Gestão de Leads (CRM)</h1>
          <p className="text-gray-500">Pipeline visual para controle de conversões.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all shadow-sm">
            <Filter size={18} />
            <span>Filtros</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium shadow-md shadow-blue-200">
            <Plus size={18} />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 -mx-4 sm:-mx-8 px-4 sm:px-8 scrollbar-hide select-none">
        {COLUMNS.map((col) => (
          <div key={col.id} className="kanban-column shrink-0 w-[280px] sm:w-[320px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wider">{col.title}</h3>
                <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">
                  {leads.filter(l => l.status === col.id).length}
                </span>
              </div>
              <button className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px]">
              {leads
                .filter(l => l.status === col.id)
                .map((lead) => (
                  <motion.div 
                    layoutId={lead.id}
                    key={lead.id} 
                    className="kanban-card group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{lead.name}</h4>
                      <button className="text-gray-300 hover:text-gray-600">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail size={12} />
                        <span className="truncate">{lead.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-100">
                          <DollarSign size={10} />
                          <span>{lead.value.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {lead.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              {leads.filter(l => l.status === col.id).length === 0 && (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8">
                  <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Nenhum lead aqui</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
