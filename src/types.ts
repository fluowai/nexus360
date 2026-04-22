export interface MetricCards {
  leads: number;
  conversions: number;
  revenue: number;
  contentCount: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  status: 'novo' | 'contato' | 'qualificado' | 'proposta' | 'fechado';
  value: number;
  tags: string[];
}

export interface Project {
  id: string;
  title: string;
  deadline: string;
  status: 'planejamento' | 'execucao' | 'revisao' | 'concluido';
  tasks: { id: string; title: string; completed: boolean }[];
}

export interface ContentItem {
  id: string;
  title: string;
  type: 'instagram' | 'blog' | 'email' | 'linkedin';
  status: 'rascunho' | 'aprovacao' | 'publicado';
  date: string;
  content?: string;
}
