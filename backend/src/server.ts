import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma.js";
import { authenticateToken } from "./middleware/auth.js";
import { resolveTenant } from "./middleware/tenant.js";
import { sanitizeStoredHtml } from "./utils/security.js";
import { findTenantDomainStatus, findTenantHostContext, findTenantSlugContext, normalizeRequestHost } from "./utils/tenantHost.js";
import { syncVerifiedTraefikDomains } from "./services/traefikDomainConfig.js";
import { MissionScheduler } from "./services/prospect/MissionScheduler.js";
import { emitAutomationEvent } from "./workers/automationWorker.js";

// Import Rotas
import { authRoutes } from "./routes/auth.js";
import { orgSettingsRoutes } from "./routes/orgSettings.js";
import { crmRoutes } from "./routes/crm.js";
import { marketingRoutes } from "./routes/marketing.js";
import { financeRoutes } from "./routes/finance.js";
import { opsRoutes } from "./routes/ops.js";
import { adminRoutes } from "./routes/admin.js";
import { adminPlansRoutes } from "./routes/admin/plans.js";
import { adsRoutes } from "./routes/ads.js";
import { clientRoutes } from "./routes/clients.js";
import { aiRoutes } from "./routes/ai.js";
import { calendarRoutes } from "./routes/calendar.js";
import { leadCaptureRoutes } from "./routes/leadCapture.js";
import { prospectingFunnelRoutes } from "./routes/prospectingFunnels.js";
import { taskRoutes } from "./routes/tasks.js";
import { creativeRoutes } from "./routes/creatives.js";
import { domainRoutes } from "./routes/domains.js";
import { projectRoutes } from "./routes/projects.js";
import { promptRoutes } from "./routes/prompts.js";
import { salesRoutes } from "./routes/sales.js";
import { systemRoutes } from "./routes/system.js";
import { livekitRoutes } from "./routes/livekit.js";
import { extraRoutes } from "./routes/extras.js";
import { teamRoutes } from "./routes/team.js";
import { accessProfileRoutes } from "./routes/accessProfiles.js";
import { clientPortalRoutes } from "./routes/clientPortal.js";
import { automationRoutes } from "./routes/automation.js";
import { notificationRoutes } from "./routes/notifications.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { acpRoutes } from "./routes/acp.js";
import { agentQueueRoutes } from "./routes/agentQueue.js";
import { serviceCatalogRoutes } from "./routes/serviceCatalog.js";
import { timeTrackingRoutes } from "./routes/timeTracking.js";
import { healthScoreRoutes } from "./routes/healthScore.js";
import { knowledgeBaseRoutes } from "./routes/knowledgeBase.js";
import { billingRoutes } from "./routes/billing.js";
import { snapshotRoutes } from "./routes/snapshots.js";
import { usageRoutes } from "./routes/usage.js";
import { proposalRoutes } from "./routes/proposals.js";
import { privacyRoutes } from "./routes/privacy.js";
import { prospectRoutes } from "./routes/prospect.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { onboardingWhitelabelRoutes } from "./routes/onboardingWhitelabel.js";
import { omnichannelRoutes } from "./routes/omnichannel.js";
import { whatsappRoutes, whatsappInternalRoutes } from "./routes/whatsapp.js";
import { storageRoutes, adminStorageRoutes } from "./routes/storage.js";
import { landingPageRoutes } from "./routes/landingPages.js";

const app = express();

// Necessario para Docker/Portainer atras de proxy reverso.
app.set('trust proxy', 1);

const panelUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://nexus360.consultio.com.br';
const panelOrigin = panelUrl.replace(/\/+$/, '');

let panelHostname = 'nexus360.consultio.com.br';
try { panelHostname = new URL(panelOrigin).hostname; } catch { /* fallback */ }

const configuredOrigins = (process.env.CORS_ORIGINS || panelUrl || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  panelOrigin,
  `https://www.${panelHostname}`,
  'http://localhost:5173',
  'http://localhost:3000',
]);

