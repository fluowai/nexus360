import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  FileText,
  Headphones,
  Image,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  PlugZap,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Smile,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type MainTab = "instances" | "llms" | "messages";
type MessageTab = "direct" | "groups";

type Connection = {
  id: string;
  identifier: string;
  isActive: boolean;
  config?: any;
  inbox?: { id?: string; name: string };
};

type Conversation = {
  id: string;
  subject: string;
  contactId?: string;
  status: string;
  lastMessageAt: string;
  metadata?: any;
  messages?: Message[];
  _count?: { messages: number };
};

type Message = {
  id: string;
  senderType: string;
  content?: string;
  type: string;
  fileUrl?: string;
  metadata?: any;
  createdAt: string;
};

type LlmSettings = {
  aiProvider: string;
  groqKey: string;
  geminiKey: string;
  openaiKey: string;
  chatgptKey: string;
};

const providerCards = [
  { id: "groq", name: "Groq", hint: "Llama rapido para agentes e qualificacao." },
  { id: "gemini", name: "Gemini", hint: "Google AI para respostas longas e analise." },
  { id: "chatgpt", name: "ChatGPT", hint: "Configuracao separada para fluxos ChatGPT." },
  { id: "openai", name: "OpenAI", hint: "API OpenAI para automacoes e modelos GPT." },
];

const blankLlms: LlmSettings = {
  aiProvider: "groq",
  groqKey: "",
  geminiKey: "",
  openaiKey: "",
  chatgptKey: "",
};

const formatWhatsAppPhone = (value?: string) => {
  const raw = String(value || "").trim();
  const digits = raw.includes("@") ? raw.slice(0, raw.indexOf("@")).split(":")[0].replace(/\D/g, "") : raw.replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!normalized.startsWith("55") || normalized.length < 12) return `+${normalized}`;
  const ddd = normalized.slice(2, 4);
  const subscriber = normalized.slice(4);
  if (subscriber.length === 9) return `+55 ${ddd} ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
  if (subscriber.length === 8) return `+55 ${ddd} ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
  return `+${normalized}`;
};

const isRawWhatsAppId = (value?: string) => /@/.test(String(value || "")) || /^\+?\d{10,16}(:\d+)?$/.test(String(value || "").replace(/\s/g, ""));

const cleanDisplayText = (...values: Array<string | undefined | null>) => {
  const found = values.map((value) => String(value || "").trim()).find((value) => value && !isRawWhatsAppId(value));
  return found || "";
};

const connectionName = (connection: Connection) =>
  connection.config?.label || connection.config?.pushName || connection.inbox?.name || connection.identifier;

const connectionStatus = (connection: Connection) =>
  connection.isActive ? connection.config?.status || "created" : "inactive";

const connectionStatusClass = (connection: Connection) =>
  connection.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500";

const conversationTitle = (conversation: Conversation) =>
  cleanDisplayText(conversation.metadata?.displayName, conversation.subject, conversation.metadata?.group?.name) ||
  formatWhatsAppPhone(conversation.metadata?.phone || conversation.contactId) ||
  "Contato WhatsApp";

const conversationSubline = (conversation: Conversation) => {
  if (conversation.metadata?.isGroup) {
    const count = Array.isArray(conversation.metadata?.participants) ? conversation.metadata.participants.length : 0;
    return count ? `${count} participantes` : "Grupo WhatsApp";
  }
  return cleanDisplayText(conversation.metadata?.pushName) || conversation.metadata?.displayPhone || formatWhatsAppPhone(conversation.metadata?.phone || conversation.contactId);
};

const messageSender = (message: Message, selectedConversation?: Conversation | null) => {
  if (message.senderType === "USER" || message.metadata?.fromMe) return "Voce";
  return cleanDisplayText(message.metadata?.displayName, message.metadata?.pushName, message.metadata?.senderName)
    || message.metadata?.displayPhone
    || selectedConversation?.metadata?.senderDisplayPhone
    || selectedConversation?.metadata?.displayPhone
    || "Contato";
};

