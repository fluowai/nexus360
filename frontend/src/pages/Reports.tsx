import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Download, Filter, TrendingUp, FileSpreadsheet, ImageIcon, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";

const PIE_DATA = [
  { name: 'SaaS', value: 400 },
  { name: 'Infoprodutos', value: 300 },
  { name: 'E-commerce', value: 300 },
  { name: 'Local', value: 200 },
];
const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

const PERFORMANCE_DATA = [
  { month: 'Jan', roi: 4.5, spent: 4000 },
  { month: 'Fev', roi: 5.2, spent: 4500 },
  { month: 'Mar', roi: 4.8, spent: 5000 },
  { month: 'Abr', roi: 6.1, spent: 6000 },
  { month: 'Mai', roi: 5.5, spent: 7000 },
];

export default function Reports() {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPNG = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (ref.current === null) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(ref.current, { backgroundColor: '#ffffff', cacheBust: true });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Erro ao exportar PNG:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Relatórios Detalhados</h1>
          <p className="text-gray-500">Analise a performance global e ROI dos seus clientes.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all">
            <Filter size={18} />
            <span>Mensal</span>
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium">
              <Download size={18} />
              <span>Exportar Todos</span>
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 overflow-hidden">
              <button 
                onClick={() => exportToCSV(PERFORMANCE_DATA, "performance_agencia")}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              >
                <FileSpreadsheet size={16} className="text-green-600" />
                <span>Exportar Dados (CSV)</span>
              </button>
              <button 
                onClick={async () => {
                   await exportToPNG(pieChartRef, "distribuicao_nicho");
                   await exportToPNG(barChartRef, "roi_mensal");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-50 transition-colors"
              >
                <ImageIcon size={16} className="text-blue-500" />
                <span>Exportar Imagens (PNG)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card flex flex-col" ref={pieChartRef}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-gray-900">Distribuição de Receita por Nicho</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => exportToPNG(pieChartRef, "distribuicao_nicho")}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors hover:bg-blue-50 rounded"
                title="Saldar PNG"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center flex-wrap gap-4 mt-4">
            {PIE_DATA.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs font-medium text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card flex flex-col" ref={barChartRef}>
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col">
              <h3 className="font-bold text-lg text-gray-900">ROI Mensal Médio</h3>
              <div className="text-green-600 flex items-center gap-1 text-sm font-bold mt-1">
                <TrendingUp size={16} />
                <span>+14% vs mês anterior</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => exportToCSV(PERFORMANCE_DATA, "roi_mensal")}
                className="p-1.5 text-gray-400 hover:text-green-600 transition-colors hover:bg-green-50 rounded"
                title="Saldar CSV"
              >
                <FileSpreadsheet size={16} />
              </button>
              <button 
                onClick={() => exportToPNG(barChartRef, "roi_mensal")}
                className="p-1.5 text-gray-400 hover:text-primary transition-colors hover:bg-blue-50 rounded"
                title="Salvar PNG"
              >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              </button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={0}>
              <BarChart data={PERFORMANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="roi" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-gray-900">Performance por Canal</h3>
          <button 
            onClick={() => exportToCSV([
              { name: 'Meta Ads', ctr: '2.4%', cpl: 'R$ 4.20', roas: '4.5x', status: 'Excelente' },
              { name: 'Google Ads', ctr: '1.8%', cpl: 'R$ 8.50', roas: '3.2x', status: 'Estável' },
              { name: 'TikTok Ads', ctr: '4.2%', cpl: 'R$ 3.10', roas: '2.8x', status: 'Otimizando' },
              { name: 'LinkedIn Ads', ctr: '0.9%', cpl: 'R$ 42.00', roas: '1.2x', status: 'Abaixo' },
            ], "performance_canais")}
            className="flex items-center gap-2 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 transition-colors"
          >
            <FileSpreadsheet size={14} />
            <span>EXPORTAR TABELA</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 italic text-gray-400 text-xs">
                <th className="pb-4 font-medium pl-2 uppercase">Canal</th>
                <th className="pb-4 font-medium uppercase text-center">CTR</th>
                <th className="pb-4 font-medium uppercase text-center">CPL Médio</th>
                <th className="pb-4 font-medium uppercase text-center">ROAS</th>
                <th className="pb-4 font-medium uppercase text-right pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                { name: 'Meta Ads', ctr: '2.4%', cpl: 'R$ 4.20', roas: '4.5x', status: 'Excelente' },
                { name: 'Google Ads', ctr: '1.8%', cpl: 'R$ 8.50', roas: '3.2x', status: 'Estável' },
                { name: 'TikTok Ads', ctr: '4.2%', cpl: 'R$ 3.10', roas: '2.8x', status: 'Otimizando' },
                { name: 'LinkedIn Ads', ctr: '0.9%', cpl: 'R$ 42.00', roas: '1.2x', status: 'Abaixo' },
              ].map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-none hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 pl-2 font-bold text-gray-700">{item.name}</td>
                  <td className="py-4 text-center text-gray-500 font-medium">{item.ctr}</td>
                  <td className="py-4 text-center text-green-600 font-bold">{item.cpl}</td>
                  <td className="py-4 text-center font-bold text-gray-900">{item.roas}</td>
                  <td className="py-4 text-right pr-2">
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${
                      item.status === 'Excelente' ? 'bg-green-100 text-green-700' :
                      item.status === 'Estável' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'Otimizando' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

