import React, { useState, useEffect } from 'react';
import { Users, ChevronDown, Check, Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface Client {
  id: string;
  corporateName: string;
  tradeName: string | null;
}

interface ClientSelectorProps {
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  collapsed?: boolean;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  selectedClientId, 
  onSelectClient,
  collapsed 
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await apiFetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setClients(data);
          } else {
            setClients([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch clients");
        setClients([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (collapsed) {
    return (
      <div className="flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 cursor-pointer transition-colors">
        <Users size={20} />
      </div>
    );
  }

  return (
    <div className="relative px-2 mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contexto de Operação</span>
      </div>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
          selectedClient 
            ? 'bg-blue-50/50 border-blue-100 text-blue-900 shadow-sm' 
            : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            selectedClient ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
          }`}>
            <Users size={16} />
          </div>
          <div className="text-left overflow-hidden">
            <p className="text-xs font-bold truncate">
              {selectedClient ? (selectedClient.tradeName || selectedClient.corporateName) : 'Selecionar Cliente'}
            </p>
            {selectedClient && <p className="text-[10px] opacity-70 truncate">Atendimento Ativo</p>}
          </div>
        </div>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-2 right-2 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-20 py-2 max-h-60 overflow-y-auto custom-scrollbar">
            <div 
              onClick={() => {
                onSelectClient(null);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-4 py-2 text-xs font-medium cursor-pointer hover:bg-gray-50 ${!selectedClientId ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <span>Visão Global</span>
              {!selectedClientId && <Check size={14} />}
            </div>
            
            <div className="h-[1px] bg-gray-50 my-1" />
            
            {clients.map(client => (
              <div 
                key={client.id}
                onClick={() => {
                  onSelectClient(client.id);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium cursor-pointer hover:bg-gray-50 ${selectedClientId === client.id ? 'text-blue-600 bg-blue-50/30' : 'text-gray-700'}`}
              >
                <span className="truncate">{client.tradeName || client.corporateName}</span>
                {selectedClientId === client.id && <Check size={14} />}
              </div>
            ))}

            <div className="h-[1px] bg-gray-50 my-1" />
            <button className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">
              <Plus size={14} />
              Novo Cliente
            </button>
          </div>
        </>
      )}
    </div>
  );
};