function MediaPreview({ message }: { message: Message }) {
  if (!message.fileUrl) return null;
  if (message.type === "image" || message.type === "sticker") {
    return <img src={message.fileUrl} alt={message.metadata?.fileName || "Imagem"} className="mt-2 max-h-60 rounded-xl border border-gray-100 object-cover" />;
  }
  if (message.type === "audio") {
    return <audio src={message.fileUrl} controls className="mt-2 w-full" />;
  }
  if (message.type === "video") {
    return <video src={message.fileUrl} controls className="mt-2 max-h-72 w-full rounded-xl" />;
  }

  return (
    <a href={message.fileUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:border-emerald-200">
      <FileText size={15} />
      {message.metadata?.fileName || message.metadata?.mimeType || "Abrir documento"}
    </a>
  );
}

function parseMessageJson(message: Message) {
  try {
    return message.content ? JSON.parse(message.content) : null;
  } catch {
    return null;
  }
}

function firstPayloadText(payload: any, keys: string[]) {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], payload);
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function StructuredMessageCard({ icon: Icon, title, detail }: { icon: any; title: string; detail?: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-gray-700">
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>
        {title}
        {detail && <span className="block text-xs font-medium opacity-70">{detail}</span>}
      </span>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  const payload = parseMessageJson(message);

  if ((message.type === "location" || message.type === "live_location") && payload) {
    const mapsUrl = payload.url || (payload.latitude && payload.longitude ? `https://www.google.com/maps?q=${payload.latitude},${payload.longitude}` : "");
    return (
      <a href={mapsUrl || undefined} target="_blank" rel="noreferrer" className="mt-2 flex items-start gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-gray-700">
        <MapPin size={16} className="mt-0.5 shrink-0" />
        <span>
          {payload.name || (message.type === "live_location" ? "Localizacao ao vivo" : "Localizacao compartilhada")}
          {payload.address && <span className="block text-xs font-medium opacity-70">{payload.address}</span>}
        </span>
      </a>
    );
  }

  if (message.type === "contact" && payload) {
    const contacts = Array.isArray(payload.contacts) ? payload.contacts : [payload];
    return (
      <div className="mt-2 space-y-2">
        {contacts.map((contact: any, index: number) => (
          <div key={`${contact.displayName || index}`} className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-sm font-bold text-gray-700">
            <UserRound size={16} />
            <span className="truncate">{contact.displayName || "Contato compartilhado"}</span>
          </div>
        ))}
      </div>
    );
  }

  if (message.type === "reaction") {
    return (
      <p className="inline-flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm font-bold">
        <Smile size={15} />
        Reagiu {payload?.text ? `com ${payload.text}` : "a uma mensagem"}
      </p>
    );
  }

  if (message.type === "deleted") {
    return <p className="text-sm font-medium italic opacity-70">Mensagem apagada.</p>;
  }

  if (message.type === "edited") {
    return <p className="text-sm font-medium italic opacity-70">Mensagem editada.</p>;
  }

  if (message.type === "poll" && payload) {
    const optionCount = Array.isArray(payload.options) ? payload.options.length : 0;
    return <StructuredMessageCard icon={MessageCircle} title={payload.name || "Enquete recebida"} detail={optionCount ? `${optionCount} opcoes` : undefined} />;
  }

  if (message.type === "poll_update") {
    return <StructuredMessageCard icon={CheckCircle2} title="Atualizacao de enquete recebida" />;
  }

  if (message.type === "interactive" && payload) {
    const title = firstPayloadText(payload, [
      "selectedDisplayText",
      "selectedRowId",
      "buttonText.displayText",
      "hydratedTemplate.hydratedContentText",
      "body.text",
      "footer.text",
      "title",
    ]);
    return <StructuredMessageCard icon={MessageCircle} title={title || "Mensagem interativa recebida"} detail={message.metadata?.rawType || undefined} />;
  }

  if (message.type === "call") {
    return <StructuredMessageCard icon={Phone} title="Registro de chamada recebido" />;
  }

  if (message.type === "event" && payload) {
    const title = firstPayloadText(payload, ["name", "title", "description"]) || "Evento recebido";
    const detail = firstPayloadText(payload, ["location.name", "location.address", "description"]);
    return <StructuredMessageCard icon={MapPin} title={title} detail={detail || undefined} />;
  }

  if (message.type === "commerce" && payload) {
    const title = firstPayloadText(payload, ["title", "product.name", "orderTitle", "sellerJid"]) || "Mensagem comercial recebida";
    return <StructuredMessageCard icon={FileText} title={title} detail={message.metadata?.rawType || undefined} />;
  }

  if (message.content) {
    return <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed">{message.content}</p>;
  }

  return null;
}

export default function WhatsApp() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<MainTab>("instances");
  const [messageTab, setMessageTab] = useState<MessageTab>("direct");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instanceName, setInstanceName] = useState("");
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [reply, setReply] = useState("");
  const [llms, setLlms] = useState<LlmSettings>(blankLlms);
  const [loading, setLoading] = useState(false);
  const [savingLlms, setSavingLlms] = useState(false);
  const [sending, setSending] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const activeConnection = useMemo(
    () => connections.find((conn) => conn.config?.status === "connected" && conn.isActive) || connections.find((conn) => conn.isActive),
    [connections]
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "instances" || tab === "llms" || tab === "messages") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const loadConnections = async () => {
    const res = await apiFetch("/api/whatsapp/connections");
    const data = await res.json();
    setConnections(Array.isArray(data) ? data : []);
  };

  const loadConversations = async (kind = messageTab) => {
    const res = await apiFetch(`/api/whatsapp/conversations?kind=${kind}`);
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
  };

  const loadLlms = async () => {
    const res = await apiFetch("/api/org/settings");
    if (!res.ok) return;
    const data = await res.json();
    setLlms({
      aiProvider: data.aiProvider || "groq",
      groqKey: data.groqKey || "",
      geminiKey: data.geminiKey || "",
      openaiKey: data.openaiKey || "",
      chatgptKey: data.chatgptKey || "",
    });
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadConnections(), loadConversations(messageTab), loadLlms()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    const timer = window.setInterval(() => {
      loadConnections();
      loadConversations(messageTab);
    }, 12000);
    return () => window.clearInterval(timer);
  }, [messageTab]);

  const createConnection = async () => {
    const name = instanceName.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/whatsapp/connections", {
        method: "POST",
        body: JSON.stringify({ label: name, inboxName: name }),
      });
      const data = await res.json();
      
      if (data && data.id) {
        await apiFetch(`/api/whatsapp/connections/${data.id}/connect`, {
          method: "POST"
        });
      }

      setInstanceName("");
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const saveInstance = async (connection: Connection) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}`, {
        method: "PATCH",
        body: JSON.stringify({ label: editingLabel, inboxName: editingLabel, isActive: connection.isActive }),
      });
      setEditingInstanceId(null);
      setEditingLabel("");
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const toggleInstance = async (connection: Connection) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !connection.isActive }),
      });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async (connection: Connection) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${connection.id}/connect`, {
        method: "POST"
      });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async (id: string) => {
    setLoading(true);
    try {
      await apiFetch(`/api/whatsapp/connections/${id}`, { method: "DELETE" });
      await loadConnections();
    } finally {
      setLoading(false);
    }
  };

  const saveLlms = async () => {
    setSavingLlms(true);
    try {
      await apiFetch("/api/org/settings", {
        method: "PATCH",
        body: JSON.stringify(llms),
      });
      await loadLlms();
    } finally {
      setSavingLlms(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    const res = await apiFetch(`/api/whatsapp/conversations/${conversation.id}/messages`);
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  };

  const sendReply = async () => {
    if (!selectedConversation || !reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/api/whatsapp/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: reply.trim() }),
      });
      setReply("");
      await openConversation(selectedConversation);
      await loadConversations(messageTab);
    } finally {
      setSending(false);
    }
  };

  const dispatchProspecting = async () => {
    setDispatching(true);
    try {
      await apiFetch("/api/whatsapp/prospecting/dispatch", {
        method: "POST",
        body: JSON.stringify({ limit: 25 }),
      });
      await loadConversations(messageTab);
    } finally {
      setDispatching(false);
    }
  };

  const renderAvatar = (item: Conversation | Connection) => {
    const metadata = (item as any).metadata || (item as any).config || {};
    const src = metadata?.profilePictureUrl || metadata?.group?.pictureUrl;
    if (src) return <img src={src} alt="" className="h-11 w-11 rounded-xl object-cover" />;
    const isGroup = metadata?.isGroup || String(("contactId" in item && item.contactId) || "").includes("@g.us");
    const Icon = isGroup ? Users : MessageCircle;
    return <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Icon size={20} /></div>;
  };

  const renderTabButton = (id: MainTab, label: string, Icon: any) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSearchParams({ tab: id });
      }}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black ${activeTab === id ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <MessageCircle size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-950">WhatsApp</h1>
            <p className="text-sm font-medium text-gray-500">Conexoes Whatsmeow, LLMs e mensagens normais ou de grupos.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refreshAll} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Atualizar
          </button>
          <button onClick={dispatchProspecting} disabled={dispatching || !activeConnection} className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-xs font-black text-white hover:bg-black disabled:opacity-50">
            {dispatching ? <Loader2 size={15} className="animate-spin" /> : <Bot size={15} />}
            Disparar fila IA
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        {renderTabButton("instances", "Conexoes", PlugZap)}
        {renderTabButton("llms", "LLMs", KeyRound)}
        {renderTabButton("messages", "Mensagens", MessageCircle)}
      </div>

      {activeTab === "instances" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Criar instancia</h2>
            <div className="mt-4 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da instancia</label>
              <div className="flex gap-2">
                <input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="Ex: SDR Paulo" className="min-w-0 flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100" />
                <button onClick={createConnection} disabled={loading || !instanceName.trim()} className="rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-50">Criar</button>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {connections.map((conn) => (
              <div key={conn.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderAvatar(conn)}
                    <div className="min-w-0">
                      {editingInstanceId === conn.id ? (
                        <input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm font-black outline-none" />
                      ) : (
                        <p className="truncate font-black text-gray-950">{connectionName(conn)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase ${connectionStatusClass(conn)}`}>
                      {connectionStatus(conn)}
                    </span>
                    {conn.config?.status === "qr" && conn.config?.qrPng && (
                      <img src={conn.config.qrPng} alt="QR Code WhatsApp" className="mt-2 h-24 w-24 rounded-lg border border-gray-200" />
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {editingInstanceId === conn.id ? (
                    <button onClick={() => saveInstance(conn)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50">
                      <Save size={14} />
                      Salvar
                    </button>
                  ) : (
                    <button onClick={() => { setEditingInstanceId(conn.id); setEditingLabel(connectionName(conn)); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 py-2 text-xs font-black text-gray-600 hover:bg-gray-50">
                      <Settings2 size={14} />
                      Editar
                    </button>
                  )}
                  <button onClick={() => connectInstance(conn)} disabled={loading || conn.config?.status === "connected"} className="rounded-xl border border-emerald-600 bg-emerald-50 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">
                    Gerar QR Code
                  </button>
                  <button onClick={() => toggleInstance(conn)} disabled={loading} className="rounded-xl border border-gray-200 py-2 text-xs font-black text-gray-600 hover:bg-gray-50">
                    {conn.isActive ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => deleteInstance(conn.id)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 py-2 text-xs font-black text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}

      {activeTab === "llms" && (
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-950">LLMs dos agentes</h2>
              <p className="text-sm font-medium text-gray-500">Configure Groq, Gemini, ChatGPT e OpenAI para os fluxos de WhatsApp e IA.</p>
            </div>
            <button onClick={saveLlms} disabled={savingLlms} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-xs font-black text-white disabled:opacity-50">
              {savingLlms ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Salvar LLMs
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            {providerCards.map((provider) => (
              <button key={provider.id} onClick={() => setLlms((current) => ({ ...current, aiProvider: provider.id }))} className={`rounded-2xl border p-4 text-left transition-all ${llms.aiProvider === provider.id ? "border-emerald-300 bg-emerald-50" : "border-gray-100 bg-gray-50 hover:bg-white"}`}>
                <div className="mb-3 flex items-center justify-between">
                  <KeyRound size={20} className={llms.aiProvider === provider.id ? "text-emerald-700" : "text-gray-400"} />
                  {llms.aiProvider === provider.id && <CheckCircle2 size={18} className="text-emerald-700" />}
                </div>
                <p className="font-black text-gray-950">{provider.name}</p>
                <p className="mt-1 text-xs font-medium text-gray-500">{provider.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <LlmInput label="Groq API Key" value={llms.groqKey} onChange={(value) => setLlms((current) => ({ ...current, groqKey: value }))} />
            <LlmInput label="Gemini API Key" value={llms.geminiKey} onChange={(value) => setLlms((current) => ({ ...current, geminiKey: value }))} />
            <LlmInput label="ChatGPT API Key" value={llms.chatgptKey} onChange={(value) => setLlms((current) => ({ ...current, chatgptKey: value }))} />
            <LlmInput label="OpenAI API Key" value={llms.openaiKey} onChange={(value) => setLlms((current) => ({ ...current, openaiKey: value }))} />
          </div>
        </section>
      )}

      {activeTab === "messages" && (
        <div className="grid min-h-[620px] grid-cols-1 gap-5 xl:grid-cols-[400px_1fr]">
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Mensagens</h2>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setMessageTab("direct"); setSelectedConversation(null); loadConversations("direct"); }} className={`rounded-xl px-3 py-2 text-xs font-black ${messageTab === "direct" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-500"}`}>Normais</button>
                <button onClick={() => { setMessageTab("groups"); setSelectedConversation(null); loadConversations("groups"); }} className={`rounded-xl px-3 py-2 text-xs font-black ${messageTab === "groups" ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-500"}`}>Grupos</button>
              </div>
            </div>
            <div className="max-h-[700px] overflow-y-auto">
              {conversations.map((conversation) => (
                <button key={conversation.id} onClick={() => openConversation(conversation)} className={`flex w-full items-center gap-3 border-b border-gray-50 p-4 text-left hover:bg-emerald-50/40 ${selectedConversation?.id === conversation.id ? "bg-emerald-50" : ""}`}>
                  {renderAvatar(conversation)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-black text-gray-950">{conversationTitle(conversation)}</p>
                      <span className="text-[10px] font-bold text-gray-400">{conversation._count?.messages || 0}</span>
                    </div>
                    <p className="truncate text-xs font-medium text-gray-500">{conversation.messages?.[0]?.content || conversation.messages?.[0]?.metadata?.fileName || "Sem mensagem"}</p>
                    <p className="mt-1 truncate text-[10px] font-bold text-gray-400">{conversationSubline(conversation)}</p>
                  </div>
                </button>
              ))}
              {conversations.length === 0 && <p className="p-6 text-center text-sm font-bold text-gray-400">Nenhuma mensagem sincronizada ainda.</p>}
            </div>
          </section>

          <section className="flex overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            {selectedConversation ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {renderAvatar(selectedConversation)}
                    <div className="min-w-0">
                      <p className="truncate font-black text-gray-950">{conversationTitle(selectedConversation)}</p>
                      <p className="truncate text-xs font-bold text-gray-400">{conversationSubline(selectedConversation)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.metadata?.isGroup && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700"><Users size={12} /> Grupo</span>}
                    {selectedConversation.metadata?.prospectingRunId && <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-black text-purple-700"><Bot size={12} /> SDR IA</span>}
                  </div>
                </div>

                {selectedConversation.metadata?.participants?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
                    {selectedConversation.metadata.participants.slice(0, 12).map((participant: any, index: number) => (
                      <div key={participant.jid || participant.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                        {participant.pictureUrl ? <img src={participant.pictureUrl} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <Users size={15} className="text-gray-400" />}
                        <span className="max-w-[150px] truncate text-[11px] font-bold text-gray-600">
                          {cleanDisplayText(participant.displayName, participant.name, participant.pushName) || participant.displayPhone || formatWhatsAppPhone(participant.jid || participant.phoneNumber) || `Participante ${index + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-5">
                  {messages.map((message) => {
                    const fromMe = message.senderType === "USER" || message.metadata?.fromMe;
                    const Icon = message.type === "image" || message.type === "sticker" ? Image : message.type === "audio" ? Headphones : message.type === "document" ? FileText : message.type === "location" || message.type === "live_location" ? MapPin : message.type === "contact" ? UserRound : message.type === "reaction" ? Smile : MessageCircle;
                    return (
                      <div key={message.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${fromMe ? "bg-emerald-600 text-white" : "bg-white text-gray-800"}`}>
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70">
                            <Icon size={12} />
                            {messageSender(message, selectedConversation)}
                          </div>
                          <MessageBody message={message} />
                          <MediaPreview message={message} />
                          <p className="mt-2 text-[10px] font-bold opacity-60">{new Date(message.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 border-t border-gray-100 p-4">
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder pelo WhatsApp conectado..." className="min-h-[48px] flex-1 resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100" />
                  <button onClick={sendReply} disabled={sending || !reply.trim()} className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white disabled:opacity-50">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-gray-400">
                <CheckCircle2 size={42} />
                <p className="text-sm font-black">Selecione uma conversa</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function LlmInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Cole a chave aqui"
        className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 font-mono text-sm outline-none focus:border-emerald-200 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}
