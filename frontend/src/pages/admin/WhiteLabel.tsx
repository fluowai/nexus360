import { useState } from "react";
import { 
  Palette, 
  Globe, 
  Image as ImageIcon, 
  Save, 
  Smartphone,
  Layout,
  Type
} from "lucide-react";
import { motion } from "motion/react";

export default function WhiteLabel() {
  const [settings, setSettings] = useState({
    primaryColor: '#2563eb',
    companyName: 'Nexus360 Digital',
    defaultLanguage: 'pt-BR',
    enableRegistration: true,
    showSupportWidget: true,
  });

  const handleSave = () => {
    alert("Configurações salvas com sucesso (Simulado)");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">White-label & Branding</h1>
          <p className="text-sm text-gray-500">Personalize a identidade visual e comportamental da plataforma globalmente.</p>
        </div>
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 font-bold"
        >
          <Save size={20} />
          <span>Salvar Alterações</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Visual Identity */}
          <section className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Palette size={20} className="text-primary" />
              Identidade Visual
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Cor Primária (Hex)</label>
                <div className="flex gap-3">
                  <input 
                    type="color" 
                    className="w-12 h-12 rounded-xl cursor-pointer border-none"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  />
                  <input 
                    type="text"
                    className="flex-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none font-mono"
                    value={settings.primaryColor}
                    onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome do Sistema</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-primary border-none"
                    value={settings.companyName}
                    onChange={e => setSettings({...settings, companyName: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-50">
               <label className="text-xs font-bold text-gray-400 uppercase mb-4 block">Logotipos</label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="p-8 border-2 border-dashed border-gray-100 rounded-[24px] flex flex-col items-center justify-center text-center group hover:border-primary transition-colors cursor-pointer">
                    <ImageIcon className="text-gray-300 group-hover:text-primary mb-2" size={32} />
                    <p className="text-sm font-bold text-gray-900">Logo Principal</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-1 font-bold">PNG ou SVG (200x50)</p>
                 </div>
                 <div className="p-8 border-2 border-dashed border-gray-100 rounded-[24px] flex flex-col items-center justify-center text-center group hover:border-primary transition-colors cursor-pointer">
                    <Smartphone className="text-gray-300 group-hover:text-primary mb-2" size={32} />
                    <p className="text-sm font-bold text-gray-900">Favicon</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-1 font-bold">ICO ou PNG (32x32)</p>
                 </div>
               </div>
            </div>
          </section>

          {/* System Config */}
          <section className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Layout size={20} className="text-primary" />
              Configurações de Experiência
            </h3>

            <div className="space-y-4">
              {[
                { key: 'enableRegistration', label: 'Permitir Novos Cadastros (Auto-registro)', desc: 'Habilita o formulário de cadastro na página de login.' },
                { key: 'showSupportWidget', label: 'Exibir Chat de Suporte Global', desc: 'Mostra o widget de ajuda para todos os usuários da plataforma.' }
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, [opt.key]: !settings[opt.key as keyof typeof settings]})}
                    className={`w-12 h-6 rounded-full transition-all relative ${settings[opt.key as keyof typeof settings] ? 'bg-primary' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings[opt.key as keyof typeof settings] ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-900/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16 rounded-full" />
            <Globe className="text-primary mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Domínio Principal</h3>
            <p className="text-gray-400 text-sm mb-6">Configuração do endereço base da plataforma.</p>
            
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl mb-4">
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">APP URL</p>
               <p className="text-sm font-mono font-bold">app.nexus360.com.br</p>
            </div>
            
            <button className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all">
              Gerenciar DNS
            </button>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-widest text-center">Preview em Tempo Real</h3>
            <div className="aspect-video bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center p-4">
               <div className="w-full h-full bg-white rounded-lg shadow-sm overflow-hidden flex">
                  <div className="w-4 bg-gray-900 h-full" />
                  <div className="flex-1 p-2">
                     <div className="h-2 w-12 bg-gray-100 rounded mb-2" />
                     <div className={`h-4 w-16 rounded mb-4`} style={{ backgroundColor: settings.primaryColor }} />
                     <div className="space-y-1">
                        <div className="h-1 w-full bg-gray-50 rounded" />
                        <div className="h-1 w-full bg-gray-50 rounded" />
                        <div className="h-1 w-3/4 bg-gray-50 rounded" />
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