async function isRegisteredTenantHost(hostname: string) {
  return Boolean(await findTenantHostContext(prisma, hostname));
}

async function enforceTenantDomain(req: any, res: any, next: any) {
  try {
    const tenantDomain = await findTenantHostContext(
      prisma,
      req.headers["x-forwarded-host"] || req.headers.host
    );

    if (!tenantDomain) return next();
    if (req.user?.role === "SUPER_ADMIN") return next();
    if (req.user?.orgId === tenantDomain.organization.id) return next();

    return res.status(403).json({
      error: "DOMAIN_ORG_MISMATCH",
      message: "Este dominio pertence a outra organizacao.",
    });
  } catch (error) {
    next(error);
  }
}

const corsOptions: cors.CorsOptions = {
  origin: async (origin, callback) => {
    if (!origin) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      const normalizedHost = normalizeRequestHost(hostname);
      const isAllowed =
        allowedOrigins.has(origin) ||
        normalizedHost === 'localhost' ||
        await isRegisteredTenantHost(normalizedHost);

      return callback(null, isAllowed);
    } catch {
      return callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id', 'X-Workspace-Id']
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login, tente novamente mais tarde.' }
});

// Middlewares Globais de Segurança e Utilidade
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(globalLimiter);
app.use(express.json({ limit: '5mb' }));
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ==================== ROTAS PÚBLICAS ====================

app.get("/api/health", async (req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Backend Nexus360 Online' });
  } catch (error) {
    next(error);
  }
});

app.get("/api/ping", (req, res) => res.json({ message: "pong", timestamp: new Date().toISOString() }));

app.get("/api/domain/context", async (req, res, next) => {
  try {
    const host = normalizeRequestHost(req.headers["x-forwarded-host"] as string || req.headers.host);
    const slugContext = await findTenantSlugContext(prisma, req.query.slug);

    if (slugContext) {
      return res.json({
        customDomain: false,
        domain: null,
        status: slugContext.status,
        internalUrl: slugContext.internalUrl,
        organization: slugContext.organization,
      });
    }

    if (!host) return res.json({ customDomain: false });

    const tenantDomain = await findTenantHostContext(prisma, host);

    if (tenantDomain) {
      return res.json({
        customDomain: tenantDomain.kind === "custom-domain",
        domain: tenantDomain.domain,
        status: tenantDomain.status,
        internalUrl: tenantDomain.internalUrl,
        organization: tenantDomain.organization,
      });
    }

    const domainStatus = await findTenantDomainStatus(prisma, host);

    res.json({
      customDomain: false,
      domain: domainStatus?.name || null,
      status: domainStatus?.status || null,
      organization: null,
    });
  } catch (error) {
    next(error);
  }
});

