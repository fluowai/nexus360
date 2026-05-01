import React from "react";
import { useState, useEffect } from "react";
import { 
  HelpCircle, 
  Plus, 
  Play, 
  Settings, 
  Trash2, 
  Copy, 
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  MessageSquare,
  Mail,
  Phone,
  Users,
  BarChart3,
  ExternalLink
} from "lucide-react";
import QuizExperience from "../components/QuizExperience";
import { apiFetch } from "../lib/api";

interface Quiz {
  id: string;
  name: string;
  description?: string;
  quizType: string;
  isActive: boolean;
  scoringType: string;
  passScore?: number;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options?: string;
  isRequired: boolean;
  order: number;
  points: number;
}

interface QuizSubmission {
  id: string;
  score?: number;
  segment?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
}

const questionTypes = [
  { value: 'multiple_choice', label: 'Múltipla Escolha', icon: HelpCircle },
  { value: 'multiple_select', label: 'Múltipla Seleção', icon: CheckCircle },
  { value: 'rating', label: 'Avaliação (1-5)', icon: BarChart3 },
  { value: 'text', label: 'Texto Livre', icon: MessageSquare },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'phone', label: 'Telefone', icon: Phone }
];

export default function QuizBuilder() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'submissions'>('list');
  const [showPreview, setShowPreview] = useState(false);

  const orgId = localStorage.getItem('nexus_org_id');

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizzesRes] = await Promise.all([
        apiFetch(`/api/quizzes`)
      ]);
      
      if (!quizzesRes.ok) {
        const errorData = await quizzesRes.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch quizzes');
      }
      
      const quizzesData = await quizzesRes.json();
      setQuizzes(quizzesData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const fetchSubmissions = async (quizId: string) => {
    try {
      const res = await apiFetch(`/api/quizzes/${quizId}/submissions`);
      const data = await res.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await apiFetch('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          quizType: formData.get('quizType'),
          scoringType: formData.get('scoringType'),
          passScore: formData.get('passScore')
        })
      });
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("Error creating quiz:", error);
    }
  };

  const toggleQuizStatus = async (quiz: Quiz) => {
    try {
      await apiFetch(`/api/quizzes/${quiz.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !quiz.isActive })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating quiz:", error);
    }
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este quiz?')) return;
    try {
      await apiFetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  const addQuestion = async (quizId: string) => {
    const currentQuiz = quizzes.find(q => q.id === quizId);
    const nextOrder = currentQuiz ? currentQuiz.questions.length : 0;
    
    try {
      await apiFetch(`/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          questionText: 'Nova Pergunta',
          questionType: 'multiple_choice',
          options: JSON.stringify(['Opção 1', 'Opção 2', 'Opção 3']),
          isRequired: true,
          order: nextOrder,
          points: 1
        })
      });
      fetchData();
    } catch (error) {
      console.error("Error adding question:", error);
    }
  };

  const duplicateQuiz = async (quiz: Quiz) => {
    try {
      await apiFetch('/api/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          name: quiz.name + ' (Cópia)',
          description: quiz.description,
          quizType: quiz.quizType,
          scoringType: quiz.scoringType,
          passScore: quiz.passScore
        })
      });
      fetchData();
    } catch (error) {
      console.error("Error duplicating quiz:", error);
    }
  };

  const getScoreLabel = (score?: number, passScore?: number) => {
    if (!score) return '-';
    if (passScore && score >= passScore) return { text: 'Qualificado', color: 'text-green-600' };
    return { text: 'Não Qualificado', color: 'text-red-600' };
  };

  const totalSubmissions = quizzes.reduce((sum, q) => sum + (q.questions?.length || 0), 0);
  const activeQuizzes = quizzes.filter(q => q.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz / Lead Qualifier</h1>
          <p className="text-gray-500 mt-1">Crie quizzes para qualificar seus leads</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all font-medium"
        >
          <Plus size={18} />
          <span>Novo Quiz</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Quizzes</p>
              <p className="text-2xl font-bold">{quizzes.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Quizzes Ativos</p>
              <p className="text-2xl font-bold">{activeQuizzes}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Respostas</p>
              <p className="text-2xl font-bold">{submissions.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Perguntas</p>
              <p className="text-2xl font-bold">{totalSubmissions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'list' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Quizzes
        </button>
        <button
          onClick={() => { setActiveTab('submissions'); setSelectedQuiz(quizzes[0]); fetchSubmissions(quizzes[0]?.id); }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'submissions' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Respostas
        </button>
      </div>

      {/* Quizzes List */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                <div className="h-12 bg-gray-100 rounded-xl mb-4" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          ) : quizzes.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum quiz criado</h3>
              <p className="text-gray-500 mb-4">Crie seu primeiro quiz para qualificar leads</p>
              <button 
                onClick={() => setShowModal(true)}
                className="text-primary hover:underline"
              >
                Criar Quiz
              </button>
            </div>
          ) : (
            quizzes.map(quiz => (
              <div 
                key={quiz.id} 
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  selectedQuiz?.id === quiz.id ? 'ring-2 ring-primary border-primary' : 'border-gray-100 hover:shadow-md'
                }`}
                onClick={() => setSelectedQuiz(quiz)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      quiz.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <HelpCircle className={`w-6 h-6 ${quiz.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleQuizStatus(quiz); }}
                        className={`p-2 rounded-lg ${quiz.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        title={quiz.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {quiz.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </button>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedQuiz(quiz);
                          setShowPreview(true);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg text-primary"
                        title="Visualizar (Respondi style)"
                      >
                        <Play size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Editar"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteQuiz(quiz.id); }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1">{quiz.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{quiz.description || 'Sem descrição'}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <HelpCircle size={14} />
                      {quiz.questions?.length || 0} perguntas
                    </span>
                    <span className="capitalize">{quiz.quizType}</span>
                  </div>
                  
                  {selectedQuiz?.id === quiz.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); addQuestion(quiz.id); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-primary rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Plus size={16} />
                          Adicionar Pergunta
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); duplicateQuiz(quiz); }}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                        >
                          <Copy size={16} />
                          Duplicar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {quiz.passScore && (
                  <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 flex items-center justify-between">
                    <span>Score mínimo</span>
                    <span className="font-medium">{quiz.passScore} pontos</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Data</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Nome</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">E-mail</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Score</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Segmento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhuma resposta ainda
                    </td>
                  </tr>
                ) : (
                  submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sub.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 font-medium">{sub.contactName || '-'}</td>
                      <td className="px-6 py-4 text-gray-500">{sub.contactEmail || '-'}</td>
                      <td className="px-6 py-4">
                        {sub.score !== null && sub.score !== undefined ? (
                          <span className={`font-medium ${
                            sub.score >= (selectedQuiz?.passScore || 0) ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {sub.score} pts
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {sub.segment ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {sub.segment}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Create Quiz */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Criar Quiz</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  name="name" 
                  required
                  placeholder="Ex: Qualificação - Cliente Ideal"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea 
                  name="description" 
                  rows={2}
                  placeholder="Descrição do quiz"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select 
                  name="quizType" 
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="qualification">Qualificação de Lead</option>
                  <option value="assessment">Avaliação</option>
                  <option value="recommendation">Recomendação</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Scoring</label>
                <select 
                  name="scoringType" 
                  required
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="points">Pontos</option>
                  <option value="segments">Segmentos</option>
                  <option value="binary">Binário (Qualificado/Não)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pontuação Mínima (opcional)</label>
                <input 
                  type="number" 
                  name="passScore" 
                  placeholder="50"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-600 transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Experience Preview (Respondi Style) */}
      {showPreview && selectedQuiz && (
        <QuizExperience 
          quizName={selectedQuiz.name}
          questions={selectedQuiz.questions.map(q => ({
            id: q.id,
            text: q.questionText,
            type: q.questionType as any,
            options: q.options ? JSON.parse(q.options) : [],
            required: q.isRequired
          }))}
          onComplete={(answers) => {
            console.log("Quiz completed with answers:", answers);
          }}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}