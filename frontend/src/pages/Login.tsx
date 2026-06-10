import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, readJsonResponse, setAccessToken } from "../lib/api";
import { workspacePath } from "../lib/workspaceRoute";
import { useWhitelabel } from "../lib/useWhitelabel";
import { Mail, Lock, ArrowRight, Zap, Palette, Monitor, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function Login({ onAuthenticated }: { onAuthenticated?: (user: any) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [isWhitelabel, setIsWhitelabel] = useState(false);
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [wlPrimaryColor, setWlPrimaryColor] = useState("#3B82F6");
  const [wlSecondaryColor, setWlSecondaryColor] = useState("#1E40AF");
  const [wlLogoUrl, setWlLogoUrl] = useState("");
  const { config: whiteLabel, customDomain } = useWhitelabel();
  const brandLabel = whiteLabel?.name || "Nexus360";

  useEffect(() => {
    if (customDomain) setIsRegister(false);
  }, [customDomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (customDomain && isRegister) {
        throw new Error("Cadastro indisponivel neste dominio.");
      }

      const endpoint = isRegister
        ? (isWhitelabel ? "/api/auth/register/whitelabel" : "/api/auth/register")
        : "/api/auth/login";
      const body = isRegister
        ? isWhitelabel
          ? { name, email, password, organizationName: orgName, brandName: brandName || orgName, logoUrl: wlLogoUrl || undefined, primaryColor: wlPrimaryColor, secondaryColor: wlSecondaryColor }
          : { name, email, password, organizationName: orgName }
        : { email, password };

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data = await readJsonResponse(res, "Nao foi possivel conectar a API. Verifique o roteamento /api do dominio.");
      
      if (!res.ok) {
        throw new Error(data.error || data.details || "Erro no login");
      }

      setAccessToken(data.token);
      onAuthenticated?.(data.user);
      localStorage.setItem("nexus_user_role", data.user.role);
      localStorage.setItem("nexus_user_name", data.user.name || "");
      localStorage.setItem("nexus_org_id", data.user.orgId);
      localStorage.setItem("nexus_org_slug", data.user.orgSlug || "");
      localStorage.setItem("nexus_org_type", data.user.orgType || "CLIENT");
      localStorage.setItem("nexus_beta_access", String(data.user.betaAccess || false));
      localStorage.setItem("nexus_is_test", String(data.user.isTestAccount || false));
      
      if (isRegister) {
        localStorage.removeItem("nexus_onboarding_done");
        if (isWhitelabel) {
          navigate("/onboarding/whitelabel");
        } else {
          navigate("/onboarding");
        }
      } else {
        localStorage.setItem("nexus_onboarding_done", "true");
        if (data.user.role === 'SUPER_ADMIN') {
          navigate("/admin", { replace: true });
        } else if (data.user.orgSlug) {
          navigate(workspacePath("/dashboard", data.user.orgSlug), { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F8F7F7] flex items-center justify-center p-4 font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-100/50 p-8 sm:p-12 border border-white relative overflow-hidden">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4 mb-10">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={brandName} className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-primary/20" />
            ) : (
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                 <Zap size={32} className="text-white fill-current" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{brandLabel}</h1>
              <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-1">
                {customDomain ? "Portal do cliente" : "Agency OS"}
              </p>
            </div>
          </div>

          {!customDomain && (
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-4">
              <button
                onClick={() => { setIsRegister(false); setIsWhitelabel(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${!isRegister ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Login
              </button>
              <button
                onClick={() => { setIsRegister(true); setIsWhitelabel(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${isRegister && !isWhitelabel ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Cadastro
              </button>
              <button
                onClick={() => { setIsRegister(true); setIsWhitelabel(true); }}
                className={`flex items-center justify-center gap-1.5 flex-1 py-2 text-xs font-bold rounded-xl transition-all ${isRegister && isWhitelabel ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Palette size={12} />
                White Label
              </button>
            </div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-medium flex items-center gap-3"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isRegister && !isWhitelabel && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome da Agência</label>
                  <input 
                    type="text"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Nexus360 Master"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {isRegister && isWhitelabel && (
              <AnimatePresence mode="wait">
                <motion.div
                  key="wl-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                    <Palette className="text-blue-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-blue-700">Parceiro White Label — personalize o sistema com sua marca para revender para seus clientes.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome Completo</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Seu nome"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome da Agência</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Ex: Agência Exemplo"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Nome da Marca (white label)</label>
                    <input 
                      type="text"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="Ex: Meu CRM"
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Logo URL (opcional)</label>
                    <input 
                      type="url"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="https://..."
                      value={wlLogoUrl}
                      onChange={e => setWlLogoUrl(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cor Primária</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          className="w-10 h-10 rounded-lg border border-gray-200 bg-transparent cursor-pointer shrink-0"
                          value={wlPrimaryColor}
                          onChange={e => setWlPrimaryColor(e.target.value)}
                        />
                        <input
                          className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 px-3 text-xs font-mono outline-none uppercase"
                          value={wlPrimaryColor}
                          onChange={e => setWlPrimaryColor(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Cor Secundária</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          className="w-10 h-10 rounded-lg border border-gray-200 bg-transparent cursor-pointer shrink-0"
                          value={wlSecondaryColor}
                          onChange={e => setWlSecondaryColor(e.target.value)}
                        />
                        <input
                          className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 px-3 text-xs font-mono outline-none uppercase"
                          value={wlSecondaryColor}
                          onChange={e => setWlSecondaryColor(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">E-mail Profissional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="mt-4 w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? "Processando..." : isRegister && isWhitelabel ? "Criar Agência White Label" : isRegister ? "Criar Minha Agência" : "Entrar no Dashboard"}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
             <p className="text-[10px] text-gray-400">
              {customDomain ? "Ambiente seguro para usuarios autorizados." : "© 2026 Nexus360 Digital. Primeiro usuário = SUPERADMIN."}
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