// Rota PÚBLICA para Landing Pages
function renderSectionsToHtml(sections: any[], theme: any, pageSlug: string = ""): string {
  const t = theme || {};
  const primary = t.primaryColor || "#3B82F6";
  const secondary = t.secondaryColor || "#1E40AF";
  const fontFamily = t.fontFamily || "'Inter', system-ui, sans-serif";

  let html = `<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:${fontFamily}; color:#1e293b; line-height:1.6; -webkit-font-smoothing:antialiased; }
    .container { max-width:1120px; margin:0 auto; padding:0 24px; }
    .section { padding:80px 0; }
    .section:nth-child(even) { background:#f8fafc; }
    h1 { font-size:clamp(2rem,5vw,3.5rem); font-weight:800; line-height:1.15; }
    h2 { font-size:clamp(1.5rem,3vw,2.25rem); font-weight:700; line-height:1.25; margin-bottom:16px; }
    h3 { font-size:1.25rem; font-weight:600; }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:16px 32px; border-radius:12px; font-weight:700; font-size:1rem; text-decoration:none; transition:all .2s; cursor:pointer; border:none; }
    .btn-primary { background:${primary}; color:#fff; }
    .btn-primary:hover { opacity:.9; transform:translateY(-1px); }
    .text-center { text-align:center; }
    .grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:32px; }
    .card { background:#fff; border-radius:16px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,.06); border:1px solid #f1f5f9; }
    .card:hover { box-shadow:0 4px 12px rgba(0,0,0,.08); }
    .icon-wrap { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; font-size:24px; }
    .testimonial { font-style:italic; font-size:1.05rem; color:#475569; position:relative; padding:24px; background:#fff; border-radius:16px; border:1px solid #f1f5f9; }
    .faq-item { border-bottom:1px solid #e2e8f0; padding:20px 0; }
    .faq-question { font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
    .faq-answer { margin-top:12px; color:#64748b; }
    .step-num { width:40px; height:40px; border-radius:50%; background:${primary}15; color:${primary}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0; }
    .form-input { width:100%; padding:14px 16px; border:1px solid #e2e8f0; border-radius:12px; font-size:1rem; outline:none; transition:border-color .2s; }
    .form-input:focus { border-color:${primary}; box-shadow:0 0 0 3px ${primary}20; }
    .hero-section { padding:120px 0 80px; background:linear-gradient(135deg, ${primary}08, ${secondary}08); }
    @media(max-width:768px) { .section { padding:48px 0; } .hero-section { padding:80px 0 48px; } }
  </style>`;

  for (const section of sections || []) {
    if (section.props?.visible === false) continue;
    const p = section.props || {};

    switch (section.type) {
      case "HeroBlock":
        html += `<div class="hero-section"><div class="container text-center">
          <h1>${p.headline || ""}</h1>
          ${p.subheadline ? `<p style="font-size:1.25rem;color:#64748b;margin-top:16px;max-width:640px;margin-inline:auto">${p.subheadline}</p>` : ""}
          ${p.ctaText ? `<div style="margin-top:32px"><a class="btn btn-primary" href="${p.ctaUrl || "#form"}">${p.ctaText}</a></div>` : ""}
          ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" style="margin-top:48px;max-width:100%;border-radius:16px;box-shadow:0 20px 40px rgba(0,0,0,.1)" />` : ""}
        </div></div>`;
        break;

      case "ProblemBlock":
        html += `<div class="section"><div class="container text-center" style="max-width:720px;margin-inline:auto">
          <h2>${p.title || ""}</h2>
          <p style="font-size:1.125rem;color:#64748b">${p.description || ""}</p>
        </div></div>`;
        break;

      case "SolutionBlock":
        html += `<div class="section"><div class="container text-center" style="max-width:720px;margin-inline:auto">
          <h2>${p.title || ""}</h2>
          <p style="font-size:1.125rem;color:#64748b">${p.description || ""}</p>
        </div></div>`;
        break;

      case "BenefitsBlock":
        html += `<div class="section"><div class="container">
          <h2 class="text-center">${p.title || "Benefícios"}</h2>
          <div class="grid-3" style="margin-top:40px">${(p.items || []).map((item: any) => `
            <div class="card">
              <div class="icon-wrap" style="background:${primary}15;color:${primary}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
              <h3>${item.title || ""}</h3>
              <p style="color:#64748b;margin-top:8px;font-size:.95rem">${item.description || ""}</p>
            </div>`).join("")}
          </div>
        </div></div>`;
        break;

      case "HowItWorksBlock":
        html += `<div class="section"><div class="container">
          <h2 class="text-center">${p.title || "Como funciona"}</h2>
          <div style="margin-top:48px;display:flex;flex-direction:column;gap:24px;max-width:640px;margin-inline:auto">${(p.steps || []).map((step: any, i: number) => `
            <div style="display:flex;gap:16px;align-items:flex-start">
              <div class="step-num">${step.step || (i + 1)}</div>
              <div><h3>${step.title || ""}</h3><p style="color:#64748b;margin-top:4px">${step.description || ""}</p></div>
            </div>`).join("")}
          </div>
        </div></div>`;
        break;

      case "SocialProofBlock":
        html += `<div class="section"><div class="container">
          <h2 class="text-center">${p.title || "Quem já confia"}</h2>
          <div class="grid-3" style="margin-top:40px">${(p.testimonials || []).map((t: any) => `
            <div class="testimonial">
              <p>"${t.text || ""}"</p>
              <div style="margin-top:16px;display:flex;align-items:center;gap:12px;border-top:1px solid #f1f5f9;padding-top:16px">
                ${t.photoUrl ? `<img src="${t.photoUrl}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />` : ""}
                <div><strong>${t.name || ""}</strong>${t.role ? `<span style="color:#94a3b8;font-size:.875rem;display:block">${t.role}</span>` : ""}</div>
              </div>
            </div>`).join("")}
          </div>
        </div></div>`;
        break;

      case "FAQBlock":
        html += `<div class="section"><div class="container" style="max-width:720px;margin-inline:auto">
          <h2 class="text-center">${p.title || "Perguntas frequentes"}</h2>
          <div style="margin-top:32px">${(p.items || []).map((item: any) => `
            <div class="faq-item">
              <div class="faq-question">${item.question || ""} <span style="font-size:1.25rem;color:#94a3b8">+</span></div>
              <div class="faq-answer">${item.answer || ""}</div>
            </div>`).join("")}
          </div>
        </div></div>`;
        break;

      case "CTABlock":
        html += `<div class="section" style="background:linear-gradient(135deg,${primary},${secondary});color:#fff">
          <div class="container text-center">
            <h2 style="color:#fff">${p.headline || ""}</h2>
            ${p.subheadline ? `<p style="font-size:1.125rem;opacity:.9;margin-top:12px">${p.subheadline}</p>` : ""}
            ${p.ctaText ? `<div style="margin-top:32px"><a class="btn" style="background:#fff;color:${primary}" href="${p.ctaUrl || "#form"}">${p.ctaText}</a></div>` : ""}
          </div>
        </div>`;
        break;

      case "FormBlock":
        html += `<div id="form" class="section"><div class="container" style="max-width:560px;margin-inline:auto">
          <h2 class="text-center">${p.title || "Solicite um contato"}</h2>
          ${p.description ? `<p class="text-center" style="color:#64748b;margin-bottom:32px">${p.description}</p>` : ""}
          <form id="lp-form-${pageSlug}" style="display:flex;flex-direction:column;gap:16px">
            ${(p.fields || ["nome", "telefone", "email", "mensagem"]).map((f: string) => {
              const labelMap: Record<string, string> = { nome:"Nome", telefone:"Telefone", email:"E-mail", mensagem:"Mensagem", empresa:"Empresa" };
              const typeMap: Record<string, string> = { email:"email", telefone:"tel" };
              const isTextarea = f === "mensagem";
              const placeholder = labelMap[f] || f;
              const inputName = f;
              if (isTextarea) {
                return `<textarea class="form-input" name="${inputName}" placeholder="${placeholder}" style="min-height:100px;resize:vertical"></textarea>`;
              }
              return `<input class="form-input" type="${typeMap[f] || "text"}" name="${inputName}" placeholder="${placeholder}" required="${f === "email" || f === "nome" ? "required" : ""}" />`;
            }).join("")}
            <input type="hidden" name="utmSource" />
            <input type="hidden" name="utmMedium" />
            <input type="hidden" name="utmCampaign" />
            <button type="submit" class="btn btn-primary" style="justify-content:center;font-size:1.1rem;padding:18px 32px">${p.buttonText || "Enviar"}</button>
          </form>
          <div id="lp-form-success" style="display:none;text-align:center;padding:40px;background:#f0fdf4;border-radius:16px;margin-top:24px">
            <h3 style="color:#16a34a">Obrigado! Recebemos seu contato.</h3>
            <p style="color:#64748b;margin-top:8px">Entraremos em contato em breve.</p>
          </div>
        </div></div>`;
        break;
    }
  }

  return html;
}

app.get("/lp/:slug", async (req, res, next) => {
  try {
    const page = await prisma.landingPage.findUnique({ where: { slug: req.params.slug } });

    if (!page || (page.status !== "published" && !page.content)) {
      return res.status(404).send(`<!DOCTYPE html><html><head><title>Página não encontrada</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b}h1{font-size:2rem}</style></head><body><h1>Página não encontrada</h1></body></html>`);
    }

    await prisma.landingPage.update({ where: { id: page.id }, data: { views: { increment: 1 } } });

    const theme = page.theme as any || {};
    const primary = theme.primaryColor || "#3B82F6";
    const secondary = theme.secondaryColor || "#1E40AF";
    const fontFamily = theme.fontFamily || "'Inter', system-ui, sans-serif";

    const sections = page.sections as any[] || [];
    const pageContent = sections.length > 0
      ? renderSectionsToHtml(sections, theme, page.slug)
      : (page.content || "");

    const tracking = page.tracking as any || {};
    const gaId = tracking?.gaId || "";
    const pixelId = tracking?.pixelId || "";
    const apiUrl = `${req.protocol}://${req.get("host")}`;

    const gaScript = gaId ? `
      <script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js',new Date());
        gtag('config','${gaId}');
      </script>` : "";

    const pixelScript = pixelId ? `
      <script>
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${pixelId}');
        fbq('track','PageView');
      </script>` : "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${page.metaTitle || page.name}</title>
  <meta name="description" content="${page.metaDescription || ""}" />
  <meta property="og:title" content="${page.metaTitle || page.name}" />
  <meta property="og:description" content="${page.metaDescription || ""}" />
  ${page.metaImage ? `<meta property="og:image" content="${page.metaImage}" />` : ""}
  <meta property="og:type" content="website" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"WebPage","name":"${page.metaTitle || page.name}","description":"${page.metaDescription || ""}"}
  </script>
  ${gaScript}
  ${pixelScript}
  <style>
    .faq-answer { display:none; }
    .faq-item.open .faq-answer { display:block; }
    .faq-item.open .faq-question span { transform:rotate(45deg); display:inline-block; }
  </style>
</head>
<body>
  ${pageContent}
  <script>
    // FAQ toggle
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => q.parentElement.classList.toggle('open'));
    });

    // Form submission
    const form = document.getElementById('lp-form-${page.slug}');
    if (form) {
      // Capture UTM params
      const params = new URLSearchParams(window.location.search);
      form.querySelectorAll('input[name^="utm"]').forEach(input => {
        input.value = params.get(input.name) || '';
      });

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const body = Object.fromEntries(data.entries());

        try {
          const res = await fetch('${apiUrl}/api/landing-pages/${page.slug}/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            form.style.display = 'none';
            document.getElementById('lp-form-success').style.display = 'block';
            ${tracking?.gaId ? `gtag('event','conversion',{'send_to':'${gaId}','event_category':'lead','event_label':'${page.slug}'});` : ""}
            ${tracking?.pixelId ? `fbq('track','Lead');` : ""}
          }
        } catch(err) {
          console.error('Form error:', err);
        }
      });
    }
  </script>
