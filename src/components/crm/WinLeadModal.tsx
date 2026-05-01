import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Building2, 
  User, 
  DollarSign, 
  FileText, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Sparkles
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { ContractAnalysisModal } from './ContractAnalysisModal';

interface WinLeadModalProps {
  lead: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TABS = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'responsavel', label: 'Responsável', icon: User },
  { id: 'comercial', label: 'Comercial', icon: DollarSign },
  { id: 'contrato', label: 'Contrato', icon: FileText }
];

export const WinLeadModal: React.FC<WinLeadModalProps> = ({ lead, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    corporateName: lead.company || '',
    tradeName: '',
    cnpj: '',
    emailFinance: '',
    website: '',
    address: '',
    city: '',
    state: '',
    respName: lead.name || '',
    respCpf: '',
    respEmail: lead.email || '',
    respPhone: lead.phone || '',
    respRole: '',
    product: '',
    setupValue: lead.value || 0,
    monthlyValue: 0,
    paymentMethod: 'Pix',
    billingDay: 5,
    contractTerm: 12,
    templateId: '',
    scope: '',
    additionalClauses: ''
  });

  const handleNext = () => {
    if (activeTab < TABS.length - 1) setActiveTab(activeTab + 1);
  };

  const handleBack = () => {
    if (activeTab > 0) setActiveTab(activeTab - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/leads/${lead.id}/win`, {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        onSuccess();
      } else {
        const text = await response.text();
        let errorMsg = "Erro ao processar venda";
        try {
          const json = JSON.parse(text);
          errorMsg = json.error || errorMsg;
        } catch (e) {
          errorMsg = `Erro ${response.status}: ${response.statusText}`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const products = [
    "Tráfego Pago", "SDR/BDR", "CRM", "Consultoria Comercial", 
    "Método ACP", "Landing Page", "Automação Comercial", "Funil Completo"
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden relative z-10 flex flex-col h-[85vh]"
      >
        <div className="p-8 border-b border-gray-100 flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Onboarding de Cliente</h2>
              <p className="text-sm text-gray-500">Transformando lead em operação ativa.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex items-center justify-between px-4">
            {TABS.map((tab, idx) => (
              <React.Fragment key={tab.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeTab >= idx ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400'
                  }`}>
                    <tab.icon size={20} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    activeTab >= idx ? 'text-blue-600' : 'text-gray-400'
                  }`}>{tab.label}</span>
                </div>
                {idx < TABS.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-4 rounded-full ${activeTab > idx ? 'bg-blue-600' : 'bg-gray-100'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto"
            >
              {activeTab === 0 && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Razão Social</label>
                    <input className="modal-input" value={formData.corporateName} onChange={e => setFormData({...formData, corporateName: e.target.value})} placeholder="Nome Oficial da Empresa" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">CNPJ</label>
                    <input className="modal-input" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} placeholder="00.000.000/0000-00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px) font-bold text-gray-400 uppercase tracking-widest ml-1">Site</label>
                    <input className="modal-input" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="www.empresa.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cidade</label>
                    <input className="modal-input" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Ex: São Paulo" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Estado</label>
                    <input className="modal-input" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="Ex: SP" />
                  </div>
                </div>
              )}

              {activeTab === 1 && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Nome do Responsável Legal</label>
                    <input className="modal-input" value={formData.respName} onChange={e => setFormData({...formData, respName: e.target.value})} placeholder="Nome Completo" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">CPF</label>
                    <input className="modal-input" value={formData.respCpf} onChange={e => setFormData({...formData, respCpf: e.target.value})} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cargo</label>
                    <input className="modal-input" value={formData.respRole} onChange={e => setFormData({...formData, respRole: e.target.value})} placeholder="Ex: Diretor Comercial" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">E-mail de Contato</label>
                    <input className="modal-input" value={formData.respEmail} onChange={e => setFormData({...formData, respEmail: e.target.value})} placeholder="contato@empresa.com" />
                  </div>
                </div>
              )}

              {activeTab === 2 && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Produto Vendido</label>
                    <select className="modal-input" value={formData.product} onChange={e => setFormData({...formData, product: e.target.value})}>
                      <option value="">Selecione o produto...</option>
                      {products.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Valor Mensal (R$)</label>
                    <input type="number" className="modal-input" value={formData.monthlyValue} onChange={e => setFormData({...formData, monthlyValue: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Valor Setup (R$)</label>
                    <input type="number" className="modal-input" value={formData.setupValue} onChange={e => setFormData({...formData, setupValue: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Dia de Vencimento</label>
                    <input type="number" className="modal-input" value={formData.billingDay} onChange={e => setFormData({...formData, billingDay: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Prazo Contratual (Meses)</label>
                    <input type="number" className="modal-input" value={formData.contractTerm} onChange={e => setFormData({...formData, contractTerm: Number(e.target.value)})} />
                  </div>
                </div>
              )}

              {activeTab === 3 && (
                <div className="space-y-6">
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-900">Geração Automática</h4>
                        <p className="text-xs text-blue-600">O contrato será gerado com as variáveis preenchidas.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAnalysisModalOpen(true)}
                      className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      Analisar Modelos com IA
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Escopo Detalhado (Variável {"{{escopo_servico}}"})</label>
                    <textarea className="modal-input min-h-[120px] resize-none" value={formData.scope} onChange={e => setFormData({...formData, scope: e.target.value})} placeholder="Descreva exatamente o que será entregue..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cláusulas Adicionais</label>
                    <textarea className="modal-input min-h-[80px] resize-none" value={formData.additionalClauses} onChange={e => setFormData({...formData, additionalClauses: e.target.value})} placeholder="Observações jurídicas extras..." />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <button 
            onClick={handleBack}
            disabled={activeTab === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
              activeTab === 0 ? 'text-gray-300 pointer-events-none' : 'text-gray-600 hover:bg-white border border-gray-200'
            }`}
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          
          <div className="flex gap-3">
            {activeTab < TABS.length - 1 ? (
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-200 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    <CheckCircle2 size={18} />
                    Finalizar Venda
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isAnalysisModalOpen && (
          <ContractAnalysisModal 
            onClose={() => setIsAnalysisModalOpen(false)}
            onSelect={(id, content) => {
              setFormData({...formData, scope: content});
              setIsAnalysisModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