</body>
</html>`;

    const csp = `default-src 'self' https: data:; script-src 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src https: data:; connect-src 'self' https:`;
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  } catch (error) {
    next(error);
  }
});

// Propostas Públicas
app.get("/api/public/proposals/:slug", async (req, res, next) => {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { slug: req.params.slug },
      include: { 
        organization: { select: { name: true } },
        client: { select: { corporateName: true, tradeName: true } }
      }
    });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });
    res.json(proposal);
  } catch (error) {
    next(error);
  }
});

app.post("/api/public/proposals/:slug/accept", async (req, res, next) => {
  const { cnpj, corporateName, phone, email } = req.body;
  try {
    const proposal = await prisma.proposal.findUnique({ where: { slug: req.params.slug } });
    if (!proposal) return res.status(404).json({ error: "Proposta não encontrada" });

    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: 'accepted' } });
    emitAutomationEvent("proposal.accepted", { organizationId: proposal.organizationId, proposalId: proposal.id });

    if (proposal.leadId) {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: proposal.leadId! }, data: { status: 'fechado' } });
        await tx.client.create({
          data: {
            corporateName: corporateName || "Cliente via Proposta",
            cnpj, email: email || "", phone: phone || "",
            organizationId: proposal.organizationId, status: 'onboarding'
          }
        });
      });
    }
    res.json({ success: true, message: "Proposta aceita com sucesso!" });
  } catch (error) {
    next(error);
  }
});

// ==================== ROTAS DE AUTH (Público + Refresh) ====================
app.use("/api/auth", authLimiter, authRoutes(prisma));

// ==================== ROTAS PROTEGIDAS (Tenant Isolated) ====================
const protectedRoutes = [
  { path: "/api/admin", router: adminRoutes },
  { path: "/api/org", router: orgSettingsRoutes },
  { path: "/api/clients", router: clientRoutes },
  { path: "/api/ai", router: aiRoutes },
  { path: "/api/crm", router: crmRoutes },
  { path: "/api/marketing", router: marketingRoutes },
  { path: "/api/finance", router: financeRoutes },
  { path: "/api/ops", router: opsRoutes },
  { path: "/api/ads", router: adsRoutes },
  { path: "/api/calendar", router: calendarRoutes },
  { path: "/api/lead-capture", router: leadCaptureRoutes },
  { path: "/api/prospecting-funnels", router: prospectingFunnelRoutes },
  { path: "/api/tasks", router: taskRoutes },
  { path: "/api/creatives", router: creativeRoutes },
  { path: "/api/domains", router: domainRoutes },
  { path: "/api/projects", router: projectRoutes },
  { path: "/api/prompts", router: promptRoutes },
  { path: "/api/sales", router: salesRoutes },
  { path: "/api/system", router: systemRoutes },
  { path: "/api/extras", router: extraRoutes },
  { path: "/api/team", router: teamRoutes },
  { path: "/api/access-profiles", router: accessProfileRoutes },
  { path: "/api/automation", router: automationRoutes },
  { path: "/api/notifications", router: notificationRoutes },
  { path: "/api/delivery", router: deliveryRoutes },
  { path: "/api/service-catalog", router: serviceCatalogRoutes },
  { path: "/api/time-tracking", router: timeTrackingRoutes },
  { path: "/api/health-score", router: healthScoreRoutes },
  { path: "/api/knowledge-base", router: knowledgeBaseRoutes },
  { path: "/api/snapshots", router: snapshotRoutes },
  { path: "/api/usage", router: usageRoutes },
  { path: "/api/proposals", router: proposalRoutes },
  { path: "/api/privacy", router: privacyRoutes },
  { path: "/api/nexus-prospect", router: prospectRoutes },
  { path: "/api/onboarding", router: onboardingRoutes },
  { path: "/api/onboarding/whitelabel", router: onboardingWhitelabelRoutes },
  { path: "/api/omnichannel", router: omnichannelRoutes },
  { path: "/api/whatsapp", router: whatsappRoutes },
  { path: "/api/acp", router: acpRoutes },
  { path: "/api/agent-queue", router: agentQueueRoutes },
  { path: "/api/storage", router: storageRoutes },
  { path: "/api/landing-pages", router: landingPageRoutes },
  { path: "/api/admin/storage", router: adminStorageRoutes },
];

// Rotas Administrativas de Planos
app.use("/api/admin/plans", authenticateToken, adminPlansRoutes(prisma));

protectedRoutes.forEach(route => {
  app.use(route.path, authenticateToken, enforceTenantDomain, resolveTenant, route.router(prisma));
});

// Rotas Externas / Portais
app.use("/api/billing", billingRoutes(prisma));
app.use("/api/livekit", livekitRoutes(prisma));
app.use("/api/client-portal", clientPortalRoutes(prisma));
app.use("/api/internal/whatsapp", whatsappInternalRoutes(prisma));

// ==================== DASHBOARD E FALLBACKS ====================

async function safeDashboardValue<T>(label: string, fallback: T, loader: () => Promise<T>): Promise<T> {
  try {
    return await loader();
  } catch (error: any) {
    console.error(`[DASHBOARD_METRIC_ERROR] ${label}:`, error?.message || error);
    return fallback;
  }
}

app.get("/api/dashboard", authenticateToken, enforceTenantDomain, resolveTenant, async (req: any, res, next) => {
  try {
    const orgId = req.user.orgId;
    const [leads, clients, proposals, invoices, contentCount, org, user, agency] = await Promise.all([
      safeDashboardValue("leads", 0, () => prisma.lead.count({ where: { organizationId: orgId } })),
      safeDashboardValue("clients", 0, () => prisma.client.count({ where: { organizationId: orgId } })),
      safeDashboardValue("proposals", 0, () => prisma.proposal.count({ where: { organizationId: orgId } })),
      safeDashboardValue("invoices", { _sum: { total: 0 } }, () => prisma.invoice.aggregate({ where: { organizationId: orgId, status: 'paga' }, _sum: { total: true } })),
      safeDashboardValue("creatives", 0, () => prisma.creative.count({ where: { organizationId: orgId } })),
      safeDashboardValue("organization", null, () => orgId ? prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, plan: true, planObj: true } }) : Promise.resolve(null)),
      safeDashboardValue("user", null, () => prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } })),
      safeDashboardValue("agency", null, () => req.user.agencyId ? prisma.agency.findUnique({ where: { id: req.user.agencyId }, select: { name: true } }) : Promise.resolve(null)),
    ]);

    const conversions = leads > 0 ? Number(((clients / leads) * 100).toFixed(1)) : 0;
    const legacyPlan = !org?.planObj && org?.plan
      ? await safeDashboardValue("legacy plan", null, () => prisma.plan.findFirst({ where: { name: org.plan } }))
      : null;
    const sourcePlan = org?.planObj || legacyPlan || { name: 'Free', maxLeads: 100 };
    const plan = {
      ...sourcePlan,
      maxLeads: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
      leadsLimit: (sourcePlan as any).maxLeads ?? (sourcePlan as any).leadsLimit ?? 100,
    };

    res.json({
      orgName: org?.name || agency?.name || "Minha Agência",
      userName: user?.name || "Usuário",
      plan,
      usage: { leads },
      metrics: { leads, clients, proposals, conversions, revenue: invoices._sum.total || 0, contentCount },
      chartData: [] 
    });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found', path: req.originalUrl });
});

// Global Error Handler
import { errorHandler } from "./middleware/errorHandler.js";
app.use(errorHandler);

const PORT = process.env.PORT || 10000;

// Inicialização dos Serviços em Background (Agentes)
const missionScheduler = new MissionScheduler(prisma);
missionScheduler.start();

// Workers de Automação e Follow-up
import { AutomationWorker } from "./workers/automationWorker.js";
import { FollowUpWorker } from "./workers/followUpWorker.js";
const automationWorker = new AutomationWorker(prisma);
automationWorker.start();
const followUpWorker = new FollowUpWorker(prisma);
followUpWorker.start();

// Socket.io para eventos em tempo real
import { createServer } from "http";
import { initSocketManager } from "./services/socketManager.js";
const httpServer = createServer(app);
initSocketManager(httpServer);

syncVerifiedTraefikDomains(prisma)
  .then(result => {
    if (result.enabled) {
      console.log(`[TRAEFIK_SYNC] dominios=${result.total} escritos=${result.written} falhas=${result.failed}`);
    }
  })
  .catch(error => {
    console.error("[TRAEFIK_SYNC_ERROR]", error?.message || error);
  });

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Nexus360 Core rodando na porta ${PORT}`);
  console.log(`👉 API: http://localhost:${PORT}/api`);
});
